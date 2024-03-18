import { expect } from "chai"
import { WorkingMemory } from "../src/WorkingMemory"


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
})