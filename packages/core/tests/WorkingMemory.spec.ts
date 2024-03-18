import { expect } from "chai"
import { WorkingMemory } from "../src/WorkingMemory.js"


describe("WorkingMemory", () => {
  it("concats two working memories into a new working memory", () => {
    const memories1 = new WorkingMemory({
      entityName: "test",
    }).withMonolouge("Topper tested #1")

    const memories2 = new WorkingMemory({
      entityName: "test",
    }).withMonolouge("Topper tested #2")

    const memories3 = memories1.concat(memories2)

    expect(memories3.memories).to.have.lengthOf(2)

    // make sure all three are unique ids
    const memoryIds = memories3.memories.map(memory => memory._id);
    const uniqueMemoryIds = new Set(memoryIds);
    expect(uniqueMemoryIds.size).to.equal(memoryIds.length);

    // make sure the order is correct
    expect(memories3.memories[0].content).to.equal(memories1.memories[0].content)
    expect(memories3.memories[1].content).to.equal(memories2.memories[0].content)
  })

  it("maps over memories", () => {
    const memories = new WorkingMemory({
      entityName: "test",
    }).withMonolouge("Topper tested #1")

    const newMemories = memories.map(memory => ({
      ...memory,
      content: "Topper tested #2"
    }))

    expect(newMemories.memories).to.have.lengthOf(1)
    expect(newMemories.memories[0].content).to.equal("Topper tested #2")
  })

  it("filters memories based on a condition", () => {
    const memories = new WorkingMemory({
      entityName: "test",
    }).withMonolouge("Topper tested #1")
     .withMonolouge("Another test #2")
     .withMonolouge("Final test #3")

    const filteredMemories = memories.filter(memory => (memory.content as string).includes("#2"))

    expect(filteredMemories.memories).to.have.lengthOf(1)
    expect(filteredMemories.memories[0].content).to.equal("Another test #2")
  })

  it("checks if any memory meets a condition", () => {
    const memories = new WorkingMemory({
      entityName: "test",
    }).withMonolouge("Topper tested #1")
     .withMonolouge("Another test #2")

    const hasTest1 = memories.some(memory => (memory.content as string).includes("#1"))
    const hasTest3 = memories.some(memory => (memory.content as string).includes("#3"))

    expect(hasTest1).to.be.true
    expect(hasTest3).to.be.false
  })

  it("finds a memory by content", () => {
    const memories = new WorkingMemory({
      entityName: "test",
    }).withMonolouge("Topper tested #1")
     .withMonolouge("Another test #2")

    const foundMemory = memories.find(memory => (memory.content as string).includes("#2"))
    expect(foundMemory).to.exist

    expect(foundMemory).to.not.be.undefined
    expect(foundMemory!.content).to.equal("Another test #2")
  })

  it("transforms memories asynchronously", async () => {
    const memories = new WorkingMemory({
      entityName: "test",
    }).withMonolouge("Async test #1")
     .withMonolouge("Async test #2")

    const asyncTransformedMemories = await memories.asyncMap(async memory => ({
      ...memory,
      content: `${memory.content} transformed`
    }))

    expect(asyncTransformedMemories.memories).to.have.lengthOf(2)
    expect(asyncTransformedMemories.memories[0].content).to.equal("Async test #1 transformed")
    expect(asyncTransformedMemories.memories[1].content).to.equal("Async test #2 transformed")
  })
  
})