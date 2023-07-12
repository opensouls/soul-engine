// one directive at a time
// get local copy of memory to work with
// memory updates occur inbetween directives
// mutate function passed into directive that updates the memory

// TODO: CortexStep.withRecall(recallWorkingMemory: (memory: MemoryStore) => ChatMessages[])
// TODO: CortexStep.withModel(recallModel: (memory: MemoryStore) => ChatMessages)
// TODO: CortexStep.withModelUpdate(recallModel: (memory: MemoryStore) => ChatMessages, action)

import { AbortController, AbortSignal } from "abort-controller";
import _ from "lodash";

export type MemoryStore = Record<string, any>;

export type MutateFunction = (
  mutator: (memory: MemoryStore) => Partial<MemoryStore>
) => void;

export type Directive = (
  signal: AbortSignal,
  event: any,
  memory: MemoryStore,
  mutate: MutateFunction
) => Promise<void>;

interface Job {
  directive: Directive;
  event: any;
  abortController: AbortController;
  mutations: Partial<MemoryStore>[];
}

export interface DirectiveConfig {
  name: string;
  directive: Directive;
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

export class Cortex {
  private directiveQueue: Job[] = [];
  private currentJob: Job | null = null;
  private directives = new Map<string, Directive>();

  private memoryStore: MemoryStore = {};

  constructor(
    private queuingStrategy: QueuingStrategy = defaultQueuingStrategy
  ) {}

  registerDirective({ name, directive }: DirectiveConfig) {
    this.directives.set(name, directive);
  }

  queueDirective(name: string, event: any) {
    const directive = this.directives.get(name);
    if (!directive) throw new Error(`Directive ${name} does not exist`);

    const job: Job = {
      directive,
      event,
      abortController: new AbortController(),
      mutations: [],
    };

    this.directiveQueue = this.queuingStrategy(
      this.currentJob,
      this.directiveQueue,
      job
    );
    this.dispatch().catch(() => {});
  }

  private async dispatch() {
    while (this.directiveQueue.length > 0) {
      const job = this.directiveQueue.shift() as Job;

      this.currentJob = job;
      const mutate: MutateFunction = (mutator) =>
        job.mutations.push(mutator(this.memoryStore));
      await job.directive(
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
