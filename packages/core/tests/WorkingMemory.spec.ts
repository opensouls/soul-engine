import { expect } from "chai"
import { WorkingMemory } from "../src/WorkingMemory.js"
import { ChatMessageRoleEnum } from "../src/Memory.js"


describe("WorkingMemory", () => {
  it("concats two working memories into a new working memory", () => {
    const memories1 = new WorkingMemory({
      soulName: "test",
    }).withMonologue("Topper tested #1")

    const memories2 = new WorkingMemory({
      soulName: "test",
    }).withMonologue("Topper tested #2")

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

  it("replaces the current memories with new ones", () => {
    const originalMemories = new WorkingMemory({
      soulName: "test",
    }).withMonologue("Original memory #1")
      .withMonologue("Original memory #2")

    const newMemoriesData = [
      { content: "New memory #1", role: ChatMessageRoleEnum.User },
      { content: "New memory #2", role: ChatMessageRoleEnum.User }
    ]

    const updatedMemories = originalMemories.replace(newMemoriesData)

    expect(updatedMemories.memories).to.have.lengthOf(2)
    expect(updatedMemories.memories[0].content).to.equal("New memory #1")
    expect(updatedMemories.memories[1].content).to.equal("New memory #2")
  })

  it("maps over memories", () => {
    const memories = new WorkingMemory({
      soulName: "test",
    }).withMonologue("Topper tested #1")

    const newMemories = memories.map(memory => ({
      ...memory,
      content: "Topper tested #2"
    }))

    expect(newMemories.memories).to.have.lengthOf(1)
    expect(newMemories.memories[0].content).to.equal("Topper tested #2")
  })

  it("filters memories based on a condition", () => {
    const memories = new WorkingMemory({
      soulName: "test",
    }).withMonologue("Topper tested #1")
      .withMonologue("Another test #2")
      .withMonologue("Final test #3")

    const filteredMemories = memories.filter(memory => (memory.content as string).includes("#2"))

    expect(filteredMemories.memories).to.have.lengthOf(1)
    expect(filteredMemories.memories[0].content).to.equal("Another test #2")
  })

  it("checks if any memory meets a condition", () => {
    const memories = new WorkingMemory({
      soulName: "test",
    }).withMonologue("Topper tested #1")
      .withMonologue("Another test #2")

    const hasTest1 = memories.some(memory => (memory.content as string).includes("#1"))
    const hasTest3 = memories.some(memory => (memory.content as string).includes("#3"))

    expect(hasTest1).to.be.true
    expect(hasTest3).to.be.false
  })

  it("finds a memory by content", () => {
    const memories = new WorkingMemory({
      soulName: "test",
    }).withMonologue("Topper tested #1")
      .withMonologue("Another test #2")

    const foundMemory = memories.find(memory => (memory.content as string).includes("#2"))
    expect(foundMemory).to.exist

    expect(foundMemory).to.not.be.undefined
    expect(foundMemory!.content).to.equal("Another test #2")
  })

  it("transforms memories asynchronously", async () => {
    const memories = new WorkingMemory({
      soulName: "test",
    }).withMonologue("Async test #1")
      .withMonologue("Async test #2")

    const asyncTransformedMemories = await memories.asyncMap(async memory => ({
      ...memory,
      content: `${memory.content} transformed`
    }))

    expect(asyncTransformedMemories.memories).to.have.lengthOf(2)
    expect(asyncTransformedMemories.memories[0].content).to.equal("Async test #1 transformed")
    expect(asyncTransformedMemories.memories[1].content).to.equal("Async test #2 transformed")
  })

  it("slices", () => {
    const memories = new WorkingMemory({
      soulName: "test",
    }).withMonologue("Slice test #1")
      .withMonologue("Slice test #2")
      .withMonologue("Slice test #3")

    const slicedMemories = memories.slice(1, 3)

    expect(slicedMemories.memories).to.have.lengthOf(2)
    expect(slicedMemories.memories[0].content).to.equal("Slice test #2")
    expect(slicedMemories.memories[1].content).to.equal("Slice test #3")
  })

  it("transforms memories asynchronously", async () => {
    const memories = new WorkingMemory({
      soulName: "test",
    }).withMonologue("Async map test #1")
      .withMonologue("Async map test #2")

    const asyncMappedMemories = await memories.asyncMap(async memory => ({
      ...memory,
      content: `${memory.content} async mapped`
    }))

    expect(asyncMappedMemories.memories).to.have.lengthOf(2)
    expect(asyncMappedMemories.memories[0].content).to.equal("Async map test #1 async mapped")
    expect(asyncMappedMemories.memories[1].content).to.equal("Async map test #2 async mapped")
  })

  
  it("applies postCloneTransformations to transform WorkingMemory", () => {
    // This test is a trivial example to test functionality. The system is designed so library developers
    // can add their own hooks to working memory (for instance, prevent access to certain methods, or log usage, etc).
    
    const postCloneTransformation = (wm: WorkingMemory) => {
      const transformedMemories = wm.memories.map(memory => ({
        ...memory,
        metadata: {
          transformed: true,
        }
      }));
      return new WorkingMemory({ soulName: wm.soulName, memories: transformedMemories });
    };

    const memories = new WorkingMemory({
      soulName: "test",
      postCloneTransformation,
      memories: [
        {
          role: ChatMessageRoleEnum.System,
          content: "Test #1"
        },
      ]
    }).withMonologue("Test #2")

    expect(memories.memories).to.have.lengthOf(2);
    expect(memories.memories[0].metadata?.transformed).to.be.true
    expect(memories.memories[1].metadata?.transformed).to.be.true
  });

})