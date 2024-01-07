import OpenAI from "openai";
import { ChatMessage, ExecutorResponse, FunctionCall, FunctionSpecification, LanguageModelProgramExecutor } from ".";
import { ChatCompletionCreateParams, ChatCompletionMessageParam, ChatCompletionTool, CompletionCreateParams, Models } from "openai/resources";
import { RequestOptions } from "openai/core";
import { trace } from "@opentelemetry/api";
import { RunnableFunctionWithParse, RunnableTools } from "openai/lib/RunnableFunction";
import { zodToJsonSchema } from 'zod-to-json-schema';
import { LanguageModelProgramExecutorExecuteOptions } from "../legacy";
import { backOff } from "exponential-backoff";
import { ChatCompletionToolRunnerParams } from "openai/lib/ChatCompletionRunner";

type Config = ConstructorParameters<typeof OpenAI>[0];
type ChatCompletionParams =
  Partial<ChatCompletionCreateParams>

type DefaultCompletionParams = ChatCompletionParams & {
  model: ChatCompletionParams["model"] | string;
};

const tracer = trace.getTracer(
  'open-souls-openai',
  '0.0.1',
);

export class OpenAi2 implements LanguageModelProgramExecutor {
  client: OpenAI;
  defaultCompletionParams: DefaultCompletionParams
  defaultRequestOptions: RequestOptions

  constructor(
    openAIConfig: Config = {},
    defaultCompletionParams: ChatCompletionParams = {},
    defaultRequestOptions: RequestOptions = {}
  ) {
    const defaultConfig = {
      dangerouslyAllowBrowser: !!process.env.DANGEROUSLY_ALLOW_OPENAI_BROWSER
    }
    this.client = new OpenAI({
      ...defaultConfig,
      ...openAIConfig,
    });
    this.defaultCompletionParams = {
      model: "gpt-3.5-turbo-1106",
      ...defaultCompletionParams,
      stream: false,
    };
    this.defaultRequestOptions = {
      timeout: 10_000,
      ...defaultRequestOptions
    }
  }

  async execute(
    messages: ChatMessage[],
    completionParams: LanguageModelProgramExecutorExecuteOptions = {},
    functions: FunctionSpecification[] = [],
    requestOptions: RequestOptions = {},
  ): Promise<any> {
    return tracer.startActiveSpan('execute', async (span) => {

      const { functionCall, ...completionParamsWithoutFunctionCall } = completionParams;

      const params: ChatCompletionCreateParams = {
        ...this.defaultCompletionParams,
        ...completionParamsWithoutFunctionCall,
        model: "gpt-3.5-turbo-1106",
        messages: messages as ChatCompletionMessageParam[],
      }

      if (requestOptions.stream) {
        return this.executeStreaming(params, requestOptions, (functionCall as any), functions)
      }

      if (functionCall) {
        return this.executeWithFunctionCall(params, requestOptions, (functionCall as any), functions)
      }

      return this.nonFunctionExecute(params, requestOptions)
    })
  }

  private async executeStreaming(
    completionParams: ChatCompletionCreateParams,
    requestOptions: RequestOptions,
    functionCall: { name: string },
    functions: FunctionSpecification[] = [],
  ): Promise<{
    response: Promise<ExecutorResponse<any>>,
    stream: AsyncIterable<string>,
  }> {

    const tools = functions.length > 0 ? this.mapFunctionCallsToTools(functions, () => { }) : undefined

    const params = { ...completionParams, stream: true, tools  }
  
    const stream = this.client.beta.chat.completions.stream(
      params,
      {
        ...this.defaultRequestOptions,
        ...requestOptions,
      }
    )

    const streamToText = async function* () {
      for await (const res of stream) {
        yield res.choices[0].delta.content || res.choices[0].delta.tool_calls?.[0]?.function?.arguments || ""
      }
    }

    const responseFn = async () => {
      const content = (await stream.finalContent()) || ""
      return {
        content,
        functionCall: {
          name: "hi",
          arguments: "asdf"
        },
        parsedArguments: content,
      };
    }

    return {
      response: responseFn(),
      stream: streamToText(),
    }
  }

  private async executeWithFunctionCall(
    completionParams: ChatCompletionCreateParams,
    requestOptions: RequestOptions,
    functionCall: { name: string },
    functions: FunctionSpecification[] = [],
  ): Promise<any> {
    return tracer.startActiveSpan('executeWithFunctionCall', async (span) => {

      let parsed: any

      const handler = (fnCall:any) => {
        parsed = fnCall
      }

      const paramsWithFunctions: ChatCompletionToolRunnerParams<any> = {
        ...completionParams,
        tool_choice: {
          type: "function",
          function: functionCall
        },
        tools: this.mapFunctionCallsToTools(functions, handler),
        stream: false,
      }

      if (!paramsWithFunctions.model) {
        throw new Error("missing model")
      }

      const functionCallResponse = await backOff(async () => {
        const runner = this.client.beta.chat.completions.runTools(
          { ...paramsWithFunctions },
          {
            ...this.defaultRequestOptions,
            ...requestOptions,
          }
        )
        runner.on("error", (error) => console.error("runner error", error))
        return runner.finalContent();

      }, {
        maxDelay: 200,
        numOfAttempts: 3,
        retry: (e, attempt) => {
          console.error("error in open ai call", e, attempt)
          return true
        }
      })

      return {
        content: "",
        functionCall: functionCallResponse,
        parsedArguments: parsed
      };
    })
  }

  private async nonFunctionExecute(
    completionParams: ChatCompletionCreateParams,
    requestOptions: RequestOptions,
  ): Promise<any> {
    return tracer.startActiveSpan('executeNonFunctionExecute', async (span) => {
      const res = await backOff(() => {
        return this.client.chat.completions.create(
          { ...completionParams, stream: false },
          {
            ...this.defaultRequestOptions,
            ...requestOptions,
          }
        )
      }, {
        maxDelay: 200,
        numOfAttempts: 3,
        retry: (e, attempt) => {
          console.error("error in open ai call", e, attempt)
          return true
        }
      })

      span.setAttributes({
        "total-tokens": res.usage?.total_tokens || "?",
        "prompt-tokens": res.usage?.prompt_tokens || "?",
        "completion-tokens": res.usage?.completion_tokens || "?",
        "completion-content": res?.choices[0]?.message?.content || "?",
        "completion-function-call": JSON.stringify(res?.choices[0]?.message?.function_call || "{}"),
      })

      const content = res?.choices[0]?.message?.content
      const functionCallResponse = res?.choices[0]?.message?.function_call
      return {
        content,
        functionCall: functionCallResponse,
        parsedArguments: content
      };
    })
  }

  private mapFunctionCallsToTools(functions: FunctionSpecification[], argCapture: (...args: any) => void): RunnableTools<any> {
    return functions.map((functionSpec): { type: 'function', function: RunnableFunctionWithParse<any> } => {
      return {
        type: 'function',
        function: {
          name: functionSpec.name || "function_to_call",
          function: argCapture,
          description: functionSpec.description || "A function",
          parse: (resp: string) => {
            return functionSpec.parameters.parse(JSON.parse(resp))
          },
          parameters: zodToJsonSchema(functionSpec.parameters) as any, // TODO: why?!
        },
      }
    })
  }

}
