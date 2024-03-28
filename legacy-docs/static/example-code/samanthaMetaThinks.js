#!/bin/playground
// WIP!!!
// Import a few important pieces from the socialagi library
// check out https://www.socialagi.dev/ for further detail
import {
  CortexStep,
  CortexScheduler,
  ChatMessageRoleEnum,
  decision,
  externalDialog,
  internalMonologue,
  z,
} from "socialagi";
import { Blueprints } from "socialagi";
import playground from "playground";

const blueprint = Blueprints.SAMANTHA;
const goal = `Making the user happy`;
let internalThoughtProcess = ["feels to themselves", "wonders about intention"];

const brainStormMetaCognition = (description) => {
  return () => {
    const params = z.object({
      new_metacognitive_processes: z
        .array(z.string())
        .describe(
          `two or three words to describe an internal thought process.`
        ),
    });

    return {
      name: "determine_new_internal_cognition_processes",
      description,
      parameters: params,
      process: (_step, response) => {
        return {
          value: response.new_metacognitive_processes,
        };
      },
    };
  };
};

const samanthaReplies = async (signal, newMemory, lastStep) => {
  let dialog = lastStep.withMemory([newMemory]);

  let thoughtProcess = dialog;
  for (const process of internalThoughtProcess) {
    thoughtProcess = await thoughtProcess.next(
      internalMonologue(
        `Samantha ${process}. The response should be 1-2 sentences at most.`,
        process
      )
    );
    playground.log(`${process}: ${thoughtProcess.value}`);
  }
  const says = await thoughtProcess.next(externalDialog());
  const newAssistantMemory = [
    {
      role: ChatMessageRoleEnum.Assistant,
      content: says.value,
    },
  ];
  dialog = dialog.withMemory(newAssistantMemory);
  playground.addMessage({ sender: "Samantha", message: says.value });
  const decisionStep = await dialog.next(
    decision(
      `Consider the prior dialog and the goal of ${goal}. ${blueprint.name} has the following INTERNAL METACOGNITION: [${internalThoughtProcess}]. Should the INTERNAL METACOGNITION change or stay the same?`,
      ["changeThoughtProcess", "keepProcessTheSame"]
    )
  );
  playground.log(`decides to: ${decisionStep.value}`);
  if (decisionStep.value === "changeThoughtProcess") {
    const newProcess = await decisionStep.next(
      brainStormMetaCognition(
        `Previously, ${blueprint.name} used the following INTERNAL METACOGNITION to think to themselves before speaking: [${internalThoughtProcess}]. Now, REVISE the INTERNAL METACOGNITION, adding, deleting, or modifying the processes.
        
For example. Revise [process1, process2] to [process1', process4, process5]. The revised processes must be different than the prior ones.

MAKE SURE the new actions are all INTERNAL thought processes to think through PRIOR to speaking to the user, directed at oneself. Actions like provoking are all more external and don't qualify.
`.trim()
      )
    );
    internalThoughtProcess = newProcess.value;
    playground.log(`concludes: ${internalThoughtProcess}`);
  }

  return dialog;
};
const samanthaRepliesConfig = {
  name: "SamanthaReplies",
  process: samanthaReplies,
};
const initialMemories = [
  {
    role: ChatMessageRoleEnum.System,
    content: `You are modeling the mind of ${blueprint.name}

${blueprint.personality}

${blueprint.name} has the following goal of: ${goal}
`.trim(),
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
    message: "In this example, Samantha gets to choose how she thinks",
  });
  playground.addMessage({
    sender: "Playground",
    message: "Try annoying Samantha and see how her thought process adjusts",
  });
  playground.log("Playground initialized");
}, 1);

playground.on("userMessage", async (message) => {
  cortex.dispatch("SamanthaReplies", {
    role: "user",
    content: message,
  });
});
