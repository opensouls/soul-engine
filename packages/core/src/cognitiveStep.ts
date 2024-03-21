import { ZodSchema } from "zod"
import { ChatMessageRoleEnum, InputMemory, ProcessorSpecification, WorkingMemory } from "./WorkingMemory.js"
import { RequestOptions } from "./processors/Processor.js"


export type StreamProcessor = (workingMemory: WorkingMemory, stream: AsyncIterable<string>) => (AsyncIterable<string> | Promise<AsyncIterable<string>>)

export type PostProcessReturn<SchemaType> = [InputMemory, SchemaType]

export interface MemoryTransformationOptions<SchemaType = string, PostProcessType = SchemaType> {
  command: string | ((workingMemory: WorkingMemory) => InputMemory)

  processor?: string
  schema?: ZodSchema<SchemaType>
  postProcess?: (originalMemory: WorkingMemory, response: SchemaType) => (Promise<PostProcessReturn<PostProcessType>> | PostProcessReturn<PostProcessType>)
  streamProcessor?: StreamProcessor
  skipAutoSchemaAddition?: boolean
}

export type TransformOptions = 
  RequestOptions &
  { 
    stream?: boolean
    processor?: ProcessorSpecification
  }

export type TransformReturnStreaming<PostProcessType> = [WorkingMemory, AsyncIterable<string>, Promise<PostProcessType>]
export type TransformReturnNonStreaming<PostProcessType> = [WorkingMemory, PostProcessType]
export type TransformReturn<PostProcessType> = TransformReturnStreaming<PostProcessType> | TransformReturnNonStreaming<PostProcessType>

export type CognitiveStep<PostProcessReturnType> = {
  (memory: WorkingMemory, userArgs: any, transformOpts: TransformOptions & { stream: true }): Promise<TransformReturnStreaming<PostProcessReturnType>>
  (memory: WorkingMemory, userArgs: any, transformOpts?: Omit<TransformOptions, "stream">): Promise<TransformReturnNonStreaming<PostProcessReturnType>>
  (memory: WorkingMemory, userArgs: any, transformOpts: Omit<TransformOptions, "stream"> & { stream: false }): Promise<TransformReturnNonStreaming<PostProcessReturnType>>
}

export const createCognitiveStep = <SchemaType, PostProcessType>(cb: (singleArg: any) => MemoryTransformationOptions<SchemaType, PostProcessType>): CognitiveStep<PostProcessType> => {
  return (async (workingMemory: WorkingMemory, singleArg: any, opts: TransformOptions = {}) => {
    const transformOpts = cb(singleArg)
    return workingMemory.transform(transformOpts, opts)
  }) as CognitiveStep<PostProcessType>
}
