import OpenAI from "openai";
import { ZodSchema } from 'zod';
import { trace, context } from "@opentelemetry/api";
import { encodeChatGenerator, encodeGenerator } from "gpt-tokenizer/model/gpt-4"
import { registerProcessor } from "./registry.js";
import { Memory, WorkingMemory } from "../WorkingMemory.js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { ReusableStream } from "./ReusableStream.js";
import {
  extractJSON,
  Processor,
  ProcessOptsWithoutSchema,
  ProcessResponseWithoutParsed,
  ProcessResponseWithParsed,
  ProcessOptsWithOptionalSchema,
  ProcessResonse,
  ProcessOptsWithSchema,
  prepareMemoryForJSON,
  UsageNumbers
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

interface OpenAIProcessorOpts {
  clientOptions?: Clientconfig
}

async function* chunkStreamToTextStream(chunkStream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>) {
  for await (const chunk of chunkStream) {
    yield chunk.choices[0].delta.content || ""
  }
  console.log("chunk over, returning")
}

const DEFAULT_MODEL = "gpt-3.5-turbo-0125"

export class OpenAIProcessor implements Processor {
  static label = "openai"
  private client: OpenAI

  constructor({ clientOptions }: OpenAIProcessorOpts) {
    this.client = new OpenAI(clientOptions)
  }

  async process(opts: ProcessOptsWithoutSchema): Promise<ProcessResponseWithoutParsed>;
  async process<SchemaType = any>(opts: ProcessOptsWithSchema<SchemaType>): Promise<ProcessResponseWithParsed<SchemaType>>;

  async process<SchemaType = any>(opts: ProcessOptsWithOptionalSchema<SchemaType>): Promise<ProcessResonse> {
    return tracer.startActiveSpan("OpenAIProcessor.process", async (span) => {
      context.active()

      let memory = opts.memory
      if (opts.schema) {
        memory = prepareMemoryForJSON(memory)
      }

      span.setAttributes({
        ...opts,
        memory: JSON.stringify(opts.memory.memories.map(memoryToChatMessage)),
        schema: opts.schema ? opts.schema.toString() : undefined,
        signal: undefined,
      })

      return backOff(async () => {
        const resp = await this.execute({
          ...opts,
          memory,
        })

        if (opts.schema) {
          const completion = await resp.completion
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
            parsed,
          }
        }

        return resp
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

  private async execute<SchemaType = any>({ memory, signal, schema }: ProcessOptsWithOptionalSchema<SchemaType>): Promise<ProcessResonse> {
    return tracer.startActiveSpan("OpenAIProcessor.execute", async (span) => {
      try {
        const model = DEFAULT_MODEL
        const messages = memory.memories.map(memoryToChatMessage)
        const params = {
          model,
          messages,
        }

        span.setAttributes({
          outgoingParams: JSON.stringify(params),
        })

        const stream = await this.client.chat.completions.create(
          {
            ...params,
            stream: true,
            response_format: {
              type: schema ? "json_object" : "text",
            }
          },
          {
            signal,
          }
        )

        const textStream = new ReusableStream(chunkStreamToTextStream(stream))

        const fullContentPromise = new Promise<string>(async (resolve, reject) => {
          try {
            let fullText = ""
            textStream.onFirst(() => {
              console.log("First packet received")
            })
            for await (const message of textStream.stream()) {
              span.addEvent("chunk", { length: message.length })
              fullText += message
            }
            console.log("resolving")
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
          completion: fullContentPromise,
          stream: textStream.stream(),
          usage: usagePromise,
        }
      } catch (err: any) {
        span.recordException(err)
        throw err
      }
    })
  }

}

registerProcessor(OpenAIProcessor.label, () => new OpenAIProcessor({}))
