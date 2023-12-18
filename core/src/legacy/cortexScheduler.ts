// one process at a time
// get local copy of memory to work with
// memory updates occur inbetween processes

import {
  AbortController as NodeAbortController,
  AbortSignal,
} from "abort-controller";
import { CortexStep } from "./cortexStep";
import { ChatMessage } from "./languageModels";
import { Mutex } from "async-mutex";

const AbortController = globalThis.AbortController || NodeAbortController;

interface Job {
  process: MentalProcess;
  newMemory: ChatMessage;
  abortController: AbortController;
  jobCompletion: { resolve: () => void; promise: Promise<void> };
}

type ManagerOptions = {
  queuingStrategy: QueuingStrategy;
};

/**
 * `MentalProcess` is a type that represents a function performing cognitive
 * operations. These operations could be anything from data retrieval,
 * processing, or AI computations. It requires an AbortSignal for handling
 * abort scenarios, a newMemory object for context, and lastStep which is the
 * last performed CortexStep. It returns a promise that resolves with a new
 * CortexStep.
 *
 * @typedef {(signal: AbortSignal, newMemory: ChatMessage, lastStep: CortexStep) => Promise<CortexStep>} MentalProcess
 */
export type MentalProcess = (
  signal: AbortSignal,
  newMemory: ChatMessage,
  lastStep: CortexStep
) => Promise<CortexStep>;

/**
 * `ProcessConfig` interface represents the configuration for a mental process.
 * It contains the name of the process and the process function itself.
 *
 * @interface ProcessConfig
 */
export interface ProcessConfig {
  name: string;
  process: MentalProcess;
}

/**
 * `QueuingStrategy` is a function type that defines how jobs are queued in the
 * CortexScheduler. It takes the current job, the existing queue, and the new job
 * and returns a modified queue.
 *
 * @typedef {(currentJob: Job | null, queue: Job[], newJob: Job) => Job[]} QueuingStrategy
 */
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

/**
 * `CortexScheduler` is a class that manages the execution of mental processes
 * in a queue. It ensures that only one process runs at a time, and provides
 * mechanisms for process registration, dispatching, and cancellation.
 *
 * @class CortexScheduler
 *
 * @method register: Used to register a new process in the CortexScheduler.
 * @method dispatch: Adds a process to the queue and starts the process if
 * the CortexScheduler is not currently running any process.
 * @method run: Starts the execution of jobs in the queue. It dequeues the next
 * job and runs the mental process. If an error occurs, it is logged and the
 * next job is dequeued.
 */
export class CortexScheduler {
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

  async dispatch(name: string, newMemory: ChatMessage): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      const process = this.processes.get(name);
      if (!process) throw new Error(`Process ${name} does not exist`);

      const job: Job = {
        process,
        newMemory,
        abortController: new AbortController(),
        jobCompletion: (() => {
          let resolve: () => void;
          const promise = new Promise<void>((r) => {
            resolve = r;
          });
          return { resolve: resolve!, promise };
        })(),
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
      return job.jobCompletion.promise;
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
        nextJob = nextJob as Job;
        try {
          this.lastStep = await nextJob.process(
            nextJob.abortController.signal as AbortSignal,
            nextJob.newMemory,
            this.lastStep
          );
        } catch (error) {
          console.error("Error in job process:", error);
        } finally {
          await this.mutex.runExclusive(() => {
            this.currentJob = null;
            nextJob?.jobCompletion?.resolve();
          });
        }
      }
    } while (nextJob);
  }
}
