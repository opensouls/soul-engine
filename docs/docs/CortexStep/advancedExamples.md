---
id: advanced-examples
sidebar_position: 7
---

# Advanced Examples

This collection of advanced examples illustrates quite complex topics at the frontier of AI cognitive modeling.

## Metacognition

Here we display a much more complex example of the following and intriguing concept: what if an AI Soul is given the capacity to remember and think about how it is thinking? This concept is generally known as metacognition, and is a core skill humans display. This example is currently presented without further context.

```javascript
import * as readline from "readline";
import {ChatMessageRoleEnum, CortexStep, Action, Blueprints} from "socialagi";

const blueprint = Blueprints.SAMANTHA;

const goal = `Making the user happy`;
const initialMemory = [
  {
    role: ChatMessageRoleEnum.System,
    content: `<CONTEXT>You are modeling the mind of ${blueprint.name}

${blueprint.personality}

${blueprint.name} has the following goal of: ${goal}

</CONTEXT>`,
  },
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let dialog = new CortexStep(blueprint.name);
dialog = dialog.withMemory(initialMemory);
let intermediateThoughtProcess = ["feelsToThemself", "wondersAboutIntention"];

async function addDialogLine(text: string) {
  const newUserMemory = [
    {
      role: ChatMessageRoleEnum.User,
      content: text,
    },
  ];
  dialog = dialog.withMemory(newUserMemory);

  let thoughtProcess = dialog;
  for (const process of intermediateThoughtProcess) {
    thoughtProcess = await thoughtProcess.next(Action.INTERNAL_MONOLOGUE, {
      action: process,
      description: `Thinks to themselves internally`,
    });
    console.log("\n", blueprint.name, process, thoughtProcess.value, "\n");
  }
  const says = await thoughtProcess.next(Action.EXTERNAL_DIALOG, {
    action: "says",
    description: `what ${blueprint.name} says out loud next`,
  });
  const newAssistantMemory = [
    {
      role: ChatMessageRoleEnum.Assistant,
      content: says.value as string,
    },
  ];
  dialog = dialog.withMemory(newAssistantMemory);
  console.log(
    "\n====>",
    blueprint.name,
    "says",
    `\x1b[34m${says.value}\x1b[0m`
  );
  const decision = await dialog.next(Action.DECISION, {
    action: "decides",
    description: `Consider the prior dialog and the goal of ${goal}. ${blueprint.name} has the following INTERNAL METACOGNITION: [${intermediateThoughtProcess}]. Should the INTERNAL METACOGNITION change or stay the same?`,
    choices: ["changeThoughtProcess", "keepProcessTheSame"],
  });
  console.log(blueprint.name, "decides", decision.value);
  if (decision.value === "changeThoughtProcess") {
    const newProcess = await decision.next(Action.BRAINSTORM_ACTIONS, {
      actionsForIdea:
        `Previously, ${blueprint.name} used the following INTERNAL METACOGNITION to think to themselves before speaking: [${intermediateThoughtProcess}]. Now, REVISE the INTERNAL METACOGNITION, adding, deleting, or modifying the processes.
        
For example. Revise [process1, process2] to [process1', process4, process5]. The revised processes must be different than the prior ones.

MAKE SURE the new actions are all parts of one's INTERNAL thought process PRIOR to speaking to the user, directed at oneself. Actions like provoking are all more external and don't qualify.   
`.trim(),
    });
    intermediateThoughtProcess = newProcess.value as string[];
    console.log(blueprint.name, "concludes", intermediateThoughtProcess);
  }
}

console.log(
  '- Type a message to send to Soul\n- Type "reset" to reset\n- Type "exit" to quit\n'
);

rl.on("line", async (line) => {
  if (line.toLowerCase() === "exit") {
    rl.close();
  } else {
    const text: string = line;
    addDialogLine(text);
  }
});
```



















