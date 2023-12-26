import { SpanStatusCode, trace } from "@opentelemetry/api";
import { v4 as uuidv4 } from 'uuid';
import { z } from "zod";
import { ChatMessageRoleEnum, FunctionCall, LanguageModelProgramExecutor, FunctionSpecification, RequestOptions } from "./languageModels";
import { OpenAILanguageProgramProcessor } from "./languageModels/openAI"

const tracer = trace.getTracer(
  'open-souls-CortexStep',
  '0.0.1',
);

export interface NextOptions {
  requestOptions?: RequestOptions
  tags?: Record<string, string>
  stream?: boolean
}

interface NextOptionsNonStreaming extends NextOptions {
  stream?: false
}

interface NextOptionsStreaming extends NextOptions {
  stream: true
}

export type NextFunction<
  ParsedArgumentType,
  ProcessFunctionReturnType
> = (step: CortexStep<any>) =>
    Promise<BrainFunction<
      ParsedArgumentType,
      ProcessFunctionReturnType>
    > | BrainFunction<
      ParsedArgumentType,
      ProcessFunctionReturnType
    >;

export interface Memory<MetaDataType = Record<string, unknown>> {
  role: ChatMessageRoleEnum;
  content: string;
  name?: string;
  function_call?: FunctionCall;
  metadata?: MetaDataType;
}

interface BrainStepInit<LastValue = string, MetaDataType = Record<string, unknown>> {
  id?: string;
  parents?: string[];
  tags?: Record<string, string>;
  memories?: Memory<MetaDataType>[];
  lastValue?: LastValue;
  processor?: LanguageModelProgramExecutor
}

interface FunctionOutput<ProcessFunctionReturnType> {
  value: ProcessFunctionReturnType,
  memories?: Memory[]
}

export type StepCommandFunction = (step: CortexStep<any>) => Promise<string> | string
export type StepCommand = string | StepCommandFunction

interface BrainFunctionAsCommand<ParsedArgumentType = string, ProcessFunctionReturnType = string> {
  name?: string;
  description?: string;
  parameters?: z.ZodSchema<ParsedArgumentType>;
  process?: (step: CortexStep<any>, response: ParsedArgumentType) => Promise<FunctionOutput<ProcessFunctionReturnType>> | FunctionOutput<ProcessFunctionReturnType>;
  command: StepCommand;
  commandRole?: ChatMessageRoleEnum;
  stripStreamPrefix?: string | RegExp | ((step: CortexStep<any>) => Promise<string | RegExp> | string | RegExp)
  stripStreamSuffix?: string | RegExp | ((step: CortexStep<any>) => Promise<string | RegExp> | string | RegExp)
}

interface BrainFunctionWithFunction<ParsedArgumentType, ProcessFunctionReturnType> {
  name: string;
  description: string;
  parameters: z.ZodSchema<ParsedArgumentType>;
  process?: (step: CortexStep<any>, response: ParsedArgumentType) => Promise<FunctionOutput<ProcessFunctionReturnType>> | FunctionOutput<ProcessFunctionReturnType>;
  command?: StepCommand;
  commandRole?: ChatMessageRoleEnum;
  stripStreamPrefix?: string | RegExp | ((step: CortexStep<any>) => Promise<string | RegExp> | string | RegExp)
  stripStreamSuffix?: string | RegExp | ((step: CortexStep<any>) => Promise<string | RegExp> | string | RegExp)
}

export type BrainFunction<ParsedArgumentType, ProcessFunctionReturnType> = BrainFunctionAsCommand<ParsedArgumentType, ProcessFunctionReturnType> | BrainFunctionWithFunction<ParsedArgumentType, ProcessFunctionReturnType>

export class CortexStep<LastValueType = undefined> {
  id: string
  parents: string[]
  tags: Record<string, string>

  readonly entityName: string;

  readonly memories: Memory[]
  private lastValue: LastValueType;
  private processor: LanguageModelProgramExecutor

  constructor(entityName: string, { memories, lastValue, processor, id, parents, tags }: BrainStepInit<LastValueType> = {}) {
    this.memories = memories || [];
    this.lastValue = lastValue as LastValueType;
    this.entityName = entityName;
    this.id = id || uuidv4();
    this.parents = parents || []
    this.tags = tags || {}
    this.processor = processor || new OpenAILanguageProgramProcessor();
  }

  get value(): LastValueType {
    return this.lastValue;
  }


  /**
   * Adds the given memories to the step and returns a new step (does not modify existing step)
   * @param memory An array of Memory instances to add.
   * @returns A new CortexStep instance with the added memories.
   */
  withMemory(memory: Memory[]) {
    return new CortexStep<LastValueType>(this.entityName, {
      parents: [...this.parents, this.id],
      tags: { ...this.tags },
      memories: [...this.memories, ...memory],
      lastValue: this.lastValue,
      processor: this.processor,
    });
  }

