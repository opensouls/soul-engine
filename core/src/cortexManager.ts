// one process at a time
// get local copy of memory to work with
// memory updates occur inbetween processes
// mutate function passed into process that updates the memory

// TODO: CortexStep.withRecall(recallWorkingMemory: (memory: MemoryStore) => ChatMessages[])
// TODO: CortexStep.withModel(recallModel: (memory: MemoryStore) => ChatMessages)
// TODO: CortexStep.withModelUpdate(recallModel: (memory: MemoryStore) => ChatMessages, action)

import { AbortController, AbortSignal } from "abort-controller";
import _ from "lodash";

export type MemoryStore = Record<string, any>;

export type MutateFunction = (
  mutator: (memory: MemoryStore) => Partial<MemoryStore>
) => void;

export type MentalProcess = (
  signal: AbortSignal,
  event: any,
  memory: MemoryStore,
  mutate: MutateFunction
) => Promise<void>;

interface Job {
  process: MentalProcess;
  event: any;
  abortController: AbortController;
  mutations: Partial<MemoryStore>[];
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

export class CortexManager {
  private processQueue: Job[] = [];
  private currentJob: Job | null = null;
  private processes = new Map<string, MentalProcess>();

  private memoryStore: MemoryStore = {};

  constructor(
    private queuingStrategy: QueuingStrategy = defaultQueuingStrategy
  ) {}

  registerProcess({ name, process }: ProcessConfig) {
    this.processes.set(name, process);
  }

  queueProcess(name: string, event: any) {
    const process = this.processes.get(name);
    if (!process) throw new Error(`Process ${name} does not exist`);

    const job: Job = {
      process,
      event,
      abortController: new AbortController(),
      mutations: [],
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
      const mutate: MutateFunction = (mutator) =>
        job.mutations.push(mutator(this.memoryStore));
      await job.process(
        job.abortController.signal,
        job.event,
        _.cloneDeep(this.memoryStore),
        mutate
      );

      // Apply queued mutations
      for (const mutation of job.mutations) {
        this.memoryStore = {
          ...this.memoryStore,
          ...mutation,
        };
      }

      this.currentJob = null;
    }
  }
}
