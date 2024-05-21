import { beforeEach, describe } from "mocha";
import { expect } from "chai";
import { Soul } from "../src/soul.js";

async function soulEvent(soul: Soul, event: string, timeout = 10000): Promise<void> {
  await Promise.race([
    new Promise((resolve) => soul.once(event, resolve)),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeout))
  ]);
}

describe("Soul basic API tests", () => {
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

  it("resets the soul", async () => {
    const soul = new Soul({
      blueprint: "integrator-test-soul",
      organization: process.env.SOUL_ENGINE_LOCAL_ORGANIZATION!,
      token: process.env.SOUL_ENGINE_LOCAL_API_KEY!,
      debug: true,
      local: true,
    })

    await soul.connect()
    cleanup.push(() => soul.disconnect())

    await soul.dispatch({
      name: "friend",
      action: "addThought",
      content: "i would love to eat a big plate of tartiflette right now"
    })

    await soulEvent(soul, "addedThought");

    await soul.dispatch({
      name: "friend",
      action: "answerQuestion",
      content: "hey, what do you want to eat?"
    })

    await soulEvent(soul, "says");

    const saidBeforeReset = soul.events.find((event: any) => event.action === "says")
    expect(saidBeforeReset).to.exist

    expect(saidBeforeReset?.content.toLowerCase()).to.contain("tartiflette")

    await soul.reset()

    // might take more than 5s, retry if fail
    await new Promise((resolve) => setTimeout(resolve, 5000))

    await soul.dispatch({
      name: "friend",
      action: "answerQuestion",
      content: "hey, what do you want to eat?"
    })

    await soulEvent(soul, "says");

    const saidAfterReset = soul.events.find((event: any) => event.action === "says")
    expect(saidAfterReset).to.exist

    expect(saidAfterReset?.content.toLowerCase()).to.not.contain("tartiflette")
  })

})