import { ChatMessageRoleEnum, CortexStep } from "../../src";
import { getDefaultEmbedder, Embedding } from "@socialagi/memory"

const similarityScore = (targetEmbedding: Embedding, otherEmbedding: Embedding): number => {
  const diff = otherEmbedding.map((value, index) => targetEmbedding[index] - value);

  // invert similarity so that higher similarity is better rather than 0 being best.
  return 1 - Math.hypot(...diff);
}

export const analyzeStepForRepetitiveness = async (step: CortexStep<any>) => {
  const embedder = getDefaultEmbedder()

  const assistantMemories = step.memories.filter(m => m.role === ChatMessageRoleEnum.Assistant)

  const last = assistantMemories.pop()

  if (!last) {
    return false
  }

  const memoriesWithEmbeddings = await Promise.all(assistantMemories.map(async (m) => {
    return {
      memory: m,
      embedding: await embedder.createEmbedding(m.content || "")
    }
  }))

  const lastEmbedding = await embedder.createEmbedding(last.content || "")

  const distances = memoriesWithEmbeddings.map((m) => {
    return {
      memory: m.memory,
      embedding: m.embedding,
      distance: similarityScore(lastEmbedding, m.embedding)
    }
  })

  for (const distance of distances) {
    if (distance.distance > 0.90) {
      console.error(`Repetitive dialog detected: ${distance.memory.content} is similar to ${last.content}`)
      throw new Error(`Repetitive dialog detected: ${distance.memory.content} is similar to ${last.content}`)
    }
  }

  distances.sort((a, b) => a.distance - b.distance);
  console.log(`------------------------------------------------------ sim: ${distances[0].distance}`);

}