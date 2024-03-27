
import { MentalProcess, useActions, useProcessManager } from "@opensouls/engine";
import shouts from "./mentalProcesses/shouts.js";
import externalDialog from "./lib/externalDialog.js";
import mentalQuery from "./lib/mentalQuery.js";

const gainsTrustWithTheUser: MentalProcess = async ({ workingMemory }) => {
  const { speak, log  } = useActions()
  const { setNextProcess } = useProcessManager()

  const [withDialog, stream] = await externalDialog(
    workingMemory,
    "Talk to the user trying to gain trust and learn about their inner world.",
    { stream: true, model: "quality" }
  );
  speak(stream);

  const [,shouldShout] = await mentalQuery(withDialog, "The interlocuter is being rude?")
  log("User attacked soul?", shouldShout)
  if (shouldShout) {
    setNextProcess(shouts)
  }

  return withDialog;
}

export default gainsTrustWithTheUser