  /**
   * Returns a new step with the memories provided by the updateFn
   * @param updateFn A function that takes the existing memories and returns the new memories (or a promise of the new memories)
   * @returns A new CortexStep instance with the new memories.
   */
  async withUpdatedMemory(updateFn: (existingMemories: Memory[]) => Memory[] | Promise<Memory[]>) {
    return new CortexStep<LastValueType>(this.entityName, {
      parents: [...this.parents, this.id],
      tags: { ...this.tags },
      memories: await updateFn(this.memories.map((m) => ({ ...m }))),
      lastValue: this.lastValue,
      processor: this.processor,
    });
  }

  public toString(): string {
    return this.memories
      .map((m) => {
        if (m.role === "system") {
          return `<System>\n${m.content}\n</System>`;
        } else if (m.role === "user") {
          return `<User>\n${m.content}\n</User>`;
        } else if (m.role === "assistant") {
          return `<Generated>\n${m.content}\n</Generated>`;
        }
      })
      .join("\n");
  }

  private async stepCommandToString(command?: StepCommand): Promise<string | undefined> {
    if (!command) {
      return undefined
    }
    if (typeof command === 'string') {
      return command
    } else {
      return command(this)
    }
  }

  private memoriesWithCommandString(commandString?: string, commandRole = ChatMessageRoleEnum.System) {
    if (commandString) {
      return [
        ...this.memories,
        {
          role: commandRole,
          content: commandString,
        }
      ]
    }
    return this.memories
  }

  private async executeNextCommand<ParsedArgumentType>(description: BrainFunction<ParsedArgumentType, any>, opts: NextOptions): Promise<ParsedArgumentType> {
    return tracer.startActiveSpan('execute-next-command', async (span) => {
      const rawFn = {
        specification: {
          name: description.name,
          description: description.description,
          parameters: description.parameters,
        },
        command: await this.stepCommandToString(description.command),
      }

      if (rawFn.specification) {
        span.setAttribute("function-call", rawFn.specification.name || "unknown");
      }

      if (rawFn.command) {
        span.setAttribute("command", rawFn.command)
      }

      const memories = this.memoriesWithCommandString(rawFn.command, description.commandRole)

      const resp = await this.processor.execute<ParsedArgumentType>(
        memories,
        {
          functionCall: rawFn.specification.name ? { name: rawFn.specification.name } : undefined,
        },
        (rawFn.specification.name ? [rawFn.specification as FunctionSpecification] : []),
        {
          ...(opts.requestOptions || {}),
          stream: false,
        }
      );

      const parsed = resp.parsedArguments
      span.setAttribute("returned-function-call", JSON.stringify(parsed));
      if (!parsed) {
        throw new Error(`No parsed arguments returned from function call: ${rawFn.specification.name}`)
      }
      return parsed
    })
  }

  private async executeStreamingNext<ParsedArgumentType>(
    description: BrainFunction<ParsedArgumentType, any>,
    opts: NextOptions
  ): Promise<{
    parsed: Promise<ParsedArgumentType>
    stream: AsyncIterable<string>
  }> {
    return tracer.startActiveSpan('execute-next-command', async (span) => {
      const rawFn = {
        specification: {
          name: description.name,
          description: description.description,
          parameters: description.parameters,
        },
        command: await this.stepCommandToString(description.command),
      }

      if (rawFn.specification) {
        span.setAttribute("function-call", rawFn.specification.name || "unknown");
      }

      if (rawFn.command) {
        span.setAttribute("command", rawFn.command)
      }

      const memories = this.memoriesWithCommandString(rawFn.command, description.commandRole)

      const { response, stream: rawStream } = await this.processor.execute<ParsedArgumentType>(
        memories,
        {
          functionCall: rawFn.specification.name ? { name: rawFn.specification.name } : undefined,
        },
        (rawFn.specification.name ? [rawFn.specification as FunctionSpecification] : []),
        {
          ...(opts.requestOptions || {}),
          stream: true,
        }
      );

      const parsed = async () => {
        const resp = await response;
        if (!resp.parsedArguments) {
          throw new Error("missing parsed arguments")
        }
        return resp.parsedArguments
      }

      return {
        parsed: parsed(),
        stream: await this.processStream(rawStream, description),
      }
    })
  }

