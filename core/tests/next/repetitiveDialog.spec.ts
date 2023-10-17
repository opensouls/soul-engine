import { ChatMessageRoleEnum } from "../../src/next"
import { getAstronaut, getElon } from "./repetitiveDialogHelpers/elon"


describe.only("non-repetitive dialog integration", () => {

  it("should not repeat - this test is currently designed for human eyes to see similarity or repetitiveness across the dialog", async () => {
    const [elon, elonEmitter] = getElon()
    const [astronaut, astronautEmitter] = getAstronaut()

    elonEmitter.on("message", async (message) => {
      console.log("Elon:", message.content)
      await astronaut.dispatch("AstronautReplies", {
        role: ChatMessageRoleEnum.User,
        content: message.content.replace("ElonAI said:", "")
      })
    })

    astronautEmitter.on("message", async (message) => {
      console.log("Astronaut:", message.content)
      await elon.dispatch("ElonAIReplies", {
        role: ChatMessageRoleEnum.User,
        content: message.content.replace("Astronaut said:", "")
      })
    })

    await elon.dispatch("ElonAIReplies", {
      role: ChatMessageRoleEnum.User,
      content: "Hello, ElonAI!"
    })
  })

})