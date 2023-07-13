// one process at a time
// get local copy of memory to work with
// memory updates occur inbetween processes
// mutate function passed into process that updates the memory

// TODO: CortexStep.withRecall(recallWorkingMemory: (memory: MemoryStore) => ChatMessages[])
// TODO: CortexStep.withModel(recallModel: (memory: MemoryStore) => ChatMessages)
// TODO: CortexStep.withModelUpdate(recallModel: (memory: MemoryStore) => ChatMessages, action)

import { AbortController, AbortSignal } from "abort-controller";
import { CortexStep } from "./cortexStep";
import { ChatMessage } from "./languageModels";

export type MentalProcess = (
  signal: AbortSignal,
  newMemory: ChatMessage,
  lastStep: CortexStep
) => Promise<CortexStep>;

interface Job {
  process: MentalProcess;
  newMemory: ChatMessage;
  abortController: AbortController;
}

export interface ProcessConfig {
  name: string;
  process: MentalProcess;
}

export type QueuingStrategy = (
  currentJob: Job | null,
  queue: Job[],
  newJob: Job
) => Job[];

export const defaultQueuingStrategy: QueuingStrategy = (
  currentJob: Job | null,
  queue: Job[],
  newJob: Job
) => [...queue, newJob];

type ManagerOptions = {
  queuingStrategy: QueuingStrategy;
};

export class CortexManager {
  private processQueue: Job[] = [];
  private currentJob: Job | null = null;
  private processes = new Map<string, MentalProcess>();
  private lastStep: CortexStep;
  private queuingStrategy = defaultQueuingStrategy;

  constructor(firstStep: CortexStep, options?: ManagerOptions) {
    if (options?.queuingStrategy) {
      this.queuingStrategy = options.queuingStrategy;
    }
    this.lastStep = firstStep;
  }

  registerProcess({ name, process }: ProcessConfig) {
    this.processes.set(name, process);
  }

  queueProcess(name: string, newMemory: ChatMessage) {
    const process = this.processes.get(name);
    if (!process) throw new Error(`Process ${name} does not exist`);

    const job: Job = {
      process,
      newMemory,
      abortController: new AbortController(),
    };

    this.processQueue = this.queuingStrategy(
      this.currentJob,
      this.processQueue,
      job
    );
    this.dispatch().catch(() => {});
  }

  private async dispatch() {
    while (this.processQueue.length > 0) {
      const job = this.processQueue.shift() as Job;

      this.currentJob = job;
      this.lastStep = await job.process(
        job.abortController.signal,
        job.newMemory,
        this.lastStep
      );
      this.currentJob = null;
    }
  }
}
