import { nanoid } from "nanoid"
import type { ZodSchema } from "zod"
import { EventEmitter } from "eventemitter3"
import { getProcessor } from "./processors/registry.js"
import { zodToJsonSchema } from "zod-to-json-schema"
import type { UsageNumbers } from "./processors/Processor.js"
import type { MemoryTransformationOptions, PostProcessReturn, TransformOptions, TransformReturnNonStreaming, TransformReturnStreaming } from "./cognitiveStep.js"
import { indentNicely } from "./utils.js"
import { ChatMessageRoleEnum, InputMemory, Memory } from "./Memory.js"

/**
 * This file defines the structure and operations on working memory within the OPEN SOULS soul-engine.
 * Additionally, it provides interfaces for processor specifications and the handling of memory transformations and cognitive steps.
 * WorkingMemory is crucial for managing the state and interactions within the soul-engine, facilitating the processing and transformation of memory items.
 * See cognitiveStep.ts for more information on cognitive steps and memory transformations.
 */

export interface ProcessorSpecification {
  name: string,
  options?: Record<string, any>
}

export interface WorkingMemoryInitOptions {
  soulName: string
  memories?: InputMemory[]
  processor?: ProcessorSpecification
  /*
   *  postProcess is a hook for library developers who want to shape a working memory or provide hooks or defaults on every return of a new working memory. 
   */
  postProcess?: (workingMemory: WorkingMemory) => WorkingMemory
}

export type MemoryListOrWorkingMemory = InputMemory[] | WorkingMemory

const defaultPostProcessor = <SchemaType = string>(_workingMemory: WorkingMemory, response: SchemaType): PostProcessReturn<SchemaType> => {
  const memory = {
    role: ChatMessageRoleEnum.Assistant,
    content: (response as any).toString()
  }

  return [memory, response]
}

export class WorkingMemory extends EventEmitter {
  readonly id
  private _memories: Memory[]

  private _usage: UsageNumbers

  protected pending?: Promise<void>
  protected pendingResolve?: () => void

  protected lastValue?: any

  private postProcess: (workingMemory: WorkingMemory) => WorkingMemory

  soulName: string
  processor: ProcessorSpecification = Object.freeze({
    name: "openai",
  })

  constructor({ soulName, memories, postProcess, processor }: WorkingMemoryInitOptions) {
    super()
    this.id = nanoid()
    this._memories = this.memoriesFromInputMemories(memories || [])
    this.soulName = soulName
    if (processor) {
      this.processor = processor
    }
    this.postProcess = postProcess || ((workingMemory) => workingMemory)
    this._usage = {
      model: "",
      input: 0,
      output: 0,
    }
  }

  get usage() {
    return { ...this._usage }
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

  clone(replacementMemories?: InputMemory[]) {
    const newMemory = new WorkingMemory({
      soulName: this.soulName,
      memories: replacementMemories || this._memories,
      postProcess: this.postProcess,
      processor: this.processor,
    })
    return this.postProcess(newMemory)
  }

  map(callback: (memory: Memory) => InputMemory) {
    const newMemories = this._memories.map(callback)
    return this.clone(newMemories)
  }

  async asyncMap(callback: (memory: Memory) => Promise<InputMemory>) {
    const newMemories = await Promise.all(this._memories.map(callback))
    return this.clone(newMemories)
  }

  slice(start: number, end?: number) {
    return this.clone(this._memories.slice(start, end))
  }

  withMemory(memory: InputMemory) {
    return this.concat(this.normalizeMemoryListOrWorkingMemory([memory]))
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

  withMonologue(content: string) {
    return this.withMemory({
      role: ChatMessageRoleEnum.Assistant,
      content,
    })
  }

  async transform<SchemaType, PostProcessType>(transformation: MemoryTransformationOptions<SchemaType, PostProcessType>, opts: { stream: true } & TransformOptions): Promise<TransformReturnStreaming<PostProcessType>>;
  async transform<SchemaType, PostProcessType>(transformation: MemoryTransformationOptions<SchemaType, PostProcessType>, opts?: Omit<TransformOptions, 'stream'>): Promise<TransformReturnNonStreaming<PostProcessType>>;
  async transform<SchemaType, PostProcessType>(transformation: MemoryTransformationOptions<SchemaType, PostProcessType>, opts?: { stream: false } & Omit<TransformOptions, 'stream'>): Promise<TransformReturnNonStreaming<PostProcessType>>;
  async transform<SchemaType, PostProcessType>(transformation: MemoryTransformationOptions<SchemaType, PostProcessType>, opts: TransformOptions = {}) {
    if (this.pending) {
      await this.pending
    }
    const newMemory = this.clone()
    newMemory.markPending()

    return newMemory.doTransform<SchemaType, PostProcessType>(transformation, opts)
  }

  toString() {
    return indentNicely`
      Working Memory (${this.id}): ${this.soulName}
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
        commandMemory.content += "\n\n" + indentNicely`
          Respond *only* in JSON, conforming to the following JSON schema:
          ${JSON.stringify(zodToJsonSchema(schema), null, 2)}
        `
      }

      const memoryWithCommand = this.withMemory(commandMemory)

      const response = await processor.process<SchemaType>({
        memory: memoryWithCommand,
        schema: (schema as ZodSchema<SchemaType>),
        ...opts,
      })

      if (opts.stream) {
        const valuePromise = new Promise(async (resolve, reject) => {
          try {
            const [memory, value] = await postProcess(this, await response.parsed)
            this._memories.push(...this.memoriesFromInputMemories([memory]))
            this.lastValue = value
            this._usage = await response.usage
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
      this._usage = await response.usage
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
