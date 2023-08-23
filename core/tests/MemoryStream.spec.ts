import { expect } from "chai"
import { MemoryStream } from "../src/alpha/memory/MemoryStream"

describe("MemoryStream", () => {
  it("stores memories", async () => {
    const memoryStream = new MemoryStream()
    await memoryStream.store({
      content: "Hello, world!"
    })
    const memory = await memoryStream.get("Hello, world!")
    expect(memory.content).to.equal("Hello, world!")
  })
})