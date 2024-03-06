import OpenAI from "openai";
import { ChatMessage, ChatMessageRoleEnum, ExecutorResponse, FunctionSpecification, LanguageModelProgramExecutor, LanguageModelProgramExecutorExecuteOptions } from ".";
import { ChatCompletionCreateParams, ChatCompletionMessageParam } from "openai/resources";
import { RequestOptions } from "openai/core";
import { trace } from "@opentelemetry/api";
import { backOff } from "exponential-backoff";
import { OpenAICompatibleStream } from "./LLMStream";
import { FunctionToContentConverter } from "./FunctionToContentConverter";
import { withErrorCatchingSpan } from "./errorCatchingSpan";
import { html } from "common-tags";

type Config = ConstructorParameters<typeof OpenAI>[0] & { singleSystemMessage?: boolean, forcedRoleAlternation?: boolean };
type ChatCompletionParams =
  Partial<ChatCompletionCreateParams>

type DefaultCompletionParams = ChatCompletionParams & {
  model: ChatCompletionCreateParams["model"] | string;
};

const tracer = trace.getTracer(
  'open-souls-functionlessllm2',
  '0.0.1',
);

function* fakeStream(str: string) {
  yield str
}

export class FunctionlessLLM implements LanguageModelProgramExecutor {
  client: OpenAI;
  defaultCompletionParams: DefaultCompletionParams
  defaultRequestOptions: RequestOptions
  singleSystemMessage: boolean
  forcedRoleAlternation: boolean

  constructor(
    executorConfig: Config = {},
    defaultCompletionParams: ChatCompletionParams = {},
    defaultRequestOptions: RequestOptions = {}
  ) {
    const defaultConfig = {
      dangerouslyAllowBrowser: !!process.env.DANGEROUSLY_ALLOW_OPENAI_BROWSER
    }

    const { singleSystemMessage, forcedRoleAlternation, ...openAIConfig } = executorConfig
    this.singleSystemMessage = !!singleSystemMessage
    this.forcedRoleAlternation = !!forcedRoleAlternation

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
    return withErrorCatchingSpan(tracer, "execute", async (span) => {
      const { functionCall, ...completionParamsWithoutFunctionCall } = completionParams;

      const params: ChatCompletionCreateParams = {
        ...this.defaultCompletionParams,
        ...completionParamsWithoutFunctionCall,
        messages: this.possiblyFixMessageRoles(messages) as ChatCompletionMessageParam[],
      }

      span.setAttributes({
        "params": JSON.stringify(params),
        "request-options": JSON.stringify(requestOptions || {}),
      });

      if (requestOptions.stream) {
        // for now, if it's a function call we won't *actually* stream, but we'll provide
        // the same facade.
        if ((functionCall as any)?.name) {
          const fnExecutor = new FunctionToContentConverter(this)
          const resp = await fnExecutor.executeWithFunctionCall(messages as ChatMessage[], completionParams, functions, requestOptions)

          return {
            response: Promise.resolve(resp),
            stream: fakeStream(resp.functionCall.arguments)
          }

        }

        return this.executeStreaming(params, requestOptions, functions)
      }

      if (functionCall) {
        const fnExecutor = new FunctionToContentConverter(this)
        return fnExecutor.executeWithFunctionCall(messages, completionParams, functions, requestOptions)
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
    return tracer.startActiveSpan('executeStreaming', async (span) => {
      try {
        const rawStream = await this.client.chat.completions.create(
          { ...completionParams, stream: true },
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
        console.error("error in executeStreaming", err)
        span.recordException(err)
        span.end()
        throw err
      }
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

  /**
   * swaps all but the first system message to user messages for OSS models that only support a single system message.
   */
  private possiblyFixMessageRoles(messages: (ChatMessage | ChatCompletionMessageParam)[]): ChatCompletionMessageParam[] {
    if (!this.singleSystemMessage && !this.forcedRoleAlternation) {
      return messages as ChatCompletionMessageParam[]
    }

    let newMessages = messages

    if (this.singleSystemMessage) {
      let firstSystemMessage = true
      newMessages = messages.map((originalMessage) => {
        const message = { ...originalMessage }
        if (message.role === ChatMessageRoleEnum.System) {
          if (firstSystemMessage) {
            firstSystemMessage = false
            return message
          }
          message.role = ChatMessageRoleEnum.User
          // systemMessage += message.content + "\n"
          return message
        }
        return message
      }) as ChatCompletionMessageParam[]
    }

    if (this.forcedRoleAlternation) {
      // now we make sure that all the messages alternate User/Assistant/User/Assistant
      let lastRole: ChatCompletionMessageParam["role"]
      const { messages } = newMessages.reduce((acc, message) => {
        // If it's the first message or the role is different from the last, push it to the accumulator
        if (lastRole !== message.role) {
          acc.messages.push(message as ChatCompletionMessageParam);
          lastRole = message.role;
          acc.grouped = [message.content as string]
        } else {
          // If the role is the same, combine the content with the last message in the accumulator
          const lastMessage = acc.messages[acc.messages.length - 1];
          acc.grouped.push(message.content as string)
          
          lastMessage.content = acc.grouped.slice(0, -1).map((str) => {
            return `${message.role} said: ${str}`
          }).concat(acc.grouped.slice(-1)[0]).join("\n\n")
        }
        
        return acc;
      }, { messages: [], grouped: [] } as { grouped: string[], messages: ChatCompletionMessageParam[] }) 
    
      newMessages = messages
    }

    return newMessages as ChatCompletionMessageParam[]
  }
}
