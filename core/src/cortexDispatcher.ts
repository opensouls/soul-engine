// one process at a time
// get local copy of memory to work with
// memory updates occur inbetween processes

import { AbortController, AbortSignal } from "abort-controller";
import { CortexStep } from "./cortexStep";
import { ChatMessage } from "./languageModels";
import { Mutex } from "async-mutex";

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

export class CortexDispatcher {
  private processQueue: Job[] = [];
  private currentJob: Job | null = null;
  private processes = new Map<string, MentalProcess>();
  private lastStep: CortexStep;
  private readonly queuingStrategy = defaultQueuingStrategy;
  private isRunning = false;
  private mutex = new Mutex();

  constructor(firstStep: CortexStep, options?: ManagerOptions) {
    if (options?.queuingStrategy) {
      this.queuingStrategy = options.queuingStrategy;
    }
    this.lastStep = firstStep;
  }

  register({ name, process }: ProcessConfig) {
    this.processes.set(name, process);
  }

  async dispatch(name: string, newMemory: ChatMessage) {
    const release = await this.mutex.acquire();
    try {
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

      if (!this.isRunning) {
        this.isRunning = true;
        this.run().catch((error) => {
          console.error("Error in dispatch:", error);
        });
      }
    } finally {
      release();
    }
  }

  private async run() {
    let nextJob: Job | null = null;

    do {
      await this.mutex.runExclusive(() => {
        nextJob = this.processQueue.shift() || null;
        this.currentJob = nextJob;
        this.isRunning = this.processQueue.length > 0;
      });

      if (nextJob) {
        try {
          this.lastStep = await (nextJob as Job).process(
            (nextJob as Job).abortController.signal,
            (nextJob as Job).newMemory,
            this.lastStep
          );
        } catch (error) {
          console.error("Error in job process:", error);
        } finally {
          await this.mutex.runExclusive(() => {
            this.currentJob = null;
          });
        }
      }
    } while (nextJob);
  }
}
