
import { MentalProcess, useActions, usePerceptions, useTool } from "@opensouls/engine";
import externalDialog from "./cognitiveSteps/externalDialog.js";

const gainsTrustWithTheUser: MentalProcess = async ({ workingMemory }) => {
  const { speak, dispatch } = useActions()
  const { invokingPerception } = usePerceptions()
  const pingTool = useTool<{ping: string}, { pong: string }>("pingTool")

  if (!invokingPerception) {
    speak("you said nothing")

    return workingMemory.withMonologue(`${workingMemory.soulName} said: you said nothing`);
  }

  if (invokingPerception.action === "callTool") {
    const { pong } = await pingTool({ ping: invokingPerception.content })
    speak("Your tool ponged: " + pong)
    return workingMemory.withMonologue(`${workingMemory.soulName} said: Your tool ponged: ${pong}`)
  }

  if (invokingPerception.action === "addThought") {
    workingMemory = workingMemory.filter((memory) => !memory.content.toString().includes("addThought"))

    const content = invokingPerception.content
    dispatch({
      action: "addedThought",
      content
    })
    return workingMemory.withMonologue(`${workingMemory.soulName} thought: ${content}`)
  }

  if (invokingPerception.action === "answerQuestion") {
    const content = invokingPerception.content
    const [withDialog, dialog] = await externalDialog(workingMemory, content)
    speak(dialog)
    return withDialog
  }

  speak("You said: " + invokingPerception.content)
  return workingMemory.withMonologue(`${workingMemory.soulName} said: You said: ${invokingPerception.content}`)

}

export default gainsTrustWithTheUser
