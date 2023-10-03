import { expect } from "chai"
import { ChatMessageRoleEnum, OpenAILanguageProgramProcessor } from "../../../src/next/languageModels"


describe("OpenAI Language Model", () => {

  it("streams responses", async () => {
    const processor = new OpenAILanguageProgramProcessor()

    const { response: nextPromise, stream } = await processor.experimentalStreamingExecute(
      [
        {
        role: ChatMessageRoleEnum.System,
        content: "You are modeling the mind of Bogus, a very bad dude.",
        },
        {
          role: ChatMessageRoleEnum.User,
          content: "What paragagraph long response would bogus say now?"
        }
      ]
    )

    let streamed = ""

    for await (const chunk of stream) {
      expect(chunk).to.be.a("string")
      expect(chunk).to.exist
      streamed += chunk
    }

    const { content } = await nextPromise
    expect(content).to.exist
    expect(content).to.be.a("string")
    expect(content).to.eq(streamed)
  })

})