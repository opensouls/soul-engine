import { ZodSchema } from "zod"
import { InputMemory, ProcessorSpecification, WorkingMemory } from "./WorkingMemory.js"
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

/**
 * Creates a new CognitiveStep function configured with the specified transformation logic.
 * This function is pivotal in the cognitive processing pipeline, allowing for dynamic
 * transformation of working memory based on user-defined logic and conditions.
 *
 * @param cb A callback function that takes a single argument and returns a `MemoryTransformationOptions` object.
 *           This callback defines the transformation logic to be applied in the cognitive step.
 *           The single argument can be any user-defined data structure or value that the callback
 *           uses to determine the transformation logic.
 * @returns A `CognitiveStep` function that takes a `WorkingMemory` instance, user arguments, and
 *          transformation options. It applies the transformation logic defined by the `cb` callback
 *          to the working memory and returns the transformed memory along with any post-processing results.
 *          The function supports both streaming and non-streaming modes based on the provided options.
 *
 * Trivial exmaple:
 * It defines a CognitiveStep that answers a user's question in a single word.
 * The transformation logic includes a command as a string, a schema to validate the response using Zod, and a post-processing function that converts the response to uppercase.
 * This cognitive step is then used to transform the working memory based on user arguments and transformation options, supporting both streaming and non-streaming modes.
 * ```
 * const myCognitiveStep = createCognitiveStep((singleArg) => ({
 *   command: 'Answer the user's question in a single word.',
 *   schema: z.object({ answer: z.string() }),
 *   postProcess: async (originalMemory, response) => [originalMemory, response.toUpperCase()],
 * }));
 *
 * // To use the cognitive step:
 * const [newMemory, result] = await myCognitiveStep(workingMemory, userArgs, { stream: false });
 * ```
 */
export const createCognitiveStep = <SchemaType, PostProcessType>(cb: (singleArg: any) => MemoryTransformationOptions<SchemaType, PostProcessType>): CognitiveStep<PostProcessType> => {
  return (async (workingMemory: WorkingMemory, singleArg: any, opts: TransformOptions = {}) => {
    const transformOpts = cb(singleArg)
    return workingMemory.transform(transformOpts, opts)
  }) as CognitiveStep<PostProcessType>
}
