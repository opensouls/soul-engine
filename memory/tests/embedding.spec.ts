import { expect } from "chai"
import { getDefaultEmbedder, nullEmbedder } from "../src/embedding"

describe("Embedding", () => {
  it("does not error on parallel embeddings", async () => {
    const content1 = "hello"
    const content2 = "something different"
    const content3 = "hello"

    const embedder = getDefaultEmbedder()
    const [embedding1, embedding2, embedding3] = await Promise.all([
      embedder.createEmbedding(content1),
      embedder.createEmbedding(content2),
      embedder.createEmbedding(content3),
    ])

    expect(embedding1).to.deep.equal(embedding3)
    expect(embedding1).to.not.deep.equal(embedding2)
    expect(embedding1).to.have.length(embedding2.length)
    expect(embedding2).to.have.length(embedding3.length)
  })

  it("exports a null embedder", async () => {
    const embedder = nullEmbedder
    const embedding = await embedder.createEmbedding("hello")
    expect(embedding).to.deep.equal([])
  })

})