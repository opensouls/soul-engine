import { ChatMessageRoleEnum, FunctionCall, LanguageModelProgramExecutor, OpenAILanguageProgramProcessor } from "..";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema"
import { FunctionRunner } from "../languageModels/functions";

export type NextFunction<T, R, FR> = (step: BrainStep<T>) => Promise<BrainFunction<T, R, FR>> | BrainFunction<T, R, FR>;

export interface Memory<MetaDataType = Record<string, unknown>> {
  role: ChatMessageRoleEnum;
  content: string;
  name?: string;
  function_call?: FunctionCall;
  metadata?: MetaDataType;
}

interface BrainStepInit<LastValue=string, MetaDataType = Record<string, unknown>> {
  memories?: Memory<MetaDataType>[];
  lastValue?: LastValue;
  processor?: LanguageModelProgramExecutor
}

const zodToSchema = (zod:z.ZodSchema) => {
  const schema = zodToJsonSchema(zod)

  delete schema["$schema"]
  delete (schema as any)["additionalProperties"]
  return schema
}

interface FunctionOutput<R> {
  value: R,
  memories?: Memory[]
}

export interface BrainFunction<T, R, FR> {
  name: string;
  description: string;
  parameters: z.ZodSchema<R>;
  process?: (step: BrainStep<T>, response: R) => Promise<FunctionOutput<FR>> | FunctionOutput<FR>;
}

interface BrainFunctionRunner<T> {
  specification: FunctionRunner["specification"]
  zod: z.ZodSchema<T>
}

const makeFunction = <T>(name:string, description:string, params:z.ZodSchema<T>):BrainFunctionRunner<T> => {
  return {
    specification: {
      name,
      description,
      parameters: zodToSchema(params),
    },
    zod: params,
  }
}

export class BrainStep<T=undefined> {
  private memories: Memory[]

  private lastValue: T;

  readonly entityName: string;
  private processor: LanguageModelProgramExecutor

  constructor(entityName: string, { memories, lastValue, processor }: BrainStepInit<T> = {}) {
    this.memories = memories || [];
    this.lastValue = lastValue as T;
    this.entityName = entityName;
    this.processor = processor || new OpenAILanguageProgramProcessor();
  }

  get value(): T {
    return this.lastValue;
  }

  withMemory(memory: Memory[]) {
    return new BrainStep<T>(this.entityName, {
      memories: [...this.memories, ...memory],
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

  async next<R, FR = undefined>(functionFactory: NextFunction<T, R, FR>): Promise<FR extends undefined ? BrainStep<R> : BrainStep<FR>> {
    const fnSpecs = await functionFactory(this);
    const rawFn = makeFunction(fnSpecs.name, fnSpecs.description, fnSpecs.parameters);
    const resp = await this.processor.execute(
      this.memories,
      {
        functionCall: { name: rawFn.specification.name },
      },
      [rawFn.specification]
    );

    const funcCall = resp.functionCall;
    if (funcCall === undefined) {
      throw new Error("expecting function call");
    }

    const parsed = fnSpecs.parameters.safeParse(JSON.parse(funcCall.arguments || "{}"));

    if (!parsed.success) {
      console.error("parse error: ", parsed.error)
      throw new Error("Failed to parse arguments");
    }
    if (fnSpecs.process) {
      // we return as any here even though it's frowned upon
      // because we have checked the fnSpecs.process ourselves.
      const processed = await fnSpecs.process(this, parsed.data)
      return new BrainStep<FR>(this.entityName, {
        memories: [...this.memories, ...(processed.memories || [])],
        lastValue: processed.value,
        processor: this.processor,
      }) as any
    }

    const newMemory:Memory = {
      role: ChatMessageRoleEnum.Assistant,
      content: JSON.stringify(parsed.data)
    }

    // see note above for why we return as any here.
    return new BrainStep<R>(this.entityName, {
      memories: [...this.memories, newMemory],
      lastValue: parsed.data,
      processor: this.processor,
    }) as any
  }
}
