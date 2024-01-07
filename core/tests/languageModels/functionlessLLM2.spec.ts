import { expect } from "chai"
import { CortexStep, brainstorm, externalDialog } from "../../src"
import { FunctionlessLLM2 } from "../../src/languageModels/FunctionlessLLM2"

describe.only("FunctionlessLLM2", () => {
  const step = new CortexStep("bob", {
    processor: new FunctionlessLLM2({
      baseURL: "https://api.together.xyz/v1",
      singleSystemMessage: true,
      apiKey: process.env.TOGETHER_API_KEY,
    }, {
      // model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
      // model: "NousResearch/Nous-Hermes-2-Yi-34B",
      model: "teknium/OpenHermes-2p5-Mistral-7B",
      temperature: 0.7,
      max_tokens: 300,
    })
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
    expect((await nextStep).value).to.be.a("string")
    expect(streamed).to.equal((await nextStep).value)
  })

  it('streams functions', async () => {
    const { nextStep, stream } = await step.next(brainstorm("hi"), { stream: true })
    // expect(stream).to.be.an("AsyncGenerator")
    let streamed = ""
    for await (const res of stream) {
      streamed += res
    }
    expect((await nextStep).value).to.be.an("array")
    expect(JSON.parse(streamed).new_ideas[0]).to.equal((await nextStep).value[0])
  })

  it.only("works with functions", async () => {
    const result = await step.next(brainstorm("numbers less than 5"))
    expect(result.value).to.be.an("array")
    expect(parseInt(result.value[0])).to.be.a("number")
  })
})
