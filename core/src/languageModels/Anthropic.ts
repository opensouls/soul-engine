import { ChatMessage, ChatMessageRoleEnum, ExecutorResponse, FunctionSpecification, LanguageModelProgramExecutor, LanguageModelProgramExecutorExecuteOptions } from ".";
import { ChatCompletionChunk, ChatCompletionCreateParams, ChatCompletionMessageParam } from "openai/resources";
import { RequestOptions } from "openai/core";
import { trace } from "@opentelemetry/api";
import { backOff } from "exponential-backoff";
import { OpenAICompatibleStream } from "./LLMStream";
import { FunctionToContentConverter } from "./FunctionToContentConverter";
import { withErrorCatchingSpan } from "./errorCatchingSpan";
import Anthropic from '@anthropic-ai/sdk';
import { MessageStream } from "@anthropic-ai/sdk/lib/MessageStream";
import { html } from "common-tags";

type Config = ConstructorParameters<typeof Anthropic>[0]
type ChatCompletionParams =
  Partial<ChatCompletionCreateParams>

type DefaultCompletionParams = ChatCompletionParams & {
  model: ChatCompletionCreateParams["model"] | string;
};

const tracer = trace.getTracer(
  'open-souls-anthropic-processor',
  '0.0.1',
);

function* fakeStream(str: string) {
  yield str
}

interface AnthropicMessage {
  content: string
  role: ChatMessageRoleEnum.Assistant | ChatMessageRoleEnum.User
}

async function* anthropicToOpenAiStream(stream: MessageStream) {
  let id = "unknown"
  let model: string = DEFAULT_MODEL
  let index = 0

  const now = Date.now()
  for await (const evt of stream) {
    // console.log('evt: ', evt)
    if (evt.type === "message_stop") {
      return
    }

    if (evt.type === "message_start") {
      id = evt.message.id
      model = evt.message.model
      continue
    }

    if (evt.type !== "content_block_delta") {
      continue
    }
    const chunk: ChatCompletionChunk = {
      id,
      created: now, // Replace with actual creation timestamp
      model, // Replace with actual model identifier if needed
      object: 'chat.completion.chunk', // Replace with actual object type if different
      choices: [{
        index,
        finish_reason: "stop",
        delta: {
          content: evt.delta.text,
          tool_calls: [],
        }
      }]
    };
    index++
    yield chunk;
  }
}

const DEFAULT_MODEL = "claude-3-opus-20240229"

const openAiToAnthropicMessages = (openAiMessages: ChatCompletionMessageParam[]): { system?: string, messages: AnthropicMessage[] } => {
  let systemMessage: string | undefined

  const messages = openAiMessages.map((m) => {
    if (m.role === ChatMessageRoleEnum.System) {
      if (openAiMessages.length > 1) {
        systemMessage ||= ""
        systemMessage += m.content + "\n"
        return undefined
      }

      return {
        content: m.content,
        role: ChatMessageRoleEnum.User,
      } as AnthropicMessage
    }
    return {
      content: m.content,
      role: m.role
    } as AnthropicMessage
  }).filter(Boolean) as AnthropicMessage[]

  // claude requires the first message to be user.
  if (messages[0]?.role === ChatMessageRoleEnum.Assistant) {
    messages.unshift({
      content: "...",
      role: ChatMessageRoleEnum.User
    })
  }

  return { system: systemMessage, messages: messages }
}

export class AnthropicProcessor implements LanguageModelProgramExecutor {
  client: Anthropic;
  defaultCompletionParams: DefaultCompletionParams
  defaultRequestOptions: RequestOptions
  singleSystemMessage: boolean

  constructor(
    anthropicClientConfig: Config = {},
    defaultCompletionParams: ChatCompletionParams = {},
    defaultRequestOptions: RequestOptions = {}
  ) {
    this.singleSystemMessage = true

    this.client = new Anthropic({
      ...anthropicClientConfig,
    });
    this.defaultCompletionParams = {
      model: DEFAULT_MODEL,
      stream: false,
      max_tokens: 512,
      ...defaultCompletionParams,
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
        messages: this.reformatRoles(messages) as ChatCompletionMessageParam[],
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
        const { system, messages } = openAiToAnthropicMessages(completionParams.messages)

        const anthropicParams = {
          system,
          messages,
          model: completionParams.model || this.defaultCompletionParams.model || DEFAULT_MODEL,
          max_tokens: completionParams.max_tokens || this.defaultCompletionParams.max_tokens || 512,
        }

        const anthropicStream = this.client.messages.stream({
          ...anthropicParams,
        }, {}) // todo: use request options

        const stream = new OpenAICompatibleStream(anthropicToOpenAiStream(anthropicStream))

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
    _requestOptions: RequestOptions, // TODO: fix the unused here.
  ): Promise<any> {
    return withErrorCatchingSpan(tracer, "nonFunctionExecute", async (span) => {
      const { system, messages } = openAiToAnthropicMessages(completionParams.messages)
      // console.log("messages: ", messages, "systemMessage: ", system)

      const anthropicParams = {
        system,
        messages,
        model: completionParams.model || this.defaultCompletionParams.model || DEFAULT_MODEL,
        max_tokens: completionParams.max_tokens || this.defaultCompletionParams.max_tokens || 512,
      }

      const res = await backOff(() => {
        return this.client.messages.create({
          ...anthropicParams,
          stream: false,
        }, {}) // todo: use request options
      }, {
        maxDelay: 200,
        numOfAttempts: 3,
        retry: (e, attempt) => {
          console.error("error in open ai call", e, attempt)
          return true
        }
      })

      span.setAttributes({
        "total-tokens": (res.usage?.input_tokens + res.usage.output_tokens) || "?",
        "prompt-tokens": res.usage?.input_tokens || "?",
        "completion-tokens": res.usage?.output_tokens || "?",
        "completion-content": res?.content[0].text || "?",
        "completion-function-call": "{}", //JSON.stringify(res?.choices[0]?.message?.function_call || "{}"),
      })

      const content = res?.content[0].text
      const functionCallResponse = undefined
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
  private reformatRoles(messages: (ChatMessage | ChatCompletionMessageParam)[]): ChatCompletionMessageParam[] {
    // first we make sure there's only one system message, by converting the rest to User roles
    let firstSystemMessage = true
    const messagesWithFixedSystem = messages.map((originalMessage) => {
      const message = { ...originalMessage }
      if (message.role === ChatMessageRoleEnum.System) {
        if (firstSystemMessage) {
          firstSystemMessage = false
          return message
        }
        message.role = ChatMessageRoleEnum.User
        return message
      }
      return message
    }) as ChatCompletionMessageParam[]

    // now we make sure that all the messages alternate User/Assistant/User/Assistant
    let lastRole: ChatCompletionMessageParam["role"]
    const { messages: reformattedMessages } = messagesWithFixedSystem.reduce((acc, message) => {
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
     
    return reformattedMessages
  }
}
