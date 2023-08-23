import {
  isWithinTokenLimit,
} from './tokens'

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
    const { pipeline } = await import('@xenova/transformers');
    return pipeline('feature-extraction', modelName)
  }

  async createEmbedding (content:string):Promise<Embedding> {
    if (!content) {
      throw new Error("content to createEmbedding is empty!")
    }
    if (!isWithinTokenLimit(content, 512)) {
      console.error("content too long: ", content)
      throw new Error("Content is too long")
    }
    const pipe = await this.pipePromise
    const embedding = await pipe(content.replace(/\n/g, ""), {  pooling: 'mean', normalize: true })
  
    return embedding.tolist()[0]
  }
}
