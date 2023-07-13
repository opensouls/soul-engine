import {
  Action,
  ChatMessage,
  CortexManager,
  CortexStep,
  ProcessConfig,
  QueuingStrategy,
} from "../src/index";
import { AbortSignal } from "abort-controller";

const SamanthaReplies = async (
  signal: AbortSignal,
  newMemory: ChatMessage,
  lastStep: CortexStep
) => {
  let step = lastStep;
  step = step.withMemory([newMemory]);
  step = await step.next(Action.EXTERNAL_DIALOG, {
    action: "shouts in all caps",
  });
  console.log("Samantha says: ", step.value);
  return step;
};
const simpleQueuingStrategy: QueuingStrategy = (currentJob, queue, newJob) => {
  currentJob?.abortController?.abort();
  return [newJob];
};
const samanthaRepliesConfig: ProcessConfig = {
  name: "SamanthaReplies",
  process: SamanthaReplies,
};

const initialMemories = [
  {
    role: "system",
    content: "<Context>You are modeling the mind of Samantha</Context>",
  },
] as ChatMessage[];
const cortex = new CortexManager("Samantha", initialMemories, {
  queuingStrategy: simpleQueuingStrategy,
});
cortex.registerProcess(samanthaRepliesConfig);

// run
cortex.queueProcess("SamanthaReplies", {
  role: "user",
  content: "Hello, Samantha!",
} as ChatMessage);

cortex.queueProcess("SamanthaReplies", {
  role: "user",
  content: "F U!",
} as ChatMessage);