  /**
   * Processes an input stream by applying optional prefix and suffix filters.
   * If a prefix is defined, the stream will start after the prefix is matched.
   * If a suffix is defined, the stream will end when the suffix is matched.
   * @param stream - The input stream to be processed.
   * @param cognitiveFunc - The cognitive function containing the streamPrefix and streamSuffix.
   * @returns - Returns a Promise that resolves to an AsyncIterable<string> representing the processed stream.
   */
  private async processStream<ParsedArgumentType>(stream: AsyncIterable<string>, cognitiveFunc: BrainFunction<ParsedArgumentType, any>): Promise<AsyncIterable<string>> {
    if (!cognitiveFunc.stripStreamPrefix && !cognitiveFunc.stripStreamSuffix) {
      return stream
    }
    let prefix: RegExp | undefined
    if (cognitiveFunc.stripStreamPrefix) {
      if (typeof cognitiveFunc.stripStreamPrefix === 'string') {
        prefix = new RegExp(cognitiveFunc.stripStreamPrefix)
      } else if (cognitiveFunc.stripStreamPrefix instanceof RegExp) {
        prefix = cognitiveFunc.stripStreamPrefix
      } else {
        prefix = new RegExp(await cognitiveFunc.stripStreamPrefix(this))
      }
    }
    let suffix: RegExp | undefined
    if (cognitiveFunc.stripStreamSuffix) {
      if (typeof cognitiveFunc.stripStreamSuffix === 'string') {
        suffix = new RegExp(cognitiveFunc.stripStreamSuffix)
      } else if (cognitiveFunc.stripStreamSuffix instanceof RegExp) {
        suffix = cognitiveFunc.stripStreamSuffix
      } else {
        suffix = new RegExp(await cognitiveFunc.stripStreamSuffix(this))
      }
    }

    let isStreaming = !prefix
    let prefixMatched = !prefix
    let buffer = ""
    const isStreamingBuffer: string[] = []

    const processedStream = (async function* () {
      for await (const chunk of stream) {
        // if we are already streaming, then we need to look out for a suffix
        // we keep the last 2 chunks in the buffer to check after the stream is finished
        // othwerwise we keep streaming
        if (isStreaming) {
          if (!suffix) {
            yield chunk
            continue;
          }
          isStreamingBuffer.push(chunk)
          if (isStreamingBuffer.length > 2) {
            yield isStreamingBuffer.shift() as string
          }
          continue;
        }

        // if we're not streaming, then keep looking for the prefix, and allow one *more* chunk
        // after detecting a hit on the prefix to come in, in case the prefix has some optional ending
        // characters.
        buffer += chunk;
        if (prefix && prefix.test(buffer)) {
          if (prefixMatched) {
            isStreaming = true;

            buffer = buffer.replace(prefix, '');
            yield buffer; // yield everything after the prefix
            buffer = ''; // clear the buffer
            continue
          }
          prefixMatched = true
        }
      }
      buffer = [buffer, ...isStreamingBuffer].join('')
      if (buffer.length > 0) {
        // if there was some buffer left over, then we need to check if there was a suffix
        // and remove that from the last part of the stream.
        if (suffix) {
          buffer = buffer.replace(suffix, '');
          yield buffer; // yield everything before the suffix
          return
        }
        // if there was no suffix, then just yield what's left.
        yield buffer; // yield the last part of the buffer if anything is left
      }
    })();
    return processedStream;
  }

