import { nanoid } from "nanoid"
import { ZodSchema } from "zod"
import { EventEmitter } from "eventemitter3"
import { getProcessor } from "./processors/registry.js"
import { codeBlock } from "common-tags"
import { zodToJsonSchema } from "zod-to-json-schema"
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

export type MemoryTransformation<SchemaType, PostProcessType> = MemoryTransformationOptions<SchemaType, PostProcessType> | ((memory: WorkingMemory, value?: any) => MemoryTransformationOptions<SchemaType, PostProcessType>)

export type TransformOptions = 
  RequestOptions & { 
    stream?: boolean
    processor?: ProcessorSpecification
  }

export enum ChatMessageRoleEnum {
  System = "system",
  User = "user",
  Assistant = "assistant",
  Function = "function",
}

export interface ImageURL {
  /**
   * Either a URL of the image or the base64 encoded image data.
   */
  url: string;

  /**
   * Specifies the detail level of the image. Learn more in the
   * [Vision guide](https://platform.openai.com/docs/guides/vision/low-or-high-fidelity-image-understanding).
   */
  detail?: 'auto' | 'low' | 'high';
}

export type ContentText = { type: "text", text: string }
export type ContentImage = { type: "image_url", image_url: ImageURL }

export type ChatMessageContent = string | (ContentText | ContentImage)[]

export interface Memory<MetaDataType = Record<string, unknown>> {
  role: ChatMessageRoleEnum;
  content: ChatMessageContent;
  name?: string;

  _id: string;
  _timestamp: number;
  _metadata?: MetaDataType;
}

export type TransformReturnStreaming<PostProcessType> = [WorkingMemory, AsyncIterable<string>, Promise<PostProcessType>]
export type TransformReturn<PostProcessType> = [WorkingMemory, PostProcessType]

export type CognitiveStep<SchemaType, PostProcessType> = (
  memory: WorkingMemory,
  value: any,
  options: TransformOptions
) => Promise<typeof options['stream'] extends true ? TransformReturnStreaming<PostProcessType> : TransformReturn<PostProcessType>>;


export type InputMemory = Omit<Memory, "_id" | "_timestamp"> & { _id?: string, _timestamp?: number }

export interface ProcessorSpecification {
  name: string,
  options?: Record<string, any>
}

export interface WorkingMemoryInitOptions {
  entityName: string
  memories?: InputMemory[]
  processor?: ProcessorSpecification
}

const defaultPostProcessor = <SchemaType = string>(_workingMemory: WorkingMemory, response: SchemaType): PostProcessReturn<SchemaType> => {
  const memory = {
    role: ChatMessageRoleEnum.Assistant,
    content: (response as any).toString()
  }

  return [memory, response]
}

export type MemoryListOrWorkingMemory = InputMemory[] | WorkingMemory

export class WorkingMemory extends EventEmitter {
  readonly id
  private _memories: Memory[]

  protected pending?: Promise<void>
  protected pendingResolve?: () => void

  protected lastValue?: any

  entityName: string
  processor: ProcessorSpecification = Object.freeze({
    name: "openai",
  })

  constructor({ entityName, memories, processor }: WorkingMemoryInitOptions) {
    super()
    this.id = nanoid()
    this._memories = this.memoriesFromInputMemories(memories || [])
    this.entityName = entityName
    if (processor) {
      this.processor = processor
    }
  }

  get memories() {
    return this._memories
  }

  get finished(): Promise<void> {
    if (!this.pending) {
      return Promise.resolve()
    }
    return this.pending
  }

  // TODO: capture everything other option too
  clone(replacementMemories?: InputMemory[]) {
    const newMemory = new WorkingMemory({
      entityName: this.entityName,
      memories: replacementMemories || this._memories,
      processor: this.processor,
    })
    return newMemory
  }

  map(callback: (memory: Memory) => InputMemory) {
    const newMemories = this._memories.map(callback)
    return this.clone(newMemories)
  }

  async asyncMap(callback: (memory: Memory) => Promise<InputMemory>) {
    const newMemories = await Promise.all(this._memories.map(callback))
    return this.clone(newMemories)
  }

  withMemories(memories: MemoryListOrWorkingMemory) {
    return this.concat(this.normalizeMemoryListOrWorkingMemory(memories))
  }

  filter(callback: (memory: Memory) => boolean) {
    const newMemories = this._memories.filter(callback)
    return this.clone(newMemories)
  }

  some(callback: (memory: Memory) => boolean) {
    return this._memories.some(callback)
  }

  find(callback: (memory: Memory) => boolean) {
    return this._memories.find(callback)
  }

  concat(other: MemoryListOrWorkingMemory) {
    const otherWorkingMemory = this.normalizeMemoryListOrWorkingMemory(other)
    return this.clone(this._memories.concat(otherWorkingMemory._memories))
  }

