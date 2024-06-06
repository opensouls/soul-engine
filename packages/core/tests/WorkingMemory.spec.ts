import { expect } from "chai"
import { WorkingMemory } from "../src/WorkingMemory.js"
import { ChatMessageRoleEnum, InputMemory } from "../src/Memory.js"


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

  it("retrieves a memory at a specified index", () => {
    const memories = new WorkingMemory({
      soulName: "test",
    }).withMonologue("Memory #1")
      .withMonologue("Memory #2")

    const memoryAtIndex0 = memories.at(0)
    const memoryAtIndex1 = memories.at(1)
    const memoryAtInvalidIndex = memories.at(3)

    expect(memoryAtIndex0.content).to.equal("Memory #1")
    expect(memoryAtIndex1.content).to.equal("Memory #2")
    expect(memoryAtInvalidIndex).to.be.undefined
  })

  it("returns the correct length of memories", () => {
    const memories = new WorkingMemory({
      soulName: "test",
    }).withMonologue("Memory #1")
      .withMonologue("Memory #2")
      .withMonologue("Memory #3")

    expect(memories.length).to.equal(3)
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

  describe('regions', () => {

    const fakeSystemMemeory: InputMemory = {
      role: ChatMessageRoleEnum.System,
      content: 'System',
    }

    it('adds a new region to the working memory', () => {
      const memories = new WorkingMemory({
        soulName: "test",
      }).withMonologue("Memory #1")
        .withMonologue("Memory #2")

      const memoriesWithRegion = memories.withRegion("system", fakeSystemMemeory)
      expect(memoriesWithRegion.length).to.equal(3)
      expect(memoriesWithRegion.at(0)).to.have.property('region', 'system')
      expect(memoriesWithRegion.at(0)).to.have.property('content', fakeSystemMemeory.content)
    })

    it('replaces existing regions', () => {
      const memories = new WorkingMemory({
        soulName: "test",
      }).withMonologue("Memory #1")
        .withMonologue("Memory #2")

      const memoriesWithRegion = memories.withRegion("system", fakeSystemMemeory)
      
      const withReplacedRegion = memoriesWithRegion.withRegion("system", {
        role: ChatMessageRoleEnum.System,
        content: 'Replaced System',
      })
      expect(withReplacedRegion.length).to.equal(3)
      expect(withReplacedRegion.at(0)).to.have.property('region', 'system')
      expect(withReplacedRegion.at(0)).to.have.property('content', 'Replaced System')
    })

    it('orders regions', () => {
      const memories = new WorkingMemory({
        soulName: "test",
      }).withMonologue("Memory #1")
        .withMonologue("Memory #2")

      const withSystem = memories.withRegion("system", fakeSystemMemeory)
      const withSummary = withSystem.withRegion("summary", {
        role: ChatMessageRoleEnum.System,
        content: 'Summary',
      })

      const ordered = withSummary.orderRegions('summary', 'system')
      expect(ordered.length).to.equal(4)
      expect(ordered.at(0)).to.have.property('region', 'summary')
      expect(ordered.at(1)).to.have.property('region', 'system')

      const reordered = ordered.orderRegions('system', 'summary')
      expect(reordered.length).to.equal(4)
      expect(reordered.at(0)).to.have.property('region', 'system')
      expect(reordered.at(1)).to.have.property('region', 'summary')
    })

    it("orders using 'default' as a region", () => {
      const memories = new WorkingMemory({
        soulName: "test",
      }).withMonologue("Memory #1")
        .withMonologue("Memory #2")

      const withSystem = memories.withRegion("system", fakeSystemMemeory)
      const withSummary = withSystem.withRegion("summary", {
        role: ChatMessageRoleEnum.System,
        content: 'Summary',
      })

      const ordered = withSummary.orderRegions('default', 'system', 'summary')
      expect(ordered.at(0)).to.not.have.property('region')
      expect(ordered.slice(-1).at(0)).to.have.property('region', 'summary')
      expect(ordered.slice(-2).at(0)).to.have.property('region', 'system')
    })

  })

})