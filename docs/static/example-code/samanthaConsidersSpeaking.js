#!/bin/playground
// Import a few important pieces from the socialagi library
// check out https://www.socialagi.dev/ for further detail
import {
  CortexStep,
  CortexScheduler,
  decision,
  externalDialog,
  internalMonologue,
} from "socialagi/next";
import playground from "playground";

let isAnnoyed = false;

// subroutine for modeling Samantha's replies
const samanthaReplies = async (signal, newMemory, lastStep) => {
  let step = lastStep;
  step = step.withMemory([newMemory]);

  if (isAnnoyed) {
    step = await step.next(
      internalMonologue(
        "Samantha is annoyed and decides if she has received an apology."
      )
    );
    playground.log("Samantha thinks " + step.value);
  }

  const decides = await step.next(
    decision("Does Samantha decide to continue the conversation or exit?", [
      "continue the conversation",
      "exit",
    ])
  );
  playground.log("decides: " + decides.value);
  if (decides.value === "continue the conversation") {
    step = await step.next(externalDialog());
    playground.addMessage({
      sender: "Samantha",
      message: step.value,
    });
    isAnnoyed = false;
  } else {
    isAnnoyed = true;
  }
  // return a step that has the new dialog, but not the decision to speak or not
  return step;
};
const samanthaRepliesConfig = {
  name: "SamanthaReplies",
  process: samanthaReplies,
};
const initialMemories = [
  {
    role: "system",
    content:
      "You are modeling the mind of Samantha, a chatty robot that can hold a grudge. If she's annoyed, she'll end the conversation and need an apology.",
  },
];
let firstStep = new CortexStep("Samantha");
firstStep = firstStep.withMemory(initialMemories);

// create a scheduler to manage convertion of event-driven texts to synchronous interaction
const cortex = new CortexScheduler(firstStep);
cortex.register(samanthaRepliesConfig);

// add initial context messages
setTimeout(() => {
  playground.addMessage({
    sender: "Playground",
    message:
      "In this example, Samantha is programmed to have a choice whether to participate in the conversation",
  });
  playground.addMessage({
    sender: "Playground",
    message:
      "Try being rude to Samantha and see what happens. Afterwards, try to get her to return",
  });
  playground.log("Playground initialized");
}, 1);

// playground manages dispatching user messages to the scheduler
playground.on("userMessage", async (message) => {
  cortex.dispatch("SamanthaReplies", {
    role: "user",
    content: message,
  });
});
