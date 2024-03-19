import { Schema, ZodSchema } from "zod"
import { ChatMessageRoleEnum, InputMemory, WorkingMemory } from "./WorkingMemory.js"
import { getProcessor } from "./processors/registry.js"
import { codeBlock } from "common-tags"
import { zodToJsonSchema } from "zod-to-json-schema"
import { Processor, ProcessResponseWithParsed, ProcessResponseWithoutParsed } from "./processors/Processor.js"
import { trace } from "@opentelemetry/api"
import { TransformOptions } from "stream"

const tracer = trace.getTracer(
  'open-souls-transformMemory',
  '0.0.1',
);

export type StreamProcessor = (workingMemory: WorkingMemory, stream: AsyncIterable<string>) => (AsyncIterable<string> | Promise<AsyncIterable<string>>)

export interface TransformMemoryOptions<SchemaType> {
  processor: string
  command: string | ((workingMemory: WorkingMemory) => InputMemory)
  schema?: ZodSchema<SchemaType>
  postProcess?: (originalMemory: WorkingMemory, response: SchemaType) => (Promise<[WorkingMemory, SchemaType]> | [WorkingMemory, SchemaType])
  streamProcessor?: StreamProcessor
  skipAutoSchemaAddition?: boolean
  signal?: AbortSignal
}

export type CognitiveTransformation = {
  // non-streaming
  <SchemaType = string>(workingMemory: WorkingMemory, ...args: [...any[], Partial<TransformMemoryOptionsNonStreaming<SchemaType>>]): Promise<[WorkingMemory, SchemaType]>;
  // streaming
  <SchemaType = string>(workingMemory: WorkingMemory, ...args: [...any[], Partial<TransformMemoryOptionsStreaming<SchemaType>>]): Promise<[Promise<WorkingMemory>, Promise<SchemaType>, AsyncIterable<string>]>;
};

const defaultPostProcessor = <SchemaType = string>(workingMemory: WorkingMemory, response: SchemaType): [WorkingMemory, SchemaType] => {
  const updatedMemory = workingMemory.withMemories([{
    role: ChatMessageRoleEnum.Assistant,
    content: (response as any).toString()
  }])

  return [updatedMemory, response]
}

const getSchemaResponse = async <SchemaType>(processor: Processor, schema: ZodSchema<SchemaType>, memory: WorkingMemory, opts: TransformMemoryOptionsNonStreaming<SchemaType>): Promise<SchemaType> => {
  const response = await processor.process({
    memory,
    schema,
    signal: opts.signal
  }) as ProcessResponseWithParsed<SchemaType>

  return response.parsed
}

const getNonSchemaResponse = async (processor: Processor, memory: WorkingMemory, opts: TransformMemoryOptionsNonStreaming<string>): Promise<string> => {
  const response = await processor.process({
    memory,
    signal: opts.signal
  }) as ProcessResponseWithoutParsed

  return response.rawCompletion
}

const getSchemaStreamingResponse = async <SchemaType>(processor: Processor, schema: ZodSchema<SchemaType>, memory: WorkingMemory, opts: TransformMemoryOptions<SchemaType>): Promise<[AsyncIterable<string>, Promise<SchemaType>]> => {
  const response = await processor.process({
    memory,
    schema,
    signal: opts.signal,
  }) as ProcessResponseWithParsed<SchemaType>

  return [response.stream, response.parsed]
}

const getNonSchemaStreamingResponse = async (processor: Processor, memory: WorkingMemory, opts: TransformMemoryOptions<string>): Promise<[AsyncIterable<string>, Promise<string>]> => {
  const response = await processor.process({
    memory,
    signal: opts.signal,
  }) as ProcessResponseWithoutParsed

  return [response.stream, response.rawCompletion]
}

function isStreamingOpts<SchemaType>(opts: TransformMemoryOptions<SchemaType>): opts is TransformMemoryOptionsStreaming<SchemaType> {
  return !!opts.stream
}

