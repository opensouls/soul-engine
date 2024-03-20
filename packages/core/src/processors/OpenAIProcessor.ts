import OpenAI from "openai";
import { RequestOptions } from "openai/core";
import { trace, context } from "@opentelemetry/api";
import { encodeChatGenerator, encodeGenerator } from "gpt-tokenizer/model/gpt-4"
import { backOff } from "exponential-backoff";
import { ChatMessage } from "gpt-tokenizer/GptEncoding";
import { ZodError, fromZodError } from 'zod-validation-error';

import { registerProcessor } from "./registry.js";
import { ChatMessageRoleEnum, Memory } from "../WorkingMemory.js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { ReusableStream } from "../ReusableStream.js";
import {
  extractJSON,
  Processor,
  prepareMemoryForJSON,
  UsageNumbers,
  ProcessOpts,
  ProcessResponse
} from "./Processor.js";
import { fixMessageRoles } from "./messageRoleFixer.js";
import { codeBlock } from "common-tags";

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
  disableResponseFormat?: boolean,
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
                    content: codeBlock`
                      ## JSON Errors
                      ${zodError.toString()}.
                      
                      Please fix the error(s) and try again, conforming exactly to the provided JSON schema.`
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
          ...(maxTokens && { max_tokens: maxTokens }),
          model,
          messages,
          temperature: temperature || 0.8,
        }

        span.setAttributes({
          outgoingParams: JSON.stringify(params),
        })

        const stream = await this.client.chat.completions.create(
          {
            ...this.defaultCompletionParams,
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
    return fixMessageRoles({ singleSystemMessage: this.singleSystemMessage, forcedRoleAlternation: this.forcedRoleAlternation }, messages)
  }
}

registerProcessor(OpenAIProcessor.label, (opts: Partial<OpenAIProcessorOpts> = {}) => new OpenAIProcessor(opts))
