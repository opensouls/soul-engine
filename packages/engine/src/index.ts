/* eslint-disable arrow-body-style */
import { InternalPerception, WorkingMemory } from '@opensouls/core';
import { DeveloperInteractionRequest, Json, Perception } from '@opensouls/core';
import { MentalProcess } from './mentalProcess.js'

export * from "./mentalProcess.js"
export * from "@opensouls/core"
export * from "@opensouls/soul"

export const ALLOWED_RAG_FILE_EXTENSIONS = [
  ".js",
  ".ts",
  ".mdx",
  ".md",
  ".txt",
  ".json",
  ".yml",
  ".xml",
  ".html",
  ".tsx",
  ".jsx",
  ".py",
]

export interface CognitiveEventBase {
  process: MentalProcess<any>
  perception: Omit<InternalPerception, "_id" | "_kind" | "_pending" | "_timestamp" | "internal">
  params?: Json
}

export interface PendingCognitiveEvent extends CognitiveEventAbsolute {
  id: string
}

export interface CognitiveEventAbsolute extends CognitiveEventBase {
  when: Date
}

export interface CognitiveEventOffset extends CognitiveEventBase {
  in: number // seconds from now
}

export type CognitiveEvent = CognitiveEventAbsolute | CognitiveEventOffset


export interface DefaultActions {
  /*
    * expire will end the current Soul and the soul will stop processing perceptions
    */
  expire: () => void
  log: (...args: any) => void
  speak: (message: AsyncIterable<string>|string) => void
  /**
   * Schedules a CognitiveEvent to dispatch in the future,
   * returns an eventId that can be used to cancel the scheduled event.
   */
  scheduleEvent: (evt: CognitiveEvent) => Promise<string>
  dispatch: (evt: DeveloperInteractionRequest) => void
}

/* begin vectordb */

export type VectorMetadata = Record<string, Json>

export interface VectorRecord {
  key: string
  content: Json
  metadata: VectorMetadata
  embedding?: Embedding
}

export interface VectorRecordWithDistance extends VectorRecord {
  distance: number
  similarity: number
}

/**
 * @deprecated use VectorRecordWithDistance instead
 */
export type VectorRecordWithSimilarity = VectorRecordWithDistance

/* end vectordb */

export interface RagIngestionBody {
  rootKey: string
  content: string // base64 encoded binary data
  contentType?: string
  maxTokens?: number
  metadata?: VectorMetadata
}

export interface WithRagContextOpts {
  // currently no opts
}

export interface SoulStoreGetOpts {
  includeMetadata?: boolean
}

export type Embedding = number[]

export type PerceptionProcessorReturnTypes<PropType = any> = undefined | [WorkingMemory] | [WorkingMemory, MentalProcess<PropType>] | [WorkingMemory, MentalProcess<PropType>, PropType]

export type PerceptionProcessor = <PropType>(perceptionArgs: {
  perception: Perception,
  currentProcess: MentalProcess<any>,
  workingMemory: WorkingMemory,
}) => Promise<PerceptionProcessorReturnTypes<PropType>>

export interface RagConfigfile {
  bucket: string
}

export interface SoulConfig {
  soul: string,
  path?: string,
  paths?: string[],
}

export interface RagSearchOpts {
  query: Embedding | string
  limit?: number
  maxDistance?: number
  bucketName?: string
}

export interface VectorStorSearchOpts {
  filter?: VectorMetadata
  resultLimit?: number
  maxDistance?: number
  minSimilarity?: number
  model?: string
}

export interface VectorStoreHook {
  createEmbedding: (content: string, model?: string) => Promise<Embedding>
  delete: (key: string) => void
  fetch: <T = unknown>(key: string, opts?: SoulStoreGetOpts) => Promise<(typeof opts extends { includeMetadata: true } ? VectorRecord : T) | undefined>
  search: (query: Embedding | string, opts?: VectorStorSearchOpts) => Promise<VectorRecordWithDistance[]>
  set: (key: string, value: Json, metadata?: VectorMetadata, model?: string) => void
}

export interface SoulVectorStoreHook extends Omit<VectorStoreHook, "get"> {
  /**
   * @deprecated use fetch instead
   */
  get: <T = unknown>(key: string, opts?: SoulStoreGetOpts) => (typeof opts extends { includeMetadata: true } ? VectorRecord : T) | undefined
}

/**
 * note to open souls devs. If you change this, you need to change engine code
 * to adjust the bundle.
 */
