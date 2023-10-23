import * as readline from "readline";
import dotenv from "dotenv"
dotenv.config()

import { 
  ChatMessageRoleEnum,
  CortexStep,
  decision,
  internalMonologue,
  externalDialog, 
  z
} from "../src/next";
import { Blueprints } from "../src";

const blueprint = Blueprints.SAMANTHA;

const brainStormMetaCognition = (description:string) => {
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
      process: (_step:CortexStep<any>, response: z.infer<typeof params>) => {
        return {
          value: response.new_metacognitive_processes,
        };
      },
    };
  };
};

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
let intermediateThoughtProcess = ["ponders how she feels", "wonders about intention"];

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
    thoughtProcess = await thoughtProcess.next(internalMonologue(`${blueprint.name} ${process}. The response should be 1 to 2 sentences at most.`, process));
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
      ["changeThoughtProcess", "keepProcessTheSame"]
    )
  );
  console.log(blueprint.name, "decides", decisionStep.value);
  if (decisionStep.value === "changeThoughtProcess") {
    const newProcess = await decisionStep.next(
      brainStormMetaCognition(
        `Previously, ${blueprint.name} used the following INTERNAL METACOGNITION to think to themselves before speaking: [${intermediateThoughtProcess}]. Now, REVISE the INTERNAL METACOGNITION, adding, deleting, or modifying the processes.

For example. Revise [process1, process2] to [process1', process4, process5]. The revised processes must be different than the prior ones.

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
