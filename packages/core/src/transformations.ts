import { Schema, ZodSchema } from "zod"
import { ChatMessageRoleEnum, InputMemory, WorkingMemory } from "./WorkingMemory.js"
import { getProcessor } from "./processors/registry.js"
import { codeBlock } from "common-tags"
import { zodToJsonSchema } from "zod-to-json-schema"
import { Processor, ProcessResonse, ProcessResponseWithParsed, ProcessResponseWithoutParsed } from "./processors/Processor.js"
import { trace } from "@opentelemetry/api"

const tracer = trace.getTracer(
  'open-souls-transformMemory',
  '0.0.1',
);


export type StreamProcessor = (workingMemory: WorkingMemory, stream: AsyncIterable<string>) => AsyncIterable<string> | Promise<AsyncIterable<string>>

interface TransformMemoryOptionsNonStreaming<SchemaType = string> {
  processor: string
  command: string | ((workingMemory: WorkingMemory) => InputMemory)
  schema?: ZodSchema<SchemaType>
  postProcess?: (originalMemory: WorkingMemory, response: SchemaType) => Promise<[WorkingMemory, SchemaType]>
  // streamProcessor?: StreamProcessor
  skipAutoSchemaAddition?: boolean
  signal?: AbortSignal
}

interface TransformMemoryOptionsStreaming<SchemaType = string> extends TransformMemoryOptionsNonStreaming<SchemaType> {
  stream: true
}

export type TransformMemoryOptions<SchemaType = string> = TransformMemoryOptionsNonStreaming<SchemaType> & { stream?: boolean }

export type CognitiveTransformation = {
  // non-streaming
  <SchemaType = string>(workingMemory: WorkingMemory, ...args: any[]): Promise<[WorkingMemory, SchemaType]>;
  // streaming
  <SchemaType = string>(workingMemory: WorkingMemory, ...args: any[]): Promise<[Promise<WorkingMemory>, Promise<SchemaType>, AsyncIterable<string>]>;
};

const defaultPostProcessor = <SchemaType = string>(workingMemory: WorkingMemory, response: SchemaType) => {
  const updatedMemory = workingMemory.withMemories([{
    role: ChatMessageRoleEnum.Assistant,
    content: (response as any).toString()
  }])

  return [updatedMemory, response]
}

const handleSchemaResponse = async <SchemaType>(processor: Processor, schema: ZodSchema<SchemaType>, memory: WorkingMemory, opts: TransformMemoryOptionsNonStreaming<SchemaType>) => {
  const { postProcess = defaultPostProcessor } = opts

  const response = await processor.process({
    memory,
    schema,
    signal: opts.signal
  }) as ProcessResponseWithParsed<SchemaType>

  return postProcess<SchemaType>(memory, response.parsed)
}

const handleNonSchemaResponse = async (processor: Processor, memory: WorkingMemory, opts: TransformMemoryOptionsNonStreaming<string>) => {
  const { postProcess = defaultPostProcessor } = opts

  const response = await processor.process({
    memory,
    signal: opts.signal
  }) as ProcessResponseWithoutParsed

  return postProcess<string>(memory, await response.completion)
}

export const transformMemory = async <SchemaType = string>(workingMemory: WorkingMemory, opts: TransformMemoryOptionsNonStreaming & { stream?: boolean }): Promise<[WorkingMemory, SchemaType] | [WorkingMemory, SchemaType, AsyncIterable<string>]> => {
  return tracer.startActiveSpan('transformMemory', async (span) => {
    if (opts.stream) {
      throw new Error("WIP on streaming")
    }

    const { 
      processor: processorName, 
      command,
      schema,
      skipAutoSchemaAddition
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
  
    if (schema) {
      return handleSchemaResponse(processor, schema, memoryWithCommand, opts) as Promise<[WorkingMemory, SchemaType]>
    }
  
    return handleNonSchemaResponse(processor, memoryWithCommand, opts) as Promise<[WorkingMemory, SchemaType]>
  })

}

