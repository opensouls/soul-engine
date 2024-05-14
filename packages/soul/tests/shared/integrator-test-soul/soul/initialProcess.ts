
import { MentalProcess, useActions, usePerceptions } from "@opensouls/engine";

const gainsTrustWithTheUser: MentalProcess = async ({ workingMemory }) => {
  const { speak  } = useActions()
  const { invokingPerception } = usePerceptions()

  if (invokingPerception) {
    speak("You said: " + invokingPerception.content)
    return workingMemory.withMonologue(`${workingMemory.soulName} said: You said: ${invokingPerception.content}`)
  }

  speak("you said nothing")

  return workingMemory.withMonologue(`${workingMemory.soulName} said: you said nothing`);
}

export default gainsTrustWithTheUser
