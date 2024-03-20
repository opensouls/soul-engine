import OpenAI from "openai";
import { RequestOptions } from "openai/core";
import { trace, context } from "@opentelemetry/api";
import { encodeChatGenerator, encodeGenerator } from "gpt-tokenizer/model/gpt-4"
import { registerProcessor } from "./registry.js";
import { ChatMessageRoleEnum, Memory } from "../WorkingMemory.js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { ReusableStream } from "./ReusableStream.js";
import {
  extractJSON,
  Processor,
  prepareMemoryForJSON,
  UsageNumbers,
  ProcessOpts,
  ProcessResponse
} from "./Processor.js";
import { backOff } from "exponential-backoff";
import { ChatMessage } from "gpt-tokenizer/GptEncoding";

const tracer = trace.getTracer(
  'open-souls-OpenAIProcessor',
  '0.0.1',
);

type Clientconfig = ConstructorParameters<typeof OpenAI>[0];

export const memoryToChatMessage = (memory: Memory): ChatCompletionMessageParam => {
  return {
    role: memory.role,
    content: memory.content,
    ...(memory.name && { name: memory.name })
  } as ChatCompletionMessageParam
}

export interface OpenAIProcessorOpts {
  clientOptions?: Clientconfig
  defaultCompletionParams?: Partial<OpenAI.Chat.Completions.ChatCompletionCreateParams>
  defaultRequestOptions?: Partial<RequestOptions>
  singleSystemMessage?: boolean,
  forcedRoleAlternation?: boolean,
}

async function* chunkStreamToTextStream(chunkStream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>) {
  for await (const chunk of chunkStream) {
    yield chunk.choices[0].delta.content || ""
  }
  // console.log("chunk over, returning")
}

const DEFAULT_MODEL = "gpt-3.5-turbo-0125"

export class OpenAIProcessor implements Processor {
  static label = "openai"
  private client: OpenAI

  private singleSystemMessage: boolean
  private forcedRoleAlternation: boolean

  private defaultRequestOptions: Partial<RequestOptions>
  private defaultCompletionParams: Partial<OpenAI.Chat.Completions.ChatCompletionCreateParams>

  constructor({ clientOptions, singleSystemMessage, forcedRoleAlternation, defaultRequestOptions, defaultCompletionParams }: OpenAIProcessorOpts) {
    this.client = new OpenAI(clientOptions)
    this.singleSystemMessage = singleSystemMessage || false
    this.forcedRoleAlternation = forcedRoleAlternation || false
    this.defaultRequestOptions = defaultRequestOptions || {}
    this.defaultCompletionParams = defaultCompletionParams || {}
  }

  async process<SchemaType = string>(opts: ProcessOpts<SchemaType>): Promise<ProcessResponse<SchemaType>> {
    return tracer.startActiveSpan("OpenAIProcessor.process", async (span) => {
      context.active()

      let memory = opts.memory
      if (opts.schema) {
        memory = prepareMemoryForJSON(memory)
      }

      span.setAttributes({
        processOptions: JSON.stringify(opts),
        memory: JSON.stringify(memory),
      })

      return backOff(
        async () => {
          const resp = await this.execute({
            ...opts,
            memory,
          })

          // TODO: how do we both return a stream *and* also parse the json and retry?
          if (opts.schema) {
            const completion = await resp.rawCompletion
            const extracted = extractJSON(completion)
            span.addEvent("extracted")
            span.setAttribute("extracted", extracted || "none")
            if (!extracted) {
              throw new Error('no json found in completion')
            }
            const parsed = opts.schema.parse(JSON.parse(extracted))
            span.addEvent("parsed")
            span.end()
            return {
              ...resp,
              parsed: Promise.resolve(parsed),
            }
          }

          return {
            ...resp,
            parsed: (resp.rawCompletion as Promise<SchemaType>)
          }
        },
        {
          numOfAttempts: 5,
          retry: (err) => {
            span.addEvent("retry")
            console.error("retrying due to error", err)

            return true
          },
        })
    })

  }

  private async execute<SchemaType = any>({
    maxTokens,
    memory,
    model: developerSpecifiedModel,
    schema,
    signal,
    timeout
  }: ProcessOpts<SchemaType>): Promise<Omit<ProcessResponse<SchemaType>, "parsed">> {
    return tracer.startActiveSpan("OpenAIProcessor.execute", async (span) => {
      try {
        const model = developerSpecifiedModel || this.defaultCompletionParams.model || DEFAULT_MODEL
        const messages = this.possiblyFixMessageRoles(memory.memories.map(memoryToChatMessage))
        const params = {
          ...(maxTokens && { max_tokens: maxTokens }),
          model,
          messages,
        }

        span.setAttributes({
          outgoingParams: JSON.stringify(params),
        })

        const stream = await this.client.chat.completions.create(
          {
            ...this.defaultCompletionParams,
            ...params,
            stream: true,
            response_format: {
              type: schema ? "json_object" : "text",
            }
          },
          {
            ...this.defaultRequestOptions,
            signal,
            timeout: timeout || 10_000,
          }
        )

        const textStream = new ReusableStream(chunkStreamToTextStream(stream))

        const fullContentPromise = new Promise<string>(async (resolve, reject) => {
          try {
            let fullText = ""
            // textStream.onFirst(() => {
            //   console.log("First packet received")
            // })
            for await (const message of textStream.stream()) {
              span.addEvent("chunk", { length: message.length })
              fullText += message
            }
            // console.log("resolving")
            span.setAttribute("response", fullText)
            resolve(fullText)
          } catch (err) {
            reject(err)
          }
        })

        const usagePromise = new Promise<UsageNumbers>(async (resolve, reject) => {
          try {
            // TODO: get the real numbers using the encodeGenerator
            const fullContent = await fullContentPromise

            const messageIterator = (messages as ChatMessage[])[Symbol.iterator]();

            const outputTokenGen = encodeGenerator(fullContent)
            const inputTokenGen = encodeChatGenerator(messageIterator)

            const countTokens = async (tokenGen: Generator<any>): Promise<number> => {
              let count = 0;
              for await (const _ of tokenGen) {
                count++;
              }
              return count;
            };

            const [inputTokenCount, outputTokenCount] = await Promise.all([
              countTokens(inputTokenGen),
              countTokens(outputTokenGen),
            ]);

            span.setAttribute("model", model)
            span.setAttribute("usage-input", inputTokenCount)
            span.setAttribute("usage-output", outputTokenCount)
            resolve({
              model,
              input: inputTokenCount,
              output: outputTokenCount
            })
          } catch (err) {
            reject(err)
          } finally {
            span.end()
          }
        })

        // TODO: schema

        return {
          rawCompletion: fullContentPromise,
          stream: textStream.stream(),
          usage: usagePromise,
        }
      } catch (err: any) {
        span.recordException(err)
        throw err
      }
    })
  }

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
      let lastRole: ChatCompletionMessageParam["role"] | undefined
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
      if (newMessages[0]?.role === ChatMessageRoleEnum.Assistant) {
        newMessages.unshift({
          content: "...",
          role: ChatMessageRoleEnum.User
        })
      }
    }

    return newMessages as ChatCompletionMessageParam[]
  }

}

registerProcessor(OpenAIProcessor.label, (opts: Partial<OpenAIProcessorOpts> = {}) => new OpenAIProcessor(opts))
