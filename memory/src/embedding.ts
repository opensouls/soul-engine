import { trace } from '@opentelemetry/api';
import {
  isWithinTokenLimit,
} from './tokens'

const tracer = trace.getTracer(
  'open-souls-memory-embedding',
  '0.0.1',
);

export type Embedding = number[]

export interface Embedder {
  createEmbedding(content:string):Promise<Embedding>
}

export class HuggingFaceEmbedder implements Embedder {

  pipePromise:Promise<any>

  constructor(modelName = "Supabase/gte-small") {
    this.pipePromise = this.setupPipeline(modelName)
  }

  private async setupPipeline(modelName:string) {
    /*
    just noting for future explorers that we do a dynamic import because transformers.js is an ESM module,
    and this repo is not yet and so doing the import at the top pollutes
    this repo turning it into an ESM repo... super annoying and the whole industry
    is dealing with this problem now as we transition into ESM.
    */
    const { pipeline } = await import('@xenova/transformers');
    return pipeline('feature-extraction', modelName)
  }

  async createEmbedding (content:string):Promise<Embedding> {
    return tracer.startActiveSpan('createEmbedding', async (span) => {
      try {
        if (!content) {
          throw new Error("content to createEmbedding is empty!")
        }
        if (!isWithinTokenLimit(content, 512)) {
          console.error("content too long: ", content)
          throw new Error("Content is too long")
        }
        const pipe = await this.pipePromise
        const embedding = await pipe(content.replace(/\n/g, ""), {  pooling: 'mean', normalize: true })
      
        span.end()
        return embedding.tolist()[0]
      } catch (err:any) {
        span.recordException(err)
        span.end()
        throw err
      }
    })

  }
}

let memoizedEmbedder: HuggingFaceEmbedder | null = null;

export function getDefaultEmbedder(): HuggingFaceEmbedder {
  if (!memoizedEmbedder) {
    memoizedEmbedder = new HuggingFaceEmbedder();
  }
  return memoizedEmbedder;
}

/*
  This is a null embedder that just returns an empty array.
  It's useful for when you are never going to search memory, but only want to 
  store and retrieve recent memories.
*/
export const nullEmbedder:Embedder = {
  createEmbedding: (_content:string) => {
    return Promise.resolve([])
  }
}
