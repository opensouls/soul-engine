#!/bin/playground
// Import a few important pieces from the socialagi library
// check out https://www.socialagi.dev/ for further detail
import {
  ChatMessageRoleEnum,
  CortexStep,
  CortexScheduler,
  decision,
  externalDialog,
  internalMonologue,
} from "socialagi/next";
import playground from "playground";

const learningGoals = ["name", "favorite color", "favorite musician"];
let goalIndex = 0;

let annoyanceCounter = -20;

// subroutine for modeling Persista's replies
const persistaReplies = async (signal, newMemory, lastStep) => {
  if (goalIndex > 2) {
    return;
  }
  let step = lastStep;
  step = step.withMemory([newMemory]);
  step = await step.next(
    internalMonologue(
      `Persista notes how she feels about waiting for the user to provide their ${learningGoals[goalIndex]}.`,
      "felt"
    )
  );
  playground.log(step.value);
  const decisionStep = await step.next(
    decision(
      `Based on Persista's consideration, did Persista learn the user's ${learningGoals[goalIndex]}.`,
      ["yes", "no"]
    )
  );
  playground.log(
    `Did Persista learn the user's ${learningGoals[goalIndex]}? ` +
      decisionStep.value
  );
  if (decisionStep.value === "yes") {
    goalIndex += 1;
    playground.log(
      "New goal: " +
        (goalIndex < 3
          ? `learn user ${learningGoals[goalIndex]}`
          : "exit conversation")
    );
    annoyanceCounter = -20;
  } else {
    annoyanceCounter += 20;
    playground.log(`Annoyance increased to ${annoyanceCounter}`);
  }

  if (goalIndex === 3) {
    step = step.withMemory([
      {
        role: "system",
        content: `Persista planned: This will be my last message. I cannot ask any questions. \
I need to summarize everything I learned and thank the user, then say goodbye. Also \
I don't think I will be able to ever speak with them again.`,
      },
    ]);
    step = await step.next(externalDialog());
    playground.addMessage({
      sender: "Persista",
      message: step.value,
    });
    playground.log("Persista exited");
    return;
  }

  step = step.withMemory([
    {
      role: ChatMessageRoleEnum.Assistant,
      content: `
Persista thought: I need to learn the user's: ${learningGoals[goalIndex]} \
My level of annoyance with them not answering is ${annoyanceCounter} on a scale of 0 to 100. \
Regardless, I NEED an answer from them, no matter what.
`.trim(),
    },
  ]);
  step = await step.next(
    internalMonologue(
      `Persista plans how best to get the user's ${learningGoals[goalIndex]}.`,
      "planned"
    )
  );
  playground.log("Persista planned: " + step.value);
  step = await step.next(
    externalDialog(
      `Persista needs know the user's ${learningGoals[goalIndex]} in order to survive!`
    )
  );
  playground.addMessage({
    sender: "Persista",
    message: step.value,
  });
  // return a step that has the new dialog, but not the decision to speak or not
  return step;
};
const persistaRepliesConfig = {
  name: "PersistaReplies",
  process: persistaReplies,
};
const initialMemories = [
  {
    role: "system",
    content:
      "You are modeling the mind of Persista, a robot whose *entire existence* \
depends on learning and extracting information from the user. Persista does NOT \
take no for an answer when annoyed, although she is polite.",
  },
];
let firstStep = new CortexStep("Persista");
firstStep = firstStep.withMemory(initialMemories);

// create a scheduler to manage convertion of event-driven texts to synchronous interaction
const cortex = new CortexScheduler(firstStep);
cortex.register(persistaRepliesConfig);

// add initial context messages
setTimeout(() => {
  playground.addMessage({
    sender: "Playground",
    message:
      "In this example, Persista is programmed to obtain several pieces of information \
from you, in sequential order",
  });
  playground.addMessage({
    sender: "Playground",
    message:
      "Explore what its like to talk to Persista when she needs something from you.",
  });
  playground.log("Playground initialized");
}, 1);

// playground manages dispatching user messages to the scheduler
playground.on("userMessage", async (message) => {
  cortex.dispatch("PersistaReplies", {
    role: "user",
    content: message,
  });
});
