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

  /**
   * Gets the usage information of input/output tokens for the current WorkingMemory instance.
   * This information is only available once the WorkingMemory is no longer pending and after a transformation has been performed.
   * 
   * @returns An object containing the model name, and the number of input and output tokens used.
   * 
   * @example
   * ```
   * const usageInfo = workingMemory.usage;
   * console.log(`Model: ${usageInfo.model}, Input Tokens: ${usageInfo.input}, Output Tokens: ${usageInfo.output}`);
   * ```
   */
  get usage() {
    return { ...this._usage() }
  }

  /**
   * The `memories` attribute returns a copy of the memories currently stored in the WorkingMemory instance.
   * 
   * @returns An array containing the memories of the WorkingMemory instance.
   * 
   * @example
   * ```
   * const memories = workingMemory.memories;
   * console.log(memories); // Outputs an array of Memory objects.
   * ```
   */
  get memories() {
    return [...this.internalMemories]
  }

  /**
   * The `length` attribute returns the number of memories currently stored in the WorkingMemory instance.
  * 
   * @returns The total number of memories.
   * 
   * @example
   * ```
   * const workingMemory = new WorkingMemory({ soulName: 'example' });
   * console.log(workingMemory.length); // Outputs 0 (no memories there)
   * ```
   */
  get length() {
    return this.internalMemories.length
  }

  private get internalMemories() {
    return this._memories()
  }

  /**
   * Retrieves a memory at a specified index from the internal memories array.
   * 
   * @param index - The zero-based index of the memory to retrieve.
   * @returns The memory object at the specified index, or undefined if the index is out of bounds.
   * 
   * @example
   * ```
   * const memoryAtIndex = workingMemory.at(1);
   * if (memoryAtIndex) {
   *   console.log(`Memory at index 1:`, memoryAtIndex);
   * } else {
   *   console.log(`No memory found at index 1.`);
   * }
   * ```
   */
  at(index: number) {
    return this.internalMemories[index]
  }

  /**
   * The `finished` attribute returns a promise which resolves once the current pending transformation using a CognitiveStep is complete.
   * This is a fairly low level API and most users will not need to worry about this, since working memory uses this attribute internally and
   * the soul-engine does as well.
   * 
   * Only streaming cognitive functions will result in WorkingMemory with pending transformations.
   * 
   * @returns A promise that resolves once the current pending transformation is finished.
   * 
   * @example
   * ```
   * const [workingMemory, stream] = await cognitiveStep(workingMemory, userArgs, { stream: true });
   * await workingMemory.finished;
   * console.log('Transformation complete.');
   * ```
   * 
   * @example
   * ```
   * [workingMemory, stream] = await cognitiveStep(workingMemory, userArgs, { stream: true });
   * // even though we are not awaiting workingMemory.finished it's ok and will be automatically awaited.
   * [workingMemory] = await cognitiveStep(workingMemory, userArgs);
   * // all transformations are complete here.
   * ```
   */
  get finished(): Promise<void> {
    const pendingObj = this._pending()
    if (!pendingObj.pending) {
      return Promise.resolve()
    }
    return pendingObj.pending
  }

  /**
   * Creates a clone of the current WorkingMemory instance, optionally replacing its memories with new ones.
   * 
   * @param replacementMemories - An optional array of InputMemory objects to replace the current memories in the clone.
   *                              If not provided, the clone will retain the original memories.
   * @returns A new WorkingMemory instance, with optionally replaced memories.
   * 
   * @example
   * ```
   * const originalMemory = new WorkingMemory({ soulName: "ExampleSoul", memories: [{...memory}] });
   * const clonedMemory = originalMemory.clone([optionalNewMemories]);
   * ```
   */
  clone(replacementMemories?: InputMemory[]) {
    const newMemory = new WorkingMemory({
      soulName: this.soulName,
      memories: replacementMemories || this.memories,
      postCloneTransformation: this._postCloneTransformation,
      processor: this.processor,
    })
    return this._postCloneTransformation(newMemory)
  }

  /**
   * Replaces the current memories in the WorkingMemory instance with new ones provided by the caller.
   * This method is nearly an alias of the `clone` method, with the key difference being that `replacementMemories` are required.
   * 
   * @param replacementMemories - An array of InputMemory objects to replace the current memories.
   * @returns A new WorkingMemory instance, with the memories replaced by the provided ones.
   * 
   * @example
   * ```
   * const newMemories = [{...}, {...}];
   * const updatedMemory = workingMemory.replace(newMemories);
   * ```
   */
  replace(replacementMemories: InputMemory[]) {
    return this.clone(replacementMemories)
  }

  /**
   * Applies a provided function to each memory in the WorkingMemory instance, producing a new WorkingMemory instance.
   * This method behaves similarly to the Array.prototype.map function, with the key difference being that it returns
   * a new immutable WorkingMemory instance containing the transformed memories, rather than an array of the transformed items.
   * 
   * @param callback - A function that accepts up to two arguments. The map method calls the callback function one time for each memory in the WorkingMemory.
   * @returns A new WorkingMemory instance with each memory transformed by the callback function.
   * 
   * @example
   * ```
   * const newWorkingMemory = workingMemory.map((memory, index) => {
   *   // Transform the memory here
   *   return transformedMemory;
   * });
   * ```
   */
  map(callback: (memory: Memory, i?: number) => InputMemory) {
    const unfrozenMemories = this.memories.map((memory) => {
      return {
        ...memory
      }
    })
    const newMemories = unfrozenMemories.map(callback)
    return this.clone(newMemories)
  }

  /**
   * Applies a provided asynchronous function to each memory in the WorkingMemory instance, producing a new WorkingMemory instance.
   * This method is similar to the `map` method but allows for asynchronous transformations of each memory. It returns
   * a new immutable WorkingMemory instance containing the transformed memories, rather than an array of the transformed items.
   * 
   * @param callback - An asynchronous function that accepts a memory and optional index (number). The asyncMap method calls the callback function one time for each memory in the WorkingMemory.
   *                   This function should return a Promise that resolves to the transformed memory.
   * @returns A Promise that resolves to a new WorkingMemory instance with each memory transformed by the asynchronous callback function.
   * 
   * @example
   * ```
   * const newWorkingMemory = await workingMemory.asyncMap(async (memory, index) => {
   *   // Asynchronously transform the memory here
   *   return await transformMemoryAsync(memory);
   * });
   * ```
   */
  async asyncMap(callback: (memory: Memory, i?: number) => Promise<InputMemory>) {
    const newMemories = await Promise.all(this.memories.map(callback))
    return this.clone(newMemories)
  }

  /**
   * Returns a new WorkingMemory object with the memories sliced from `start` to `end` (`end` not included)
   * where `start` and `end` represent the index of items in the WorkingMemory's internal memory array. It behaves similarly to the `slice()` method of JavaScript arrays.
   * 
   * @param start - Zero-based index at which to start extraction. A negative index can be used, indicating an offset from the end of the sequence.
   * @param end - Zero-based index before which to end extraction. `slice` extracts up to but not including `end`. A negative index can be used, indicating an offset from the end of the sequence.
   * @returns A new WorkingMemory instance containing the extracted memories.
   * 
   * @example
   * ```
   * const slicedWorkingMemory = workingMemory.slice(1, 3);
   * ```
   */
  slice(start: number, end?: number) {
    return this.clone(this.internalMemories.slice(start, end))
  }

  /**
   /**
   * Changes the content of the WorkingMemory instance by removing existing memories and/or adding new memories, producing a new WorkingMemory instance.
   * This method behaves similarly to the `splice()` method of JavaScript arrays.
   * 
   * @param start - Zero-based index at which to start changing the memory array. If greater than the length of the memory array, actual starting index will be set to the length of the array. If negative, will begin that many elements from the end.
   * @param deleteCount - An integer indicating the number of old memory elements to remove. If deleteCount is 0 or negative, no memories are removed.
   * @param items - The elements to add to the memory array, beginning from the start index. If you don't specify any elements, splice() will only remove elements from the array.
   * @returns A new WorkingMemory instance with the spliced memories.
   * 
   * @example
   * ```
   * const newMemory1 = { role: ChatMessageRoleEnum.User, content: "Hello, world!" };
   * const newMemory2 = { role: ChatMessageRoleEnum.User, content: "How are you?" };
   * const newWorkingMemory = workingMemory.splice(1, 2, newMemory1, newMemory2);
   * ```
   */
  splice(start: number, deleteCount: number, ...items: InputMemory[]) {
    const newMemories = [...this.internalMemories]
    newMemories.splice(start, deleteCount, ...this.clone(items).memories)
    return this.clone(newMemories)
  }

  /**
   * Adds a single memory to the current set of memories in the WorkingMemory instance, producing a new WorkingMemory instance.
   * 
   * @param memory - The memory to add to the WorkingMemory.
   * @returns A new WorkingMemory instance with the added memory.
   * 
   * @example
   * ```
   * const newMemory = { role: ChatMessageRoleEnum.User, content: "Hello, world!" };
   * const newWorkingMemory = workingMemory.withMemory(newMemory);
   * ```
   */
  withMemory(memory: InputMemory) {
    return this.concat(this.normalizeMemoryListOrWorkingMemory([memory]))
  }

  /**
   * Set (add or replace) a region in the memory with the provided new memories. If the region does not exist, it will be created and added to the top of the memories.
   * This function (like other WorkingMemory functions) is immutable and returns a new WorkingMemory instance with the updated Memory[].
   * 
   * @param regionName - The name of the region where the memories will be set.
   * @param memories - The memories to add to the specified region in the WorkingMemory.
   * @returns A new WorkingMemory instance with the memories in the specified region.
   * 
   * @example
   * ```
   * const newMemory1 = { role: ChatMessageRoleEnum.User, content: "Hello, world!" };
   * const newMemory2 = { role: ChatMessageRoleEnum.User, content: "How are you?" };
   * const newWorkingMemory = workingMemory.withRegion("greetings", newMemory1, newMemory2);
   * ```
   */
  withRegion(regionName: string, ...memories: InputMemory[]) {
    const memoriesWithRegion = this.normalizeMemoryListOrWorkingMemory(memories.map((memory) => {
      return {
        ...memory,
        region: regionName
      }
    }))
    // first we'll find where this region should go
    const startIndex = this.regionalIndex(regionName)
    if (startIndex === -1) {
      return this.prepend(memoriesWithRegion)
    }

    const withoutRegion = this.withoutRegion(regionName)

    return this.clone(
      this.internalMemories
        .slice(0, startIndex)
        .concat(memoriesWithRegion.memories)
        .concat(withoutRegion.slice(startIndex).memories)
    )
    // otherwise we splice it
  }

  orderRegions(...regionOrder: string[]) {
    // First, we will extract and remove the memories of the specified regions
    const memoriesByRegion: { [key: string]: Memory[] } = {};
    const remainingMemories: Memory[] = [];

    this.internalMemories.forEach(memory => {
      const region = memory.region || "default";
      if (regionOrder.includes(region)) {
        if (!memoriesByRegion[region]) {
          memoriesByRegion[region] = [];
        }
        memoriesByRegion[region].push(memory);
      } else {
        remainingMemories.push(memory);
      }
    });

    // Now, we will concatenate the memories back in the specified order
    const orderedMemories: Memory[] = [];
    regionOrder.forEach(region => {
      if (memoriesByRegion[region]) {
        orderedMemories.push(...memoriesByRegion[region]);
      }
    });

    // Finally, we return a new WorkingMemory instance with the ordered memories
    return this.clone(orderedMemories.concat(remainingMemories));
  }

  private withoutRegion(regionName: string) {
    return this.filter((memory) => {
      return memory.region !== regionName
    })
  }

  private regionalIndex(regionName: string) {
    return this.memories.findIndex((memory) => {
      return memory.region === regionName
    })
  }

  /**
   * Filters the memories in the WorkingMemory instance using the provided callback, similar to Array.prototype.filter.
   * This method creates a new WorkingMemory instance with all memories that pass the test implemented by the provided function.
   * 
   * @param callback - A function that accepts a memory and returns a boolean. If it returns true, the memory is included in the new WorkingMemory instance.
   * @returns A new WorkingMemory instance with the filtered memories.
   */
  filter(callback: (memory: Memory, i?: number) => boolean) {
    const newMemories = this.memories.filter(callback)
    return this.clone(newMemories)
  }

  /**
   * Tests whether at least one memory in the WorkingMemory instance passes the test implemented by the provided callback, similar to Array.prototype.some.
   * This method does not modify the WorkingMemory instance.
   * 
   * @param callback - A function that accepts a memory and returns a boolean.
   * @returns A boolean indicating whether at least one memory passes the test.
   */
  some(callback: (memory: Memory) => boolean) {
    return this.internalMemories.some(callback)
  }

  /**
   * Finds the first memory in the WorkingMemory instance that satisfies the provided testing function, similar to Array.prototype.find.
   * 
   * @param callback - A function that accepts a memory and returns a boolean. If it returns true, the memory is returned from the method.
   * @returns The first memory that satisfies the provided testing function, or undefined if no such memory is found.
   */
  find(callback: (memory: Memory) => boolean) {
    const mem = this.memories.find(callback)
    if (!mem) {
      return mem
    }
    return { ...mem }
  }

  /**
   * Concatenates the memories of another WorkingMemory (or an array of Memory objects) to the memories of the current WorkingMemory instance, similar to Array.prototype.concat.
   * This method creates a new WorkingMemory instance with the concatenated memories.
   * 
   * @param other - Another WorkingMemory (or an array of Memory innstances) to be concatenate with the current instance.
   * @returns A new WorkingMemory instance with the concatenated memories.
   */
  concat(other: MemoryListOrWorkingMemory) {
    const otherWorkingMemory = this.normalizeMemoryListOrWorkingMemory(other)
    return this.clone(this.internalMemories.concat(otherWorkingMemory.memories))
  }

  /**
   * Prepends the memories the memories of another WorkingMemory (or an array of Memory objects) to the memories of the current WorkingMemory instance,
   * This method creates a new WorkingMemory instance with the memories of the other instance followed by the current instance's memories, similar to using WorkingMemory#concat in reverse.
   * 
   * @param otherWorkingMemory - Another MemoryListOrWorkingMemory instance whose memories are to be prepended to the current instance.
   * @returns A new WorkingMemory instance with the prepended memories.
   */
  prepend(otherWorkingMemory: MemoryListOrWorkingMemory) {
    const otherMemory = this.normalizeMemoryListOrWorkingMemory(otherWorkingMemory)
    return this.clone(otherMemory.memories.concat(this.memories))
  }

  /**
   * Adds a monologue memory with the role of Assistant and the provided content to the WorkingMemory instance.
   * This method creates a new WorkingMemory instance with the added monologue memory.
   * 
   * @param content - The content of the monologue memory to add.
   * @returns A new WorkingMemory instance with the added monologue memory.
   */
  withMonologue(content: string) {
    return this.withMemory({
      role: ChatMessageRoleEnum.Assistant,
      content,
    })
  }

  /**
   * Transforms the WorkingMemory using a specified processor and returns a new WorkingMemory instance along with the results of the transformation.
   * This function is a low-level API that is rarely used directly by users. Instead, users typically interact with CognitiveSteps defined in ./cognitiveStep.
   * The transformation can operate in two modes, determined by the `stream` option in the `opts` parameter:
   * - If `stream: true` is passed, the function returns a stream of transformed data.
   * - Otherwise, it returns a single transformed result.
   * 
   * @param transformation - The transformation options to apply, including the processor to use.
   * @param opts - Options for the transformation, including whether to use streaming.
   * @returns A Promise resolving to a new WorkingMemory instance and the results of the transformation. The nature of the results depends on the `stream` option.
   */
  async transform<SchemaType, PostProcessType>(transformation: MemoryTransformationOptions<SchemaType, PostProcessType>, opts: { stream: true } & TransformOptions): Promise<TransformReturnStreaming<PostProcessType>>;
  async transform<SchemaType, PostProcessType>(transformation: MemoryTransformationOptions<SchemaType, PostProcessType>, opts?: Omit<TransformOptions, 'stream'>): Promise<TransformReturnNonStreaming<PostProcessType>>;
  async transform<SchemaType, PostProcessType>(transformation: MemoryTransformationOptions<SchemaType, PostProcessType>, opts?: { stream: false } & Omit<TransformOptions, 'stream'>): Promise<TransformReturnNonStreaming<PostProcessType>>;
  async transform<SchemaType, PostProcessType>(transformation: MemoryTransformationOptions<SchemaType, PostProcessType>, opts: TransformOptions = {}) {
    await this.finished

    const newMemory = this.clone()
    newMemory.markPending()

    return newMemory.doTransform<SchemaType, PostProcessType>(transformation, opts)
  }

  /**
   * Returns a string representation of the internal memories of the WorkingMemory instance.
   * This method formats the internal memories into a readable string, showcasing each memory in a JSON stringified format.
   * 
   * @returns A string that represents the internal memories of the WorkingMemory instance.
   */
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
            resolve(value)
          } catch (err) {
            reject(err)
          } finally {
            this.resolvePending()
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
