import {
  CortexManager,
  MutateFunction,
  QueuingStrategy,
  MemoryStore,
  ProcessConfig,
} from "../src/index";
import { AbortSignal } from "abort-controller";

const SamanthaReplies = async (
  signal: AbortSignal,
  event: string,
  memory: MemoryStore,
  mutate: MutateFunction
) => {
  console.log("Samantha: I received your message - ", event);
};
const simpleQueuingStrategy: QueuingStrategy = (currentJob, queue, newJob) => {
  currentJob?.abortController?.abort();
  return [newJob];
};
const samanthaRepliesConfig: ProcessConfig = {
  name: "SamanthaReplies",
  process: SamanthaReplies,
};

const cortex = new CortexManager(simpleQueuingStrategy);
cortex.registerProcess(samanthaRepliesConfig);

cortex.queueProcess("SamanthaReplies", "Hello, Samantha!");
