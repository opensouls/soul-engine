import OpenAI from "openai";
import { encodeChatGenerator, encodeGenerator } from "gpt-tokenizer/model/gpt-4"
import { RequestOptions } from "openai/core";
import { trace, context } from "@opentelemetry/api";
import { backOff } from "exponential-backoff";
import { ChatMessage } from "gpt-tokenizer/GptEncoding";
import { ZodError, fromZodError } from 'zod-validation-error';

import { registerProcessor } from "./registry.js";
import { ChatMessageRoleEnum, ContentText, Memory } from "../Memory.js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import {
  extractJSON,
  Processor,
  prepareMemoryForJSON,
  UsageNumbers,
  ProcessOpts,
  ProcessResponse
} from "./Processor.js";
import { fixMessageRoles } from "./messageRoleFixer.js";
import { indentNicely } from "../utils.js";
import { forkStream } from "../forkStream.js";

const tracer = trace.getTracer(
  'open-souls-OpenAIProcessor',
  '0.0.1',
);

const tokenLength = (messagesOrContent: ChatMessage[] | string): number => {
  // first count out all the images in the memories
  let tokenCount = 0

  if (typeof messagesOrContent === "string") {
    for (const tokens of encodeGenerator(messagesOrContent)) {
      tokenCount += tokens.length
    }

    return tokenCount
  }

  const messagesWithoutImages = messagesOrContent.map((m) => {
    if (!Array.isArray(m.content)) {
      return m
    }
    const text = m.content.find((c) => c.type === "text") as ContentText
    const images = m.content.filter((c) => c.type === "image_url")
    // TODO: for now let's treat everything as a 1024x1024 image
    tokenCount += images.length * 765
    return {
      ...m,
      content: text?.text || ""
    }
  })

  for (const tokens of encodeChatGenerator(messagesWithoutImages as any[])) {
    tokenCount += tokens.length
  }

  return tokenCount
}

export type OpenAIClientConfig = ConstructorParameters<typeof OpenAI>[0];

const memoryToChatMessage = (memory: Memory): ChatCompletionMessageParam => {
  return {
    role: memory.role,
    content: memory.content,
    ...(memory.name && { name: memory.name })
  } as ChatCompletionMessageParam
}

export interface OpenAIProcessorOpts {
  clientOptions?: OpenAIClientConfig
  defaultCompletionParams?: Partial<OpenAI.Chat.Completions.ChatCompletionCreateParams>
  defaultRequestOptions?: Partial<RequestOptions>
  singleSystemMessage?: boolean,
  forcedRoleAlternation?: boolean,
  disableResponseFormat?: boolean,
}

async function* chunkStreamToTextStream(chunkStream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>) {
  try {
    for await (const chunk of chunkStream) {
      yield chunk.choices[0].delta.content || ""
    }
  } catch (err) {
    console.error("chunkStreamToTextStream error", err)
    throw err
  }
}

const DEFAULT_MODEL = "gpt-3.5-turbo-0125"

export class OpenAIProcessor implements Processor {
  static label = "openai"
  private client: OpenAI

  private singleSystemMessage: boolean
  private forcedRoleAlternation: boolean
  private disableResponseFormat: boolean // default this one to true

  private defaultRequestOptions: Partial<RequestOptions>
  private defaultCompletionParams: Partial<OpenAI.Chat.Completions.ChatCompletionCreateParams>

  constructor({ clientOptions, singleSystemMessage, forcedRoleAlternation, defaultRequestOptions, defaultCompletionParams, disableResponseFormat }: OpenAIProcessorOpts) {
    this.client = new OpenAI(clientOptions)
    this.singleSystemMessage = singleSystemMessage || false
    this.forcedRoleAlternation = forcedRoleAlternation || false
    this.defaultRequestOptions = defaultRequestOptions || {}
    this.disableResponseFormat = disableResponseFormat || false
    this.defaultCompletionParams = defaultCompletionParams || {}
  }

  async process<SchemaType = string>(opts: ProcessOpts<SchemaType>): Promise<ProcessResponse<SchemaType>> {
    return tracer.startActiveSpan("OpenAIProcessor.process", async (span) => {
      try {
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
                console.error("no json found in completion", completion)
                throw new Error('no json found in completion')
              }
              try {
                const parsed = opts.schema.parse(JSON.parse(extracted))
                span.addEvent("parsed")
                span.end()
                return {
                  ...resp,
                  parsed: Promise.resolve(parsed),
                }
              } catch (err: any) {
                span.recordException(err)
                const zodError = fromZodError(err as ZodError)
                console.log("zod error", zodError.toString())
                memory = memory.concat([
                  {
                    role: ChatMessageRoleEnum.Assistant,
                    content: extracted,
                  },
                  {
                    role: ChatMessageRoleEnum.User,
                    content: indentNicely`
                      ## JSON Errors
                      ${zodError.toString()}.
                      
                      Please fix the error(s) and try again, conforming exactly to the provided JSON schema.
                    `
                  }
                ])
                throw err
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
              if (err.message.includes("aborted")) {
                return false
              }
              span.addEvent("retry")
              console.error("retrying due to error", err)

              return true
            },
          })
      } catch (err: any) {
        console.error("error in process", err)
        span.recordException(err)
        span.end()
        throw err
      }
    })

  }

  private async execute<SchemaType = any>({
    maxTokens,
    memory,
    model: developerSpecifiedModel,
    schema,
    signal,
    timeout,
    temperature,
  }: ProcessOpts<SchemaType>): Promise<Omit<ProcessResponse<SchemaType>, "parsed">> {
    return tracer.startActiveSpan("OpenAIProcessor.execute", async (span) => {
      try {
        const model = developerSpecifiedModel || this.defaultCompletionParams.model || DEFAULT_MODEL
        const messages = this.possiblyFixMessageRoles(memory.memories.map(memoryToChatMessage))
        const params = {
          ...this.defaultCompletionParams,
          ...(maxTokens && { max_tokens: maxTokens }),
          model,
          messages,
          temperature: temperature || 0.8,
          stream: true,
        }

        span.setAttributes({
          outgoingParams: JSON.stringify(params),
        })

        const stream = await this.client.chat.completions.create(
          {
            ...params,
            stream: true,
            ...(!this.disableResponseFormat && { response_format: { type: schema ? "json_object" : "text" } })
          },
          {
            ...this.defaultRequestOptions,
            signal,
            timeout: timeout || 10_000,
          }
        )

        const [textStream1, textStream2] = forkStream(chunkStreamToTextStream(stream), 2)

        // const textStream = new ReusableStream(chunkStreamToTextStream(stream))

        const fullContentPromise = new Promise<string>(async (resolve, reject) => {
          try {
            let fullText = ""
            for await (const message of textStream1) {
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
            const fullContent = await fullContentPromise

            const [inputTokenCount, outputTokenCount] = await Promise.all([
              tokenLength(messages as ChatMessage[]),
              tokenLength(fullContent),
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

        return {
          rawCompletion: fullContentPromise,
          stream: textStream2,
          usage: usagePromise,
        }
      } catch (err: any) {
        span.recordException(err)
        span.end()
        throw err
      }
    })
  }

  private possiblyFixMessageRoles(messages: (ChatMessage | ChatCompletionMessageParam)[]): ChatCompletionMessageParam[] {
    return fixMessageRoles({ singleSystemMessage: this.singleSystemMessage, forcedRoleAlternation: this.forcedRoleAlternation }, messages)
  }
}

registerProcessor(OpenAIProcessor.label, (opts: Partial<OpenAIProcessorOpts> = {}) => new OpenAIProcessor(opts))
