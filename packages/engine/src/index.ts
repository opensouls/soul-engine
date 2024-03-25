/* eslint-disable arrow-body-style */
import { InternalPerception } from '@opensouls/core';
import { DeveloperInteractionRequest, Json, Perception, SoulEnvironment } from '@opensouls/core';
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

// these are added to the global scope when executing in the SOUL ENGINE
// $$ is a convenience method using Mustache to access the soul.env variables.
declare global {
  const soul: {
    __hooks: SoulHooks
    env: Record<string, Json>,
  }
  const $$: (template: string) => string
}

/**
 * @deprecated Use `mentalQuery` from "socialagi" instead.
 */
export { mentalQuery } from "socialagi";

export interface CognitiveEventBase {
  process: MentalProcess<any>
  perception: Omit<InternalPerception, "_id" | "_kind" | "_pending" | "_timestamp" | "internal">
  params?: Json
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
  scheduleEvent: (evt: CognitiveEvent) => void
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

export interface VectorRecordWithSimilarity extends VectorRecord {
  similarity: number
}

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

export interface Blueprint {
  name: string
  entity: string
  context: string
  initialProcess: MentalProcess<any>
  mentalProcesses: MentalProcess<any>[]
  subprocesses?: MentalProcess<any>[]
  defaultEnvironment?: SoulEnvironment
}

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

/**
 * note to open souls devs. If you change this, you need to change engine code
 * to adjust the bundle.
 */
export interface SoulHooks {
  useActions: () => DefaultActions
  useProcessManager: () => {
    invocationCount: number
    setNextProcess: <PropType>(process: MentalProcess<PropType>, props?: PropType) => void
    wait: (ms: number) => Promise<void>
  }
  usePerceptions: () => {
    invokingPerception: Perception | null | undefined,
    pendingPerceptions: {
      current: Perception[],
    },
  },
  useProcessMemory: <T = null>(initialValue: T) => { current: T }
  useSoulStore: () => {
    createEmbedding: (content: string) => Promise<Embedding>
    delete: (key: string) => void
    get: <T = unknown>(key: string, opts?: SoulStoreGetOpts) => (typeof opts extends { includeMetadata: true } ? VectorRecord : T) | undefined
    search: (query: Embedding | string, filter?: VectorMetadata) => Promise<VectorRecordWithSimilarity[]>
    set: (key: string, value: Json, metadata?: VectorMetadata) => void
  },
  useSoulMemory: <T = null>(name: string, initialValue?: T) => { current: T }
  useRag(bucketName?: string): {
    search: (opts: RagSearchOpts) => Promise<VectorRecordWithSimilarity[]>
    withRagContext: <T = any>(step: T, opts?: WithRagContextOpts) => Promise<T>
  }
}

export const defaultRagBucketName = (blueprint: string) => {
  return `__blueprint-rag-${blueprint}`
}

// The ENGINE passes in these global hooks to the soul.

const getHooks = () => {
  if (!(globalThis as any).soul) {
    console.error("oops, no hooks", (globalThis as any).soul)
  }

  return (globalThis as any).soul.__hooks
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
