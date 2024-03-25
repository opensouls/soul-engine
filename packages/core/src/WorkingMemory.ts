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
   *  postCloneTransformation is a hook for library developers who want to shape a working memory or provide hooks or defaults on every return of a new working memory. 
   */
  postCloneTransformation?: (workingMemory: WorkingMemory) => WorkingMemory
}

export type MemoryListOrWorkingMemory = InputMemory[] | WorkingMemory

const defaultPostProcessor = <SchemaType = string>(_workingMemory: WorkingMemory, response: SchemaType): PostProcessReturn<SchemaType> => {
  const memory = {
    role: ChatMessageRoleEnum.Assistant,
    content: (response as any).toString()
  }

  return [memory, response]
}

interface PendingInfo { 
  pending?: Promise<void>
  pendingResolve?: () => void
} 

// this is the weirdest construct but we need to make sure WorkingMemory is *completely* immutable including
// anything that is *internally* mutable (pending, usage, memories). So we use these factories to create closures
// over immutable objects. This way the WorkingMemory is always immutable (the functions do not change), but we can 
// have some state that is mutable within the WorkingMemory itself.
const pendingFactory = (): (() => PendingInfo) => {
  const pending: PendingInfo = {}
  return () => pending
}

// see the pending factory for notes here
const usageFactory = (): (() => UsageNumbers) => {
  const usage: UsageNumbers = {
    model: "",
    input: 0,
    output: 0,
  }
  return () => usage
}

// see the pending factory for notes here
const memoryFactory = (initialMemories?: Memory[]): (() => Memory[]) => {
  const memories: Memory[] = [...initialMemories || []]
  return () => memories
}

export class WorkingMemory extends EventEmitter {
  readonly id
  private _memories: ReturnType<typeof memoryFactory>
  private _usage: ReturnType<typeof usageFactory>
  private _postCloneTransformation: (workingMemory: WorkingMemory) => WorkingMemory

  private _pending: ReturnType<typeof pendingFactory>

  soulName: string
  processor: ProcessorSpecification = Object.freeze({
    name: "openai",
  })

  constructor({ soulName, memories, postCloneTransformation, processor }: WorkingMemoryInitOptions) {
    super()
    this.id = nanoid()
    this._memories = memoryFactory(this.memoriesFromInputMemories(memories || []))
    this.soulName = soulName
    if (processor) {
      this.processor = processor
    }
    this._pending = pendingFactory()
    this._postCloneTransformation = postCloneTransformation || ((workingMemory) => workingMemory)
    this._usage = usageFactory()
  }

  get usage() {
    return { ...this._usage() }
  }

  get memories() {
    return [...this.internalMemories]
  }

  private get internalMemories() {
    return this._memories()
  }

  get finished(): Promise<void> {
    const pendingObj = this._pending()
    if (!pendingObj.pending) {
      return Promise.resolve()
    }
    return pendingObj.pending
  }

  clone(replacementMemories?: InputMemory[]) {
    const newMemory = new WorkingMemory({
      soulName: this.soulName,
      memories: replacementMemories || this.memories,
      postCloneTransformation: this._postCloneTransformation,
      processor: this.processor,
    })
    return this._postCloneTransformation(newMemory)
  }

  map(callback: (memory: Memory, i?: number) => InputMemory) {
    const unfrozenMemories = this.internalMemories.map((memory) => {
      return {
        ...memory
      }
    })
    const newMemories = unfrozenMemories.map(callback)
    return this.clone(newMemories)
  }

  async asyncMap(callback: (memory: Memory, i?: number) => Promise<InputMemory>) {
    const newMemories = await Promise.all(this.internalMemories.map(callback))
    return this.clone(newMemories)
  }

  slice(start: number, end?: number) {
    return this.clone(this.internalMemories.slice(start, end))
  }

  withMemory(memory: InputMemory) {
    return this.concat(this.normalizeMemoryListOrWorkingMemory([memory]))
  }

  filter(callback: (memory: Memory) => boolean) {
    const newMemories = this.internalMemories.filter(callback)
    return this.clone(newMemories)
  }

  some(callback: (memory: Memory) => boolean) {
    return this.internalMemories.some(callback)
  }

  find(callback: (memory: Memory) => boolean) {
    return this.internalMemories.find(callback)
  }

  concat(other: MemoryListOrWorkingMemory) {
    const otherWorkingMemory = this.normalizeMemoryListOrWorkingMemory(other)
    return this.clone(this.internalMemories.concat(otherWorkingMemory.memories))
  }

  prepend(otherWorkingMemory: MemoryListOrWorkingMemory) {
    const otherMemory = this.normalizeMemoryListOrWorkingMemory(otherWorkingMemory)
    return this.clone(otherMemory.memories.concat(this.memories))
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
    await this.finished

    const newMemory = this.clone()
    newMemory.markPending()

    return newMemory.doTransform<SchemaType, PostProcessType>(transformation, opts)
  }

  toString() {
    return indentNicely`
      Working Memory (${this.id}): ${this.soulName}
      Memories:
      ${this.internalMemories.map((memory) => {
        return JSON.stringify(memory)
      }).join("\n")}
    `
  }

  protected markPending() {
    const pendingInfo = this._pending()
    if (pendingInfo.pending) {
      throw new Error("attempting to mark pending a working memory already marked as pending")
    }
    pendingInfo.pending = new Promise((res) => {
      pendingInfo.pendingResolve = res
    })
  }

  protected resolvePending() {
    const pendingInfo = this._pending()

    if (!pendingInfo.pendingResolve) {
      throw new Error('attempting to resolve pending on a memory that is not pending')
    }
    pendingInfo.pendingResolve()
    pendingInfo.pending = undefined
    pendingInfo.pendingResolve = undefined
  }

  protected async doTransform<SchemaType, PostProcessType>(transformation: MemoryTransformationOptions<SchemaType, PostProcessType>, opts: TransformOptions) {
    if (!this._pending().pending) {
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
            this.internalMemories.push(...this.memoriesFromInputMemories([memory]))
            const usageNumbers = await response.usage
            const usageObj = this._usage()
            Object.entries(usageNumbers).forEach(([key, value]) => {
              (usageObj as any)[key] = value
            })
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
      this.internalMemories.push(...this.memoriesFromInputMemories([memory]))
      const usageNumbers = await response.usage

      const usageObj = this._usage()
      Object.entries(usageNumbers).forEach(([key, value]) => {
        (usageObj as any)[key] = value
      })
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
      return {
        ...memory,
        _id: memory._id || nanoid(),
        _timestamp: memory._timestamp || Date.now()
      }
    })
  }

  private normalizeMemoryListOrWorkingMemory(memories: MemoryListOrWorkingMemory) {
    if (memories instanceof WorkingMemory) {
      return memories
    }
    return this.clone(memories)
  }
}
