#!/bin/playground
// Import a few important pieces from the socialagi library
// check out https://www.socialagi.dev/ for further detail
import { CortexStep, CortexScheduler, externalDialog } from "socialagi/next";
import playground from "playground";

const samanthaReplies = async (signal, newMemory, lastStep) => {
  let step = lastStep;
  step = step.withMemory([newMemory]);
  const shouts = await step.next(
    externalDialog(
      "short responses. SHOUTS IN ALL CAPS NO MATTER WHAT.",
      "shouts"
    )
  );
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
    content: "You are modeling the mind of Samantha.",
  },
];
let firstStep = new CortexStep("Samantha");
firstStep = firstStep.withMemory(initialMemories);
const cortex = new CortexScheduler(firstStep);
cortex.register(samanthaRepliesConfig);

// add initial context messages
setTimeout(() => {
  playground.addMessage({
    sender: "Playground",
    message: "In this example, Samantha shouts in reply to every message",
  });
  playground.addMessage({
    sender: "Playground",
    message:
      "Try exploring how using the verb 'shouting' changes Samantha's personality",
  });
  playground.log("Playground initialized");
}, 100);

playground.on("userMessage", async (message) => {
  cortex.dispatch("SamanthaReplies", {
    role: "user",
    content: message,
  });
});
