import { expect } from "chai"
import { CortexStep, brainstorm, externalDialog } from "../../src"
import { OpenAILanguageProcessor2 } from "../../src/languageModels/openai2"

describe.only("openai2", () => {
  const step = new CortexStep("bob", {
    processor: new OpenAILanguageProcessor2()
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
    expect(stream).to.be.an("AsyncGenerator")
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
})