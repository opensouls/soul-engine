import {
  Cortex,
  DirectiveConfig,
  MutateFunction,
  QueuingStrategy,
  MemoryStore,
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
const samanthaRepliesConfig: DirectiveConfig = {
  name: "SamanthaReplies",
  directive: SamanthaReplies,
};

const cortex = new Cortex(simpleQueuingStrategy);
cortex.registerDirective(samanthaRepliesConfig);

cortex.queueDirective("SamanthaReplies", "Hello, Samantha!");
