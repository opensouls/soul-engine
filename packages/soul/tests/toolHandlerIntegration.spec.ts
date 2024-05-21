import { beforeEach, describe } from "mocha";
import { expect } from "chai";
import { Soul } from "../src/soul.js";

describe("ToolHandler Integration Tests", () => {
  let cleanup: (() => any)[] = []

  before(() => {
    console.log("make sure you have run npx soul-engine dev -l in the tests/shared/integrator-test-soul directory")
  })

  beforeEach(() => {
    cleanup = []
  })

  afterEach(async () => {
    for (const cleanupFunc of cleanup) {
      await cleanupFunc()
    }
  })

  it("supplies tools to the soul", async () => {
    const soul = new Soul({
      blueprint: "integrator-test-soul",
      organization: process.env.SOUL_ENGINE_LOCAL_ORGANIZATION!,
      token: process.env.SOUL_ENGINE_LOCAL_API_KEY!,
      debug: true,
      local: true,
    })

    soul.registerTool<{ ping: string }, { pong: string }>("pingTool", async ({ ping }) => {
      return { pong: ping }
    })

    await soul.connect()
    cleanup.push(() => soul.disconnect())

    await soul.dispatch({
      action: "callTool",
      content: "ping"
    })

    // wait like 500ms, then check to make sure it ponged.
    await new Promise((resolve) => setTimeout(resolve, 500))
    const said = soul.events.find((event: any) => event.action === "says")
    expect(said).to.exist

    expect(said?.content).to.equal("Your tool ponged: ping")
  })

})