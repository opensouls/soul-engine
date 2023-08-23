import { expect } from "chai"
import { MemoryStream } from "../../src/next/memory/MemoryStream"

describe("MemoryStream", () => {
  it("stores memories", async () => {
    const memoryStream = new MemoryStream()
    await memoryStream.store({
      id: "hi",
      content: "Hello, world!"
    })
    const memory = await memoryStream.get("hi")
    expect(memory.content).to.equal("Hello, world!")
  })

  it("gets relevant memories", async () => {
    const memoryStream = new MemoryStream()

    await memoryStream.store({
      content: "The dog said hello",
    })

    await memoryStream.store({
      content: "The cat said hello",
    })

    const embed = await memoryStream.createEmbedding("hi said the canine")
    const returnedMemories = await memoryStream.relevantMemories(embed)

    expect(returnedMemories[0].content).to.equal("The dog said hello")
  })

})
