import { nanoid } from "nanoid"
import { ZodSchema } from "zod"
import { EventEmitter } from "eventemitter3"
import { getProcessor } from "./processors/registry.js"
import { codeBlock } from "common-tags"
import { zodToJsonSchema } from "zod-to-json-schema"


export type PromiseWithNext<T> = Promise<T> & { next: WorkingMemory["next"] }

export type StreamProcessor = (workingMemory: WorkingMemory, stream: AsyncIterable<string>) => (AsyncIterable<string> | Promise<AsyncIterable<string>>)

export interface PostProcessReturn<SchemaType> {
  memories: InputMemory[]
  value: SchemaType
}

export interface TransformMemoryOptions<SchemaType = string> {
  command: string | ((workingMemory: WorkingMemory) => InputMemory)

  processor?: string
  schema?: ZodSchema<SchemaType>
  postProcess?: (originalMemory: WorkingMemory, response: SchemaType) => (Promise<PostProcessReturn<SchemaType>> | PostProcessReturn<SchemaType>)
  streamProcessor?: StreamProcessor
  skipAutoSchemaAddition?: boolean
}

export interface NextOptions {
  stream?: boolean
  signal?: AbortSignal
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

export type InputMemory = Omit<Memory, "_id" | "_timestamp"> & { _id?: string, _timestamp?: number }

export interface WorkingMemoryInitOptions {
  entityName: string
  memories?: InputMemory[]
}

const defaultPostProcessor = <SchemaType = string>(_workingMemory: WorkingMemory, response: SchemaType): { memories: InputMemory[], value: SchemaType } => {
  const memory = {
    role: ChatMessageRoleEnum.Assistant,
    content: (response as any).toString()
  }

  return {
    memories: [memory],
    value: response,
  }
}

export type MemoryListOrWorkingMemory = InputMemory[] | WorkingMemory

export class WorkingMemory extends EventEmitter {
  readonly id
  private _memories: Memory[]

  protected pending?: Promise<void>
  protected pendingResolve?: () => void

  entityName: string
  defaultProcessor = "openai"

  constructor({ entityName, memories }: WorkingMemoryInitOptions) {
    super()
    this.id = nanoid()
    this._memories = this.memoriesFromInputMemories(memories || [])
    this.entityName = entityName
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
      memories: replacementMemories || this._memories
    })
    newMemory.defaultProcessor = this.defaultProcessor
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

  async next<SchemaType>(transformation: TransformMemoryOptions<SchemaType>, opts: { stream: true } & NextOptions): Promise<[WorkingMemory, AsyncIterable<string>, Promise<SchemaType>]>;
  async next<SchemaType>(transformation: TransformMemoryOptions<SchemaType>, opts?: Omit<NextOptions, 'stream'>): Promise<[WorkingMemory, SchemaType]>;
  async next<SchemaType>(transformation: TransformMemoryOptions<SchemaType>, opts: NextOptions = {}) {
    if (this.pending) {
      await this.pending
    }
    const newMemory = this.clone(this.memories)
    newMemory.markPending()
    return newMemory.doTransform<SchemaType>(transformation, opts)
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

  protected async doTransform<SchemaType>(transformation: TransformMemoryOptions<SchemaType>, opts: NextOptions) {
    if (!this.pending) {
      throw new Error("attempting to update working memory not marked as pending")
    }
    try {
      const {
        processor: processorName = this.defaultProcessor,
        postProcess = defaultPostProcessor<SchemaType>,
        command,
        schema,
        skipAutoSchemaAddition,
        streamProcessor,
      } = transformation

      const processor = getProcessor(processorName)

      const commandMemory = typeof command === "string" ? {
        role: ChatMessageRoleEnum.System,
        content: command
      } : command(this)

      if (schema && !skipAutoSchemaAddition) {
        commandMemory.content += codeBlock`
          \n
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
            const { memories, value } = await postProcess(this, await response.parsed)
            this._memories.push(...this.memoriesFromInputMemories(memories))
            this.resolvePending()
            resolve(value)
          } catch (err) {
            reject(err)
          }
        })

        const stream = streamProcessor ? await streamProcessor(this, response.stream) : response.stream
        return [this, stream, valuePromise]
      }

      const { memories, value } = await postProcess(this, await response.parsed)
      this._memories.push(...this.memoriesFromInputMemories(memories))
      
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
