import { nanoid } from "nanoid"

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

export type InputMemory = Omit<Memory, "_id" | "_timestamp"> & { _id? : string, _timestamp?: number }

export interface WorkingMemoryInitOptions {
  entityName: string
  memories?: InputMemory[]
}

export type MemoryListOrWorkingMemory = InputMemory[] | WorkingMemory

export class WorkingMemory {
  readonly id
  private _memories: Memory[]
  protected _isWorkingMemory = true
  entityName: string
  defaultProcessor = "openai"

  constructor({ entityName, memories }: WorkingMemoryInitOptions) {
    this.id = nanoid()
    this._memories = (memories || []).map((memory) => {
      return Object.freeze({
        ...memory,
        _id: memory._id || nanoid(),
        _timestamp: memory._timestamp || Date.now()
      })
    })
    this.entityName = entityName
  }

  get memories() {
    return this._memories
  }

  map(callback: (memory: Memory) => InputMemory) {
    const newMemories = this._memories.map(callback)
    return new WorkingMemory({
      entityName: this.entityName,
      memories: newMemories
    })
  }

  async asyncMap(callback: (memory: Memory) => Promise<InputMemory>) {
    const newMemories = await Promise.all(this._memories.map(callback))
    return new WorkingMemory({
      entityName: this.entityName,
      memories: newMemories
    })
  }

  withMemories(memories: MemoryListOrWorkingMemory) {
    return this.concat(this.normalizeMemoryListOrWorkingMemory(memories))
  }

  filter(callback: (memory: Memory) => boolean) {
    const newMemories = this._memories.filter(callback)
    return new WorkingMemory({
      entityName: this.entityName,
      memories: newMemories
    })
  }

  some(callback: (memory: Memory) => boolean) {
    return this._memories.some(callback)
  }

  find(callback: (memory: Memory) => boolean) {
    return this._memories.find(callback)
  }

  concat(other: MemoryListOrWorkingMemory) {
    const otherWorkingMemory = this.normalizeMemoryListOrWorkingMemory(other)
    return new WorkingMemory({
      entityName: this.entityName,
      memories: this._memories.concat(otherWorkingMemory._memories)
    })
  }

  prepend(otherWorkingMemory: MemoryListOrWorkingMemory) {
    const otherMemory = this.normalizeMemoryListOrWorkingMemory(otherWorkingMemory)
    return new WorkingMemory({
      entityName: this.entityName,
      memories: otherMemory._memories.concat(this._memories)
    })
  }

  withMonolouge(content: string) {
    return this.concat(new WorkingMemory({
      entityName: this.entityName,
      memories: [
        {
          role: ChatMessageRoleEnum.Assistant,
          content,
        }
      ]
    }))
  }

  private normalizeMemoryListOrWorkingMemory(memories: MemoryListOrWorkingMemory) {
    if (memories instanceof WorkingMemory) {
      return memories
    }
    return new WorkingMemory({
      entityName: this.entityName,
      memories
    })
  }
}
