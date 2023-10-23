import * as readline from "readline";
import dotenv from "dotenv"
dotenv.config()

import { 
  ChatMessageRoleEnum,
  CortexStep,
  decision,
  internalMonologue,
  externalDialog, 
  brainstorm
} from "../src/next";
import { Blueprints } from "../src";

const blueprint = Blueprints.SAMANTHA;

const goal = `Making the user happy`;
const initialMemory = [
  {
    role: ChatMessageRoleEnum.System,
    content: `You are modeling the mind of ${blueprint.name}

${blueprint.personality}

${blueprint.name} has the following goal of: ${goal}
`,
  },
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let dialog = new CortexStep(blueprint.name);
dialog = dialog.withMemory(initialMemory);
let intermediateThoughtProcess = ["pondered how she feels", "wondered about intention"];

async function addDialogLine(text: string) {
  const newUserMemory = [
    {
      role: ChatMessageRoleEnum.User,
      content: text,
    },
  ];
  dialog = dialog.withMemory(newUserMemory);

  let thoughtProcess:CortexStep<any> = dialog;
  for (const process of intermediateThoughtProcess) {
    thoughtProcess = await thoughtProcess.next(internalMonologue("", process));
    console.log("\n", blueprint.name, process, thoughtProcess.value, "\n");
  }
  const says = await thoughtProcess.next(externalDialog());
  const newAssistantMemory = [
    {
      role: ChatMessageRoleEnum.Assistant,
      content: says.value,
    },
  ];
  dialog = dialog.withMemory(newAssistantMemory);
  console.log(
    "\n====>",
    blueprint.name,
    "says",
    `\x1b[34m${says.value}\x1b[0m`
  );
  const decisionStep = await dialog.next(
    decision(
      `Consider the prior dialog and the goal of ${goal}. ${blueprint.name} has the following INTERNAL METACOGNITION: [${intermediateThoughtProcess}]. Should the INTERNAL METACOGNITION change or stay the same?`,
      ["change thought process", "keep process the same"]
    )
  );
  console.log(blueprint.name, "decides", decisionStep.value);
  if (decisionStep.value === "change thought process") {
    const newProcess = await decisionStep.next(
      brainstorm(
        `Previously, ${blueprint.name} used the following INTERNAL METACOGNITION to think to themselves before speaking: [${intermediateThoughtProcess}]. Now, REVISE the INTERNAL METACOGNITION, adding, deleting, or modifying the processes.

For example. Revise [process1, process2] to [process1', process4, process5]. The revised processes must be different than the prior ones.
Each thought process should be two or three words to describe an internal thought process, these should be phrased in the past tense like "analyzed" "challenged" etc

MAKE SURE the new actions are all INTERNAL thought processes to think through PRIOR to speaking to the user, directed at oneself. Actions like provoking are all more external and don't qualify.
`.trim(),
      )
    );
    intermediateThoughtProcess = newProcess.value;
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