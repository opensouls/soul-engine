import { expect } from "chai";
import { CortexStep, ChatMessageRoleEnum, externalDialog, z, brainstorm } from "../../src";
import { AnthropicProcessor } from "../../src/languageModels/Anthropic";

// this is set to skip because it requires a locally running LLM server or API keys other than OpenAI
describe.skip("AnthropicProcessor", () => {
  before(() => {
    console.log('noting anthropic does not work with bogus')
  })

  const step = new CortexStep("bob", {
    processor: new AnthropicProcessor()
  })

  it('works with non-streaming, non-functions', async () => {
    const result = await step.next(externalDialog("hi"))
    expect(result.value).to.be.a("string")
  })

  it('works with streaming non-functions', async () => {
    const { nextStep, stream } = await step.next(externalDialog("hi"), { stream: true })
    expect(stream).to.be.an("AsyncGenerator")
    let streamed = ""
    for await (const res of stream) {
      streamed += res
    }
    console.log("str: ", streamed)
    expect((await nextStep).value).to.be.a("string")
    expect(streamed).to.equal((await nextStep).value)
  })

  it('streams functions', async () => {
    const { nextStep, stream } = await step.next(brainstorm("hi"), { stream: true })

    let streamed = ""
    for await (const res of stream) {
      streamed += res
    }
    expect((await nextStep).value).to.be.an("array")
    expect(JSON.parse(streamed).new_ideas[0]).to.equal((await nextStep).value[0])
  })

  it("works with functions", async () => {
    const result = await step.next(brainstorm("numbers less than 5"))
    expect(result.value).to.be.an("array")
    expect(parseInt(result.value[0])).to.be.a("number")
  })

  it("runs example from readme", async () => {
    const queryMemory = (query: string) => {
      return () => {
        return {
          name: "queryMemory",
          description: query,
          parameters: z.object({
            answer: z.string().describe(`The answer to: ${query}`)
          })
        };
      }
    }

    const step2 = step.withMemory([{
      role: ChatMessageRoleEnum.System,
      content: "The name you are looking for is Jonathan"
    }])
    const resp = await step2.next(queryMemory("What is the name I'm looking for? Answer in a single word"))
    expect(resp.value.answer).to.equal("Jonathan")
  }).timeout(65_000)

  it("works with non alternating memories", async () => {
    const multiMemory = step.withMemory([
      {
        role: ChatMessageRoleEnum.System,
        content: "You are modeling the mind of bob, an immortal emperor of tinyville."
      },
      {
        role: ChatMessageRoleEnum.Assistant,
        content: "Bob said: Welcome servant."
      },
      {
        role: ChatMessageRoleEnum.Assistant,
        content: "Bob thought: Who goes there?"
      },
      {
        role: ChatMessageRoleEnum.User,
        content: "I am a visitor."
      }
    ])

    const speech = await multiMemory.compute(externalDialog("Bob warns the user to leave"))
    console.log("speech: ", speech)
    expect(speech).to.be.a("string")

  })

})