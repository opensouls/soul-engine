import Anthropic from '@anthropic-ai/sdk';
import { MessageStream } from "@anthropic-ai/sdk/lib/MessageStream";
import { trace, context } from "@opentelemetry/api";
import { encodeChatGenerator, encodeGenerator } from "gpt-tokenizer/model/gpt-4"
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
import { backOff } from "exponential-backoff";
import { ChatMessage } from "gpt-tokenizer/GptEncoding";
import { fixMessageRoles } from './messageRoleFixer.js';

const tracer = trace.getTracer(
  'open-souls-OpenAIProcessor',
  '0.0.1',
);

interface AnthropicMessage {
  content: string
  role: ChatMessageRoleEnum.Assistant | ChatMessageRoleEnum.User
}

export type AnthropicClientConfig = ConstructorParameters<typeof Anthropic>[0]

export type AnthropicCompletionParams = Anthropic["messages"]["stream"]["arguments"][0]
export type AnthropicRequestOptions = Anthropic["messages"]["stream"]["arguments"][1]

export type AnthropicDefaultCompletionParams = AnthropicCompletionParams & {
  model: AnthropicCompletionParams["model"] | string;
};

const memoryToChatMessage = (memory: Memory): ChatCompletionMessageParam => {
  return {
    role: memory.role,
    content: memory.content,
    ...(memory.name && { name: memory.name })
  } as ChatCompletionMessageParam
}

export interface AnthropicProcessorOpts {
  clientOptions?: AnthropicClientConfig
  defaultCompletionParams?: Partial<AnthropicDefaultCompletionParams>
  defaultRequestOptions?: Partial<AnthropicRequestOptions>
  forcedRoleAlternation?: boolean,
}

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

async function* chunkStreamToTextStream(chunkStream: MessageStream) {

  for await (const evt of chunkStream) {
    if (evt.type === "message_start") {
      continue
    }

    if (evt.type !== "content_block_delta") {
      continue
    }

    yield evt.delta.text;
  }
  // console.log("chunk over, returning")
}

const DEFAULT_MODEL = "claude-3-opus-20240229"

export class AnthropicProcessor implements Processor {
  static label = "anthropic"
  private client: Anthropic

  private forcedRoleAlternation: boolean

  private defaultRequestOptions: Partial<AnthropicRequestOptions>
  private defaultCompletionParams: Partial<AnthropicDefaultCompletionParams>

  constructor({ clientOptions, forcedRoleAlternation, defaultRequestOptions, defaultCompletionParams }: AnthropicProcessorOpts) {
    this.client = new Anthropic(clientOptions)
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
    timeout,
    temperature,
  }: ProcessOpts<SchemaType>): Promise<Omit<ProcessResponse<SchemaType>, "parsed">> {
    return tracer.startActiveSpan("AnthropicProcessor.execute", async (span) => {
      try {
        const model = developerSpecifiedModel || this.defaultCompletionParams.model || DEFAULT_MODEL

        const { system, messages } = openAiToAnthropicMessages(this.possiblyFixMessageRoles(memory.memories.map(memoryToChatMessage)))

        const params = {
          system,
          max_tokens: maxTokens || this.defaultCompletionParams.max_tokens || 512,
          model,
          messages,
          temperature: temperature || 0.8,
        }

        span.setAttributes({
          outgoingParams: JSON.stringify(params),
        })

        const stream = await this.client.messages.stream(
          {
            ...this.defaultCompletionParams,
            ...params,
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
            const fullContent = await fullContentPromise

            const messageIterator = (messages as ChatMessage[])[Symbol.iterator]();

            const outputTokenGen = encodeGenerator(fullContent)
            const inputTokenGen = encodeChatGenerator(messageIterator)

            const countTokens = async (tokenGen: Generator<any>): Promise<number> => {
              let count = 0;
              for await (const chunk of tokenGen) {
                count += chunk.length;
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
    return fixMessageRoles({ singleSystemMessage: true, forcedRoleAlternation: this.forcedRoleAlternation }, messages)
  }

}

registerProcessor(AnthropicProcessor.label, (opts: Partial<AnthropicProcessorOpts> = {}) => new AnthropicProcessor(opts))
