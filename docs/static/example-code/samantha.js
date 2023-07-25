#!/bin/playground
// Import a few important pieces from the socialagi library
// check out https://www.socialagi.dev/Soul for further detail
import { Action, CortexStep, CortexScheduler } from "socialagi";
import playground from "playground";

const samanthaReplies = async (signal, newMemory, lastStep) => {
  let step = lastStep;
  step = step.withMemory([newMemory]);
  const shouts = await step.next(Action.EXTERNAL_DIALOG, {
    action: "shouts in all caps",
  });
  playground.addMessage({
    sender: "Samantha",
    message: shouts.value,
  });
  return shouts;
};
const samanthaRepliesConfig = {
  name: "SamanthaReplies",
  process: samanthaReplies,
};
const initialMemories = [
  {
    role: "system",
    content: "<Context>You are modeling the mind of Samantha</Context>",
  },
];
let firstStep = new CortexStep("Samantha");
firstStep = firstStep.withMemory(initialMemories);
const cortex = new CortexScheduler(firstStep);
cortex.register(samanthaRepliesConfig);

playground.on("userMessage", async (message) => {
  cortex.dispatch("SamanthaReplies", {
    role: "user",
    content: message,
  });
});
