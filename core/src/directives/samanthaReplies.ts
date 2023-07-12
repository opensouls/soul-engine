import { AbortController, AbortSignal } from "abort-controller";

type Directive<TEvent = any> = (
  signal: AbortSignal,
  event: TEvent
) => Promise<void>;
type QueuingStrategy<Job> = (
  currentJob: Job | null,
  queue: Job[],
  newJob: Job
) => Job[];

interface Job<TEvent = any> {
  event: TEvent;
  abortController: AbortController;
}

interface DirectiveMetaData<TEvent = any> {
  directive: Directive<TEvent>;
  queuingStrategy: QueuingStrategy<Job<TEvent>>;
  jobs: Job<TEvent>[];
  currentJob: Job<TEvent> | null;
}

export interface DirectiveConfig<TEvent = any> {
  name: string;
  directive: Directive<TEvent>;
  queuingStrategy: QueuingStrategy<Job<TEvent>>;
}

type Dispatcher = (meta: DirectiveMetaData<any>) => void;

export class Cortex {
  private directives = new Map<string, DirectiveMetaData>();

  constructor(private dispatcher: Dispatcher = Cortex.localDispatcher) {}

  registerDirective({ name, directive, queuingStrategy }: DirectiveConfig) {
    this.directives.set(name, {
      directive,
      queuingStrategy,
      jobs: [],
      currentJob: null,
    });
  }

  queueDirective(name: string, event: any) {
    const meta = this.directives.get(name);
    if (!meta) throw new Error(`Directive ${name} does not exist`);

    const job: Job = {
      event,
      abortController: new AbortController(),
    };

    meta.jobs = meta.queuingStrategy(meta.currentJob, meta.jobs, job);

    this.dispatcher(meta);
  }

  private static async localDispatcher(meta: DirectiveMetaData<any>) {
    while (meta.jobs.length > 0) {
      const job = meta.jobs.shift() as Job;

      meta.currentJob = job;
      await meta.directive(job.abortController.signal, job.event);
      if (job.abortController.signal.aborted) {
        break;
      }
      meta.currentJob = null;
    }
  }
}