export interface SoulHooks {
  useActions: () => DefaultActions
  useProcessManager: () => {
    invocationCount: number
    /**
     * @deprecated use the return from a MentalProcess instead.
     */
    setNextProcess: <PropType>(process: MentalProcess<PropType>, props?: PropType) => void
    wait: (ms: number) => Promise<void>
    previousMentalProcess?: MentalProcess<any>
    /**
     * cancelScheduledEvent takes the eventId returned by scheduleEvent and cancels the event.
     */
    cancelScheduledEvent: (eventId: string) => Promise<void>
    /**
     * list of all pending scheduled events, reactively updated.
     * note the `.current` property is a reference to the current value.
     * Developers should not mutate this object.
     */
    pendingScheduledEvents: { current: PendingCognitiveEvent[] }
  }
  usePerceptions: () => {
    invokingPerception: Perception | null | undefined,
    pendingPerceptions: {
      current: Perception[],
    },
  },
  useProcessMemory: <T = null>(initialValue: T) => { current: T }
  useSoulStore: () => SoulVectorStoreHook,
  useBlueprintStore: (bucketName?: string) => VectorStoreHook,
  useOrganizationStore: (bucketName?: string) => VectorStoreHook,
  useSoulMemory: <T = null>(name: string, initialValue?: T) => { current: T }
  useRag(bucketName?: string): {
    search: (opts: RagSearchOpts) => Promise<VectorRecordWithDistance[]>
    withRagContext: <T = any>(step: T, opts?: WithRagContextOpts) => Promise<T>
  }
  useTool<ParamType = Json | void, ResponseType = Json>(name: string): (params?: ParamType) => Promise<ResponseType>
}

export const defaultRagBucketName = (blueprint: string) => {
  return `__blueprint-rag-${blueprint}`
}

// The ENGINE passes in these global hooks to the soul.

const getHooks = () => {
  if (!(globalThis as any).soul) {
    console.error("oops, no hooks", (globalThis as any).soul)
  }

  return (globalThis as any).soul.__hooks as SoulHooks | undefined
}

export const useActions: SoulHooks["useActions"] = () => {
  const hooks = getHooks()
  if (!hooks) throw new Error("useActions called when no hooks are available. Are you executing this code on the SOUL ENGINE?")
  return hooks.useActions()
}

export const useProcessManager: SoulHooks["useProcessManager"] = () => {
  const hooks = getHooks()
  if (!hooks) throw new Error("useActions called when no hooks are available. Are you executing this code on the SOUL ENGINE?")
  return hooks.useProcessManager()
}

export const usePerceptions: SoulHooks["usePerceptions"] = () => {
  const hooks = getHooks()
  if (!hooks) throw new Error("usePerceptions called when no hooks are available. Are you executing this code on the SOUL ENGINE?")
  return hooks.usePerceptions()
}

export const useProcessMemory: SoulHooks["useProcessMemory"] = (initialValue) => {
  const hooks = getHooks()
  if (!hooks) throw new Error("useProcessMemory called when no hooks are available. Are you executing this code on the SOUL ENGINE?")
  return hooks.useProcessMemory(initialValue)
}

export const useSoulStore: SoulHooks["useSoulStore"] = () => {
  const hooks = getHooks()
  if (!hooks) throw new Error("useSoulStore called when no hooks are available. Are you executing this code on the SOUL ENGINE?")
  return hooks.useSoulStore()
}

export const useBlueprintStore: SoulHooks["useBlueprintStore"] = (bucketName?: string) => {
  const hooks = getHooks()
  if (!hooks) throw new Error("useBlueprintStore called when no hooks are available. Are you executing this code on the SOUL ENGINE?")
  return hooks.useBlueprintStore(bucketName)
}

export const useOrganizationStore: SoulHooks["useOrganizationStore"] = (bucketName?: string) => {
  const hooks = getHooks()
  if (!hooks) throw new Error("useOrganizationStore called when no hooks are available. Are you executing this code on the SOUL ENGINE?")
  return hooks.useOrganizationStore(bucketName)
}

export const useSoulMemory: SoulHooks["useSoulMemory"] = (name, initialValue) => {
  const hooks = getHooks()
  if (!hooks) throw new Error("useSoulMemory called when no hooks are available. Are you executing this code on the SOUL ENGINE?")
  return hooks.useSoulMemory(name, initialValue)
}

export const useRag = (bucketName?: string) => {
  const hooks = getHooks()
  if (!hooks) throw new Error("useRag called when no hooks are available. Are you executing this code on the SOUL ENGINE?")
  return hooks.useRag(bucketName)
}

export const useTool = <ParamType = Json, ResponseType = Json>(toolName: string) => {
  const hooks = getHooks()
  if (!hooks) throw new Error("useTool called when no hooks are available. Are you executing this code on the SOUL ENGINE?")
  return hooks.useTool<ParamType, ResponseType>(toolName)
}
