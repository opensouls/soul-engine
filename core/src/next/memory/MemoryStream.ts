import { Embedder, Embedding, HuggingFaceEmbedder } from "../embedding";
import { createHash } from 'crypto';

export function hashString(input:string) {
  const hash = createHash('sha256');
  hash.update(input);
  return hash.digest('hex');
}

interface Memory {
  id: string;
  content: string;
  importance: number;
  embedding: Embedding;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string,any>
}

interface ScoredMemory extends Memory {
  similarity: number;
  recencyScore: number;
  importanceScore: number;
}

interface SearchLimiters {
  metadata?: Record<string,any>
  after?: Date
  before?: Date
}

export class MemoryStream {
  private embedder: Embedder;
  private memories: Record<string, Memory>

  constructor(embedder?: Embedder) {
    this.memories = {}
    this.embedder = embedder || new HuggingFaceEmbedder()
  }

  async get(id: string) {
    return this.memories[id]
  }

  async store(memory: Partial<Memory>) {
    if (!memory.content) {
      throw new Error("Memory content is empty!")
    }
    const embedding = memory.embedding || await this.createEmbedding(memory.content)
    const updatedAt = memory.updatedAt || new Date()
    const createdAt = memory.createdAt || new Date()
    const id = memory.id || hashString(memory.content + createdAt.toISOString())
    const metadata = memory.metadata || {}
    const importance = memory.importance || 50

    this.memories[id] = {
      id,
      content: memory.content,
      importance,
      embedding,
      createdAt,
      updatedAt,
      metadata,
    };
  }

  async relevantMemories(embedding: Embedding, limiters: SearchLimiters = {}) {
    const memories = this.fetchLimitedMemories(limiters);
    return this.scoreMemories(embedding, memories);
  }

  async createEmbedding(content:string) {
    return this.embedder.createEmbedding(content)
  }

  private fetchLimitedMemories(limiters: SearchLimiters) {
    const { metadata, after, before } = limiters;

    const metadataFilter = metadata ? (memory: Memory) => Object.entries(metadata).every(([key, value]) => memory.metadata[key] === value) : () => true;
    const afterFilter = after ? (memory: Memory) => memory.updatedAt > after : () => true;
    const beforeFilter = before ? (memory: Memory) => memory.updatedAt < before : () => true;

    return Object.values(this.memories).filter(memory => metadataFilter(memory) && afterFilter(memory) && beforeFilter(memory));
  }

  /**
   * Scores memories based on their similarity to a given embedding, their recency, and their importance.
   * The scoring is done by normalizing these three factors and adding them together.
   * The memories are then sorted by their total score in descending order.
   * @param {Embedding} embedding - The embedding to compare the memories to.
   * @param {Memory[]} memories - The memories to score.
   * @returns {ScoredMemory[]} The scored and sorted memories.
   */
  
  private scoreMemories(embedding: Embedding, memories: Memory[]):ScoredMemory[] {
    const memoriesWithSimilarities = memories.map(memory => {
      return {
        ...memory,
        similarity: this.similarityScore(embedding, memory)
      }
    })

    const updatedAtValues = memories.map(memory => memory.updatedAt.getTime());
    const minUpdatedAt = Math.min(...updatedAtValues);
    const maxUpdatedAt = Math.max(...updatedAtValues);

    const importanceValues = memories.map(memory => memory.importance);
    const minImportance = Math.min(...importanceValues);
    const maxImportance = Math.max(...importanceValues);

    const similarityValues = memoriesWithSimilarities.map(memory => memory.similarity);
    const minSimilarity = Math.min(...similarityValues);
    const maxSimilarity = Math.max(...similarityValues);

    const scoredMemories = memoriesWithSimilarities.map(memory => {
      // if min and max are the same, then we'll get a divide by zero error, so we'll just use 1.0 instead.
      const normalizedRecency = (memory.updatedAt.getTime() - minUpdatedAt) / ((maxUpdatedAt - minUpdatedAt) || 1.0);
      const normalizedImportance = (memory.importance - minImportance) / ((maxImportance - minImportance) || 1.0);
      const normalizedSimilarity = (memory.similarity - minSimilarity) / ((maxSimilarity - minSimilarity) || 1.0);

      const totalScore = normalizedRecency + normalizedImportance + normalizedSimilarity;
      return {
        ...memory,
        recencyScore: normalizedRecency,
        importanceScore: normalizedImportance,
        totalScore
      }
    });

    return scoredMemories.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Calculates the similarity score between the given embedding and memory.
   * The score is calculated as the 1 - (Euclidean distance between the two embeddings).
   * Higher numbers are more similar, normalized to be between 0 and 1.
   */
  private similarityScore(embedding: Embedding, memory: Memory):number {
    const diff = memory.embedding.map((value, index) => embedding[index] - value);
    
    // invert similarity so that higher similarity is better rather than 0 being best.
    return 1 - Math.hypot(...diff);
  }
}
