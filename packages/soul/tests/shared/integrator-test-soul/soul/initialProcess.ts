
import { MentalProcess, useActions, usePerceptions, useTool } from "@opensouls/engine";

const gainsTrustWithTheUser: MentalProcess = async ({ workingMemory }) => {
  const { speak  } = useActions()
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

  speak("You said: " + invokingPerception.content)
  return workingMemory.withMonologue(`${workingMemory.soulName} said: You said: ${invokingPerception.content}`)

}

export default gainsTrustWithTheUser
