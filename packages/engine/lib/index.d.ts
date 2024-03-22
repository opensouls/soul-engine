export { ALLOWED_RAG_FILE_EXTENSIONS } from './cli/rag/rag-file-poster.js';
import { MentalProcess, CognitiveEvent, DeveloperInteractionRequest, Json, Perception, SoulEnvironment } from '@opensouls/core';
import { CortexStep } from "socialagi";
import * as core from "@opensouls/core";
export { core };
declare global {
    const soul: {
        __hooks: SoulHooks;
        env: Record<string, Json>;
    };
    const $$: (template: string) => string;
}
/**
 * @deprecated Use `mentalQuery` from "socialagi" instead.
 */
export { mentalQuery } from "socialagi";
export interface DefaultActions {
    expire: () => void;
    log: (...args: any) => void;
    speak: (message: AsyncIterable<string> | string) => void;
    scheduleEvent: (evt: CognitiveEvent) => void;
    dispatch: (evt: DeveloperInteractionRequest) => void;
}
export type VectorMetadata = Record<string, Json>;
export interface VectorRecord {
    key: string;
    content: Json;
    metadata: VectorMetadata;
    embedding?: Embedding;
}
export interface VectorRecordWithSimilarity extends VectorRecord {
    similarity: number;
}
export interface RagIngestionBody {
    rootKey: string;
    content: string;
    contentType?: string;
    maxTokens?: number;
    metadata?: VectorMetadata;
}
export interface WithRagContextOpts {
}
export interface SoulStoreGetOpts {
    includeMetadata?: boolean;
}
export type Embedding = number[];
export interface Blueprint {
    name: string;
    entity: string;
    context: string;
    initialProcess: MentalProcess<any>;
    mentalProcesses: MentalProcess<any>[];
    subprocesses?: MentalProcess<any>[];
    defaultEnvironment?: SoulEnvironment;
}
export interface RagConfigfile {
    bucket: string;
}
export interface SoulConfig {
    soul: string;
    path?: string;
    paths?: string[];
}
export interface RagSearchOpts {
    query: Embedding | string;
    limit?: number;
    maxDistance?: number;
    bucketName?: string;
}
/**
 * note to open souls devs. If you change this, you need to change engine code
 * to adjust the bundle.
 */
export interface SoulHooks {
    useActions: () => DefaultActions;
    useProcessManager: () => {
        invocationCount: number;
        setNextProcess: <PropType>(process: MentalProcess<PropType>, props?: PropType) => void;
        wait: (ms: number) => Promise<void>;
    };
    usePerceptions: () => {
        invokingPerception: Perception | null | undefined;
        pendingPerceptions: {
            current: Perception[];
        };
    };
    useProcessMemory: <T = null>(initialValue: T) => {
        current: T;
    };
    useSoulStore: () => {
        createEmbedding: (content: string) => Promise<Embedding>;
        delete: (key: string) => void;
        get: <T = unknown>(key: string, opts?: SoulStoreGetOpts) => (typeof opts extends {
            includeMetadata: true;
        } ? VectorRecord : T) | undefined;
        search: (query: Embedding | string, filter?: VectorMetadata) => Promise<VectorRecordWithSimilarity[]>;
        set: (key: string, value: Json, metadata?: VectorMetadata) => void;
    };
    useSoulMemory: <T = null>(name: string, initialValue?: T) => {
        current: T;
    };
    useRag(bucketName?: string): {
        search: (opts: RagSearchOpts) => Promise<VectorRecordWithSimilarity[]>;
        withRagContext: <T>(step: CortexStep<T>, opts?: WithRagContextOpts) => Promise<CortexStep<T>>;
    };
}
export declare const defaultRagBucketName: (blueprint: string) => string;
export declare const useActions: SoulHooks["useActions"];
export declare const useProcessManager: SoulHooks["useProcessManager"];
export declare const usePerceptions: SoulHooks["usePerceptions"];
export declare const useProcessMemory: SoulHooks["useProcessMemory"];
export declare const useSoulStore: SoulHooks["useSoulStore"];
export declare const useSoulMemory: SoulHooks["useSoulMemory"];
export declare const useRag: (bucketName?: string) => any;
