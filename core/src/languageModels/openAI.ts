import OpenAI from "openai";
import { ChatMessage, ExecutorResponse, FunctionSpecification, LanguageModelProgramExecutor, LanguageModelProgramExecutorExecuteOptions } from ".";
import { ChatCompletionCreateParams, ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources";
import { RequestOptions } from "openai/core";
import { trace } from "@opentelemetry/api";
import { RunnableFunctionWithParse, RunnableTools } from "openai/lib/RunnableFunction";
import { zodToJsonSchema } from 'zod-to-json-schema';
import { backOff } from "exponential-backoff";
import { ChatCompletionToolRunnerParams } from "openai/lib/ChatCompletionRunner";
import { withErrorCatchingSpan } from "./errorCatchingSpan";
import { OpenAICompatibleStream } from "./LLMStream";

type Config = ConstructorParameters<typeof OpenAI>[0];
type ChatCompletionParams =
  Partial<ChatCompletionCreateParams>

type DefaultCompletionParams = ChatCompletionParams & {
  model: ChatCompletionCreateParams["model"];
};

const tracer = trace.getTracer(
  'open-souls-openai',
  '0.0.1',
);

// eslint-disable-next-line @typescript-eslint/no-empty-function
const emptyFunction = () => { }

export class OpenAILanguageProgramProcessor implements LanguageModelProgramExecutor {
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
      model: "gpt-3.5-turbo",
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
    return withErrorCatchingSpan(tracer, "execute", async (span) => {
      const { functionCall, ...completionParamsWithoutFunctionCall } = completionParams;

      const params: ChatCompletionCreateParams = {
        ...this.defaultCompletionParams,
        ...completionParamsWithoutFunctionCall,
        messages: messages as ChatCompletionMessageParam[],
      }

      span.setAttributes({
        "params": JSON.stringify(params),
        "request-options": JSON.stringify(requestOptions || {}),
      });

      if (requestOptions.stream) {
        if (functionCall) {
          return this.executeStreaming({
            ...params,
            tool_choice: {
              type: "function",
              function: functionCall as { name: string }
            },
          }, requestOptions, functions)
        }
        return this.executeStreaming(params, requestOptions, functions)
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
    functions: FunctionSpecification[] = [],
  ): Promise<{
    response: Promise<ExecutorResponse<any>>,
    stream: AsyncIterable<string>,
  }> {
    return tracer.startActiveSpan("executeStreaming", async (span) => {
      try {
        const tools = functions.length > 0 ? this.mapFunctionCallsToTools(functions, emptyFunction) as unknown as ChatCompletionTool[] : undefined

        const params = {
          ...completionParams,
          ...(tools ? { tools } : {})
        }
  
        const rawStream = await this.client.chat.completions.create(
          { ...params, stream: true },
          {
            ...this.defaultRequestOptions,
            ...requestOptions,
          }
        )

        const stream = new OpenAICompatibleStream(rawStream)
  
        const streamToText = async function* () {
          for await (const res of stream.stream()) {
            yield res.choices[0].delta.content || res.choices[0].delta.tool_calls?.[0]?.function?.arguments || ""
          }
        }
  
        const responseFn = async () => {
          const content = (await stream.finalContent()) || ""
          const functionCall = await (stream.finalFunctionCall())
          let parsed: any = undefined
  
          if (functionCall) {
            const fn = functions.find((f) => f.name === functionCall.name)
            parsed = fn?.parameters.parse(JSON.parse(functionCall.arguments))
          }
    
          span.setAttributes({
            "completion-content": content,
            "completion-function-call": JSON.stringify(functionCall || "{}"),
            "completion-parsed": JSON.stringify(parsed || "{}"),
          })

          span.end()
  
          return {
            content,
            functionCall: parsed ? { name: functionCall?.name || "", arguments: parsed } : { name: "", arguments: "" },
            parsedArguments: parsed ? parsed : content,
          };
        }
  
        return {
          response: responseFn(),
          stream: streamToText(),
        }
      } catch (err: any) {
        span.recordException(err);
        console.error("error in open ai call", err)
        span.end()
        throw err
      }
    })
  }

  private async executeWithFunctionCall(
    completionParams: ChatCompletionCreateParams,
    requestOptions: RequestOptions,
    functionCall: { name: string },
    functions: FunctionSpecification[] = [],
  ): Promise<any> {
    return withErrorCatchingSpan(tracer, "executeWithFunctionCall", async (span) => {
      let parsed: any

      const handler = (fnCall: any) => {
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

      const { content, usage } = await backOff(async () => {
        const runner = this.client.beta.chat.completions.runTools(
          { ...paramsWithFunctions },
          {
            ...this.defaultRequestOptions,
            ...requestOptions,
          }
        )
        runner.on("error", (error) => console.error("runner error", error))
        return {
          content: await runner.finalContent(),
          usage: await runner.totalUsage(),
        }
      }, {
        maxDelay: 200,
        numOfAttempts: 3,
        retry: (e, attempt) => {
          console.error("error in open ai call", e, attempt)
          return true
        }
      })

      span.setAttributes({
        "total-tokens": usage.total_tokens || "?",
        "prompt-tokens": usage.prompt_tokens || "?",
        "completion-tokens": usage.completion_tokens || "?",
        "completion-content": "",
        "completion-function-call": JSON.stringify(content),
        "completion-parsed": JSON.stringify(parsed),
      })

      return {
        content: "",
        functionCall: content,
        parsedArguments: parsed
      };
    })
  }

  private async nonFunctionExecute(
    completionParams: ChatCompletionCreateParams,
    requestOptions: RequestOptions,
  ): Promise<any> {
    return withErrorCatchingSpan(tracer, "nonFunctionExecute", async (span) => {
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
