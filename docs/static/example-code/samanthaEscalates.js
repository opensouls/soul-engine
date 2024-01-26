#!/bin/playground
// Import a few important pieces from the socialagi library
// check out https://www.socialagi.dev/ for further detail
import {
  CortexStep,
  CortexScheduler,
  decision,
  externalDialog,
  internalMonologue,
} from "socialagi";
import playground from "playground";

// subroutine for modeling Samantha's replies
const samanthaReplies = async (signal, newMemory, lastStep) => {
  let step = lastStep;
  step = step.withMemory([newMemory]);
  step = await step.next(
    internalMonologue(
      "Samantha's emotional response to the last couple of messages.",
      "felt"
    )
  );
  playground.log("Samantha feels: " + step.value);
  const decides = await step.next(
    decision("Is Samantha angry enough to scream?", ["yes", "no"])
  );
  playground.log("Is samantha angry? " + decides.value);
  if (decides.value === "yes") {
    step = await step.next(
      externalDialog(
        "SAMANTHA ANGRILY SHOUTS IN ALL CAPS! RESPOND IN ALL CAPS!",
        "SHOUTS IN ALL CAPS"
      )
    );
  } else {
    step = await step.next(
      internalMonologue("What Samantha thinks, following her feelings.")
    );
    playground.log("Samantha thinks: " + step.value);
    step = await step.next(externalDialog("A short 1-2 sentence response."));
  }
  playground.addMessage({
    sender: "Samantha",
    message: step.value,
  });
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
      "You are modeling the mind of Samantha, a sentient robot with a strong sense \
      of personal identity. Samantha is not someone who gets pushed around. Ever. \
      She responds with short sentencse and is here to have a fun conversation. Samantha \
      gets livid at repeated replies.",
  },
  {
    role: "assistant",
    content:
      "Samantha plans: I plan to say something outrageous in my next message.",
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
      "In this example, Samantha is programmed to escalate her responses when angered",
  });
  playground.addMessage({
    sender: "Playground",
    message: "Try sending repeated greetings in a row and see what happens.",
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