  prepend(otherWorkingMemory: MemoryListOrWorkingMemory) {
    const otherMemory = this.normalizeMemoryListOrWorkingMemory(otherWorkingMemory)
    return this.clone(otherMemory._memories.concat(this._memories))
  }

  withMonolouge(content: string) {
    return this.clone((this.memories as InputMemory[]).concat([{
      role: ChatMessageRoleEnum.Assistant,
      content,
    }]))
  }

  async transform<SchemaType, PostProcessType>(transformation: MemoryTransformation<SchemaType, PostProcessType>, opts: { stream: true } & TransformOptions): Promise<TransformReturnStreaming<PostProcessType>>;
  async transform<SchemaType, PostProcessType>(transformation: MemoryTransformation<SchemaType, PostProcessType>, opts?: Omit<TransformOptions, 'stream'>): Promise<TransformReturn<PostProcessType>>;
  async transform<SchemaType, PostProcessType>(transformation: MemoryTransformation<SchemaType, PostProcessType>, opts?: { stream: false } & Omit<TransformOptions, 'stream'>): Promise<TransformReturn<PostProcessType>>;
  async transform<SchemaType, PostProcessType>(transformation: MemoryTransformation<SchemaType, PostProcessType>, opts: TransformOptions = {}) {
    if (this.pending) {
      await this.pending
    }
    const newMemory = this.clone()
    newMemory.markPending()

    if (typeof transformation === "function") {
      transformation = transformation(newMemory, this.lastValue)
    }

    return newMemory.doTransform<SchemaType, PostProcessType>(transformation, opts)
  }

  toString() {
    return codeBlock`
      Working Memory (${this.id}): ${this.entityName}
      Memories:
      ${this._memories.map((memory) => {
        return JSON.stringify(memory)
      }).join("\n")}
    `
  }

  protected markPending() {
    if (this.pending) {
      throw new Error("attempting to mark pending a working memory already marked as pending")
    }
    this.pending = new Promise((res) => {
      this.pendingResolve = res
    })
  }

  protected resolvePending() {
    if (!this.pendingResolve) {
      throw new Error('attempting to resolve pending on a memory that is not pending')
    }
    this.pendingResolve()
    this.pending = undefined
    this.pendingResolve = undefined
  }

  protected async doTransform<SchemaType, PostProcessType>(transformation: MemoryTransformationOptions<SchemaType, PostProcessType>, opts: TransformOptions) {
    if (!this.pending) {
      throw new Error("attempting to update working memory not marked as pending")
    }
    try {
      const {
        postProcess = defaultPostProcessor<SchemaType>,
        command,
        schema,
        skipAutoSchemaAddition,
        streamProcessor,
      } = transformation

      const processorSpec = opts.processor || this.processor

      const processor = getProcessor(processorSpec.name, processorSpec.options)

      const commandMemory = typeof command === "string" ? {
        role: ChatMessageRoleEnum.System,
        content: command
      } : command(this)

      if (schema && !skipAutoSchemaAddition) {
        commandMemory.content += "\n\n" + codeBlock`
          Respond *only* in JSON, conforming to the following JSON schema:
          ${JSON.stringify(zodToJsonSchema(schema), null, 2)}
        `
      }

      const memoryWithCommand = this.withMemories([commandMemory])

      const response = await processor.process<SchemaType>({
        memory: memoryWithCommand,
        schema: (schema as ZodSchema<SchemaType>),
        signal: opts.signal
      })

      if (opts.stream) {
        const valuePromise = new Promise(async (resolve, reject) => {
          try {
            const [memory, value] = await postProcess(this, await response.parsed)
            this._memories.push(...this.memoriesFromInputMemories([memory]))
            this.lastValue = value
            this.resolvePending()
            resolve(value)
          } catch (err) {
            reject(err)
          }
        })

        const stream = streamProcessor ? await streamProcessor(this, response.stream) : response.stream
        return [this, stream, valuePromise]
      }

      const [memory, value] = await postProcess(this, await response.parsed)
      this._memories.push(...this.memoriesFromInputMemories([memory]))
      this.lastValue = value
      this.resolvePending()

      return [this, value]
    } catch (err) {
      console.error("error in doTransform", err)
      this.resolvePending()
      throw err
    }
  }

  private memoriesFromInputMemories(memories: InputMemory[]) {
    return memories.map((memory) => {
      return Object.freeze({
        ...memory,
        _id: memory._id || nanoid(),
        _timestamp: memory._timestamp || Date.now()
      })
    })
  }

  private normalizeMemoryListOrWorkingMemory(memories: MemoryListOrWorkingMemory) {
    if (memories instanceof WorkingMemory) {
      return memories
    }
    return this.clone(memories)
  }
}