  /*
   * this is an experimental function that allows you to stream the output of a next function
   * and then get the next step after the streaming is finished.
  */
  private async streamingNext<ParsedArgumentType, ProcessFunctionReturnType>(
    functionFactory: NextFunction<ParsedArgumentType, ProcessFunctionReturnType>,
    opts: NextOptions = {}
  ): Promise<{
    nextStep: Promise<ProcessFunctionReturnType extends undefined ? CortexStep<ParsedArgumentType> : CortexStep<ProcessFunctionReturnType>>,
    stream: AsyncIterable<string>,
  }> {
    return tracer.startActiveSpan('streaming-next', async (span) => {
      try {
        span.setAttributes({
          "entity-name": this.entityName,
          "step-id": this.id,
          "step-parents": JSON.stringify(this.parents),
          ...this.tags,
          ...(opts.tags || {}),
        })

        const description = await functionFactory(this)

        const { stream, parsed: parsedPromise } = await this.executeStreamingNext(description, opts)

        const nextFunc = async () => {
          const parsed = await parsedPromise
          if (description.process) {
            const processed = await description.process(this, parsed)
            span.setAttribute("processed-function-call", JSON.stringify(processed));

            span.end()
            // we return as any here even though it's frowned upon
            // because we have checked the fnSpecs.process ourselves.
            return new CortexStep<ProcessFunctionReturnType>(this.entityName, {
              parents: [...this.parents, this.id],
              memories: [...this.memories, ...(processed.memories || [])],
              lastValue: processed.value,
              tags: { ...this.tags },
              processor: this.processor,
            }) as any
          }

          const newMemory: Memory = {
            role: ChatMessageRoleEnum.Assistant,
            content: typeof parsed === 'string' ? parsed : JSON.stringify(parsed),
          }
          // see note above for why we return as any here.
          span.end()
          return new CortexStep<ParsedArgumentType>(this.entityName, {
            parents: [...this.parents, this.id],
            memories: [...this.memories, newMemory],
            lastValue: parsed,
            tags: { ...this.tags },
            processor: this.processor,
          }) as any
        }

        return {
          nextStep: nextFunc(),
          stream,
        }

      } catch (err: any) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: err?.message ?? 'Error',
        });
        console.error('error in next', err);
        span.end()
        throw err;
      }
    })
  }

  /**
   * compute is very similar to #next, but returns only a value, and NOT a new CortexStep with new memories. 
   * Nothing is modified on this CortexStep.
   */
  async compute<ParsedArgumentType, ProcessFunctionReturnType = undefined>(
    functionFactory: NextFunction<ParsedArgumentType, ProcessFunctionReturnType>,
    opts: NextOptions = {}
  ): Promise<ProcessFunctionReturnType extends undefined ? ParsedArgumentType : ProcessFunctionReturnType> {
    const step = await this.next<ParsedArgumentType, ProcessFunctionReturnType>(functionFactory, { ...opts, stream: false })
    return step.value as ProcessFunctionReturnType extends undefined ? ParsedArgumentType : ProcessFunctionReturnType
  }

  /**
   * next is used to execute CognitiveFunctions on this CortexStep.
   * @param functionFactory - A factory function that returns a cognitive function.
   * @param opts - An optional parameter that can be used to pass per request options and tags
   * @returns - Returns a Promise that resolves to a CortexStep object.
   */
  async next<ParsedArgumentType, ProcessFunctionReturnType = undefined>(
    functionFactory: NextFunction<ParsedArgumentType, ProcessFunctionReturnType>,
    opts?: NextOptionsNonStreaming
  ): Promise<ProcessFunctionReturnType extends undefined ? CortexStep<ParsedArgumentType> : CortexStep<ProcessFunctionReturnType>>

  async next<ParsedArgumentType, ProcessFunctionReturnType = undefined>(
    functionFactory: NextFunction<ParsedArgumentType, ProcessFunctionReturnType>,
    opts?: NextOptionsStreaming
  ): Promise<{
    nextStep: Promise<ProcessFunctionReturnType extends undefined ? CortexStep<ParsedArgumentType> : CortexStep<ProcessFunctionReturnType>>,
    stream: AsyncIterable<string>,
  }>

  async next<ParsedArgumentType, ProcessFunctionReturnType = undefined>(
    functionFactory: NextFunction<ParsedArgumentType, ProcessFunctionReturnType>,
    opts?: NextOptions
  ): Promise<any> {
    if (opts?.stream) {
      return this.streamingNext<ParsedArgumentType, ProcessFunctionReturnType>(functionFactory, opts)
    } else {
      return this.nonStreamingNext<ParsedArgumentType, ProcessFunctionReturnType>(functionFactory, opts)
    }
  }


  private async nonStreamingNext<ParsedArgumentType, ProcessFunctionReturnType = undefined>(
    functionFactory: NextFunction<ParsedArgumentType, ProcessFunctionReturnType>,
    opts: NextOptions = {}
  ): Promise<ProcessFunctionReturnType extends undefined ? CortexStep<ParsedArgumentType> : CortexStep<ProcessFunctionReturnType>> {
    return tracer.startActiveSpan('next', async (span) => {
      try {
        span.setAttributes({
          "entity-name": this.entityName,
          "step-id": this.id,
          "step-parents": JSON.stringify(this.parents),
          ...this.tags,
          ...(opts.tags || {}),
        })

        const description = await functionFactory(this)

        const parsed = await this.executeNextCommand(description, opts)

        if (description.process) {
          const processed = await description.process(this, parsed)
          span.setAttribute("processed-function-call", JSON.stringify(processed));

          span.end()
          // we return as any here even though it's frowned upon
          // because we have checked the fnSpecs.process ourselves.
          return new CortexStep<ProcessFunctionReturnType>(this.entityName, {
            parents: [...this.parents, this.id],
            memories: [...this.memories, ...(processed.memories || [])],
            lastValue: processed.value,
            tags: { ...this.tags },
            processor: this.processor,
          }) as any
        }

        const newMemory: Memory = {
          role: ChatMessageRoleEnum.Assistant,
          content: typeof parsed === 'string' ? parsed : JSON.stringify(parsed),
        }

        // see note above for why we return as any here.
        span.end()
        return new CortexStep<ParsedArgumentType>(this.entityName, {
          parents: [...this.parents, this.id],
          memories: [...this.memories, newMemory],
          lastValue: parsed,
          tags: { ...this.tags },
          processor: this.processor,
        }) as any
      } catch (err: any) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: err?.message ?? 'Error',
        });
        console.error('error in next', err);
        span.end()
        throw err;
      }
    })

  }

}
