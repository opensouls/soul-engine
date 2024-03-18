import OpenAI from "openai";
import { ZodSchema } from 'zod';
import { encodeGenerator } from "gpt-tokenizer/model/gpt-4"
import { registerProcessor } from "./registry.js";
import { Memory, WorkingMemory } from "../WorkingMemory.js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { ReusableStream } from "./ReusableStream.js";

type Clientconfig = ConstructorParameters<typeof OpenAI>[0];

export const memoryToChatMessage = (memory: Memory): ChatCompletionMessageParam => {
  return {
    role: memory.role,
    content: memory.content,
    ...(memory.name && { name: memory.name })
  } as ChatCompletionMessageParam
}

interface UsageNumbers {
  model: string,
  input: number,
  output: number
}

interface ProcessResonse {
  completion: Promise<string>
  stream: AsyncIterable<string>
  usage: Promise<UsageNumbers>
}

interface ProcessOpts<SchemaType = any> {
  memory: WorkingMemory,
  schema?: ZodSchema<SchemaType>
}

interface Processor {
  //TODO
  process<SchemaType = any>(opts: ProcessOpts<SchemaType>): Promise<ProcessResonse>
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

  async process<SchemaType = any>({ memory, schema }: ProcessOpts<SchemaType>): Promise<ProcessResonse> {
    const model = DEFAULT_MODEL
    const messages = memory.memories.map(memoryToChatMessage)

    const stream = await this.client.chat.completions.create({
      model,
      messages,
      stream: true
    })

    const textStream = new ReusableStream(chunkStreamToTextStream(stream))

    const fullContentPromise = new Promise<string>(async (resolve, reject) => {
      try {
        let fullText = ""
        textStream.onFirst(() => {
          console.log("First packet received")
        })
        for await (const message of textStream.stream()) {
          fullText += message
        }
        console.log("resolving")
        resolve(fullText)
      } catch (err) {
        reject(err)
      }
    })

    const usagePromise = new Promise<UsageNumbers>(async (resolve, reject) => {
      try {
        // TODO: get the real numbers using the encodeGenerator
        const fullContent = await fullContentPromise
        resolve({
          model,
          input: fullContent.length,
          output: fullContent.length
        })
      } catch(err) {
        reject(err)
      }
    })

    // TODO: schema

    return {
      completion: fullContentPromise,
      stream: textStream.stream(),
      usage: usagePromise,
    }

  }

}

registerProcessor(OpenAIProcessor.label, () => new OpenAIProcessor({}))