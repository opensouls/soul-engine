import { MentalProcess, indentNicely, useActions, useProcessManager } from "@opensouls/engine";
import initialProcess from "../initialProcess.js";
import externalDialog from "../lib/externalDialog.js";
import mentalQuery from "../lib/mentalQuery.js";

const shouts: MentalProcess = async ({ workingMemory }) => {
  const { speak, log } = useActions()
  const { setNextProcess } = useProcessManager()

  const [withYelling, stream] = await externalDialog(
    workingMemory,
    indentNicely`
      - Respond in ALL CAPS
      - Use capital letters only
      - Be angry
      - Be funny
    `,
    { stream: true, model: "quality" }
  );

  speak(stream);

  const [, shouldChill] = await mentalQuery(withYelling, "The interlocuter apologized.")

  log("User apologized?", shouldChill)
  if (shouldChill) {
    setNextProcess(initialProcess)

    return withYelling.withMonologue(indentNicely`
      ${workingMemory.soulName} thought to themself: I need to chill and stop shouting. I will stop using all caps.
    `)
  }

  return withYelling
}

export default shouts