export function transformMemory<SchemaType = string>(
  workingMemory: WorkingMemory,
  opts: TransformMemoryOptionsNonStreaming<SchemaType>
): Promise<[WorkingMemory, SchemaType]>;

export function transformMemory<SchemaType = string>(
  workingMemory: WorkingMemory,
  opts: TransformMemoryOptionsStreaming<SchemaType>
): Promise<[Promise<WorkingMemory>, AsyncIterable<string>, Promise<SchemaType>]>;

export async function transformMemory<SchemaType = string>(
  workingMemory: WorkingMemory,
  opts: TransformMemoryOptions<SchemaType>
): Promise<[WorkingMemory, SchemaType] | [Promise<WorkingMemory>, AsyncIterable<string>, Promise<SchemaType>]> {
  return tracer.startActiveSpan('transformMemory', async (span) => {
    try {
      if (isStreamingOpts(opts)) {
        return transformStreaming(workingMemory, opts)
      }
  
      const { 
        processor: processorName, 
        command,
        schema,
        skipAutoSchemaAddition,
        postProcess = defaultPostProcessor<SchemaType>
      } = opts
  
  
      const processor = getProcessor(processorName)
  
      const commandMemory = typeof command === "string" ? {
        role: ChatMessageRoleEnum.System,
        content: command
      } : command(workingMemory)
    
      if (schema && !skipAutoSchemaAddition) {
        commandMemory.content += codeBlock`
          \n
          Respond *only* in JSON, conforming to the following JSON schema:
          ${JSON.stringify(zodToJsonSchema(schema), null, 2)}
        `
      }
    
      const memoryWithCommand = workingMemory.withMemories([commandMemory])
    
      const response = schema ?
        await getSchemaResponse(processor, schema, memoryWithCommand, opts) :
        await getNonSchemaResponse(processor, memoryWithCommand, opts as unknown as TransformMemoryOptionsNonStreaming<string>)

        
      return postProcess(workingMemory, (response as SchemaType))
    } finally {
      span.end()
    }
  })
}


async function transformStreaming<SchemaType = string>(
  workingMemory: WorkingMemory,
  opts: TransformMemoryOptionsStreaming<SchemaType>
): Promise<[Promise<WorkingMemory>, AsyncIterable<string>, Promise<SchemaType>]> {
  const { 
    processor: processorName, 
    command,
    schema,
    skipAutoSchemaAddition,
    streamProcessor,
    postProcess = defaultPostProcessor<SchemaType>
  } = opts


  const processor = getProcessor(processorName)

  const commandMemory = typeof command === "string" ? {
    role: ChatMessageRoleEnum.System,
    content: command
  } : command(workingMemory)

  if (schema && !skipAutoSchemaAddition) {
    commandMemory.content += codeBlock`
      \n
      Respond *only* in JSON, conforming to the following JSON schema:
      ${JSON.stringify(zodToJsonSchema(schema), null, 2)}
    `
  }

  const memoryWithCommand = workingMemory.withMemories([commandMemory])

  const [rawStream, parsedOrString] = schema ?
    await getSchemaStreamingResponse(processor, schema, memoryWithCommand, opts) :
    await getNonSchemaStreamingResponse(processor, memoryWithCommand, opts as TransformMemoryOptions<string>)

  const stream = streamProcessor ? (await streamProcessor(workingMemory, rawStream)) : rawStream

  const postCompletion = new Promise<[WorkingMemory, SchemaType]>(async (resolve, reject) => {
    try {
      const resp = await postProcess(workingMemory, (await parsedOrString) as SchemaType)
      resolve(resp)
    } catch (e) {
      reject(e)
    }
  })

  const memoryPromise = new Promise<WorkingMemory>(async (resolve, reject) => {
    try {
      const resp = await postCompletion
      resolve(resp[0])
    } catch (e) {
      reject(e)
    }
  })

  const parsedPromise = new Promise<SchemaType>(async (resolve, reject) => {
    try {
      const resp = await postCompletion
      resolve(resp[1])
    } catch (e) {
      reject(e)
    }
  })

    
  return [memoryPromise, stream, parsedPromise]

}


