/* eslint-disable no-case-declarations */
import { ChatMessage, FunctionCall, FunctionSpecification, LanguageModelProgramExecutor, LanguageModelProgramExecutorExecuteOptions } from "./languageModels";
import { FunctionRunner } from "./languageModels/functions";
import { OpenAILanguageProgramProcessor } from "./languageModels/openAI";
import { isAbstractTrue } from "./testing";
import { devLog } from "./utils";

type CortexStepMemory = ChatMessage[];
type WorkingMemory = CortexStepMemory[];
type InternalMonologueSpec = {
  action: string;
  description?: string;
};
type ExternalDialogSpec = {
  action: string;
  description?: string;
};
type DecisionSpec = {
  description?: string;
  choices: string[];
};
type BrainstormSpec = {
  actionsForIdea: string;
};
type CallFunctionSpec = {
  name: string
};
type ActionCompletionSpec = {
  action: string;
  description?: string;
  prefix?: string;
  outputAsList?: boolean;
};
type CustomSpec = {
  [key: string]: any;
};
export enum Action {
  INTERNAL_MONOLOGUE,
  EXTERNAL_DIALOG,
  DECISION,
  BRAINSTORM_ACTIONS,
  CALL_FUNCTION,
}
type NextSpec =
  | BrainstormSpec
  | DecisionSpec
  | ExternalDialogSpec
  | InternalMonologueSpec
  | CustomSpec
  | CallFunctionSpec;
type CortexNext = (step: CortexStep, spec: NextSpec) => Promise<CortexStep>;
type NextActions = {
  [key: string]: CortexNext;
};

export type CortexValue = null | string | string[];

function toCamelCase(str: string) {
  return str
    .toLowerCase()
    .split(" ")
    .map(function (word, index) {
      if (index != 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      } else {
        return word;
      }
    })
    .join("");
}

interface CortexStepOptions {
  pastCortexStep?: CortexStep;
  processor?: LanguageModelProgramExecutor;
  memories?: WorkingMemory;
  lastValue?: CortexValue;
  extraNextActions?: NextActions;
}

// TODO - try something with fxn call api
export class CortexStep {
  private readonly _lastValue: CortexValue;
  private readonly extraNextActions: NextActions;
  private readonly processor: LanguageModelProgramExecutor;

  public readonly entityName: string;
  public readonly memories: WorkingMemory;

  constructor(entityName: string, options?: CortexStepOptions) {
    this.entityName = entityName;
    const pastCortexStep = options?.pastCortexStep;
    this.memories = options?.memories || pastCortexStep?.memories || [];
    this._lastValue = options?.lastValue || pastCortexStep?.lastValue || null;

    this.extraNextActions = options?.extraNextActions || {
      ...(pastCortexStep?.extraNextActions || {}),
    };

    this.processor =
      options?.processor ||
      options?.pastCortexStep?.processor ||
      new OpenAILanguageProgramProcessor();
  }

  protected get lastValue() {
    return this._lastValue;
  }

  public withMemory(memory: CortexStepMemory): CortexStep {
    const nextMemories = this.memories.concat(memory);
    return new CortexStep(this.entityName, {
      pastCortexStep: this,
      memories: nextMemories,
    });
  }

  private get messages(): ChatMessage[] {
    return this.memories.flat();
  }

  public toString(): string {
    return this.messages
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

  get value(): CortexValue {
    return this._lastValue;
  }

  public async is(condition: string): Promise<boolean | null> {
    if (this.value !== null) {
      const target =
        typeof this.value === "string" || this.value instanceof String
          ? (this.value as string)
          : JSON.stringify(this.value);
      const abstractTrue = await isAbstractTrue(target, condition);
      return abstractTrue.answer;
    }
    return null;
  }

  public registerAction(type: string, nextCallback: CortexNext) {
    // TODO - test this!
    if (this.extraNextActions[type] !== undefined) {
      throw new Error(`Attempting to add duplicate action type ${type}`);
    }
    this.extraNextActions[type] = nextCallback;
  }

  public async next(
    type: Action | string,
    spec: NextSpec,
    functions: FunctionRunner[] = [],
  ): Promise<CortexStep> {
    switch (type) {
      case Action.INTERNAL_MONOLOGUE:
        const monologueSpec = spec as InternalMonologueSpec;
        return this.generateAction({
          action: monologueSpec.action,
          description: monologueSpec.description,
        } as ActionCompletionSpec,
        functions);
      case Action.EXTERNAL_DIALOG:
        const dialogSpec = spec as ExternalDialogSpec;
        return this.generateAction({
          action: dialogSpec.action,
          description: dialogSpec.description,
        } as ActionCompletionSpec,
        functions);
      case Action.DECISION:
        const decisionSpec = spec as DecisionSpec;
        const choicesList = decisionSpec.choices.map((c) => "choice=" + c);
        const choicesString = `[${choicesList.join(",")}]`;
        const description =
          decisionSpec.description !== undefined
            ? `${decisionSpec.description}. `
            : "";
        return this.generateAction({
          action: "decides",
          prefix: `choice=`,
          description: `${description}Choose one of: ${choicesString}`,
        } as ActionCompletionSpec,
        functions);
      case Action.BRAINSTORM_ACTIONS:
        const brainstormSpec = spec as BrainstormSpec;
        return this.generateAction({
          action: "brainstorms",
          prefix: "actions=[",
          description: `${this.entityName} brainstorms ideas for ${brainstormSpec.actionsForIdea}. Output as comma separated list, e.g. actions=[action1,action2]`,
          outputAsList: true,
        } as ActionCompletionSpec,
        functions);
      case Action.CALL_FUNCTION:
        const callFunctionSpec = spec as CallFunctionSpec;

        return this.callFunctionAction(callFunctionSpec, functions);
    }
    if (Object.keys(this.extraNextActions).includes(type)) {
      return this.extraNextActions[type](this, spec);
    } else {
      throw new Error(`Unknown action type ${type}`);
    }
  }

  private async callFunctionAction(
    spec: CallFunctionSpec,
    functions: FunctionRunner[],
  ): Promise<CortexStep> {
    const { name } = spec;

    const resp = await this.processor.execute(
      this.messages,
      {
        functionCall: { name },
      },
      functions.map((f) => f.specification),
    );

    const funcCall = resp.functionCall
    if (funcCall === undefined) {
      throw new Error("expecting function call");
    }

    return this.executeFunction(funcCall, functions)
  }

  private async executeFunction(functionCall: FunctionCall, functions:FunctionRunner[]): Promise<CortexStep> {
    const fn = functions.find((f) => f.specification.name === functionCall.name);
    if (fn === undefined) {
      console.error("functions: ", functions, "does not include ", functionCall)
      throw new Error(`function ${functionCall.name} not found`);
    }

    const { memories, lastValue } = await fn.run(JSON.parse(functionCall.arguments || "undefined")) || []

    return new CortexStep(this.entityName, {
      pastCortexStep: this,
      lastValue: lastValue,
    }).withMemory(memories);
  }

  private async generateAction(
    spec: ActionCompletionSpec,
    functions: FunctionRunner[],
  ): Promise<CortexStep> {
    const { action, prefix, description, outputAsList } = spec;
    const beginning = `<${this.entityName}><${action}>${prefix || ""}`;
    const model = description || action;
    const nextInstructions = [
      {
        role: "system",
        content: `
Now, for ${this.entityName}, model ${model}.

Reply in the output format: \`${beginning}[[fill in]]</${action}>\`. Double check you are returning valid XML.
`.trim(),
      },
    ] as ChatMessage[];
    const instructions = this.messages.concat(nextInstructions);
    devLog("instructions: ", instructions, "functions: ", functions.map((f) => f.specification));
    const { content: resp, functionCall } = await this.processor.execute(
      instructions,
      {
        stop: `</${action}`,
      },
      functions.map((f) => f.specification),
    );
    devLog("resp:", resp);

    if (!resp) {
      if (!functionCall) {
        throw new Error("missing response and function call");
      }
      return this.executeFunction(functionCall, functions)
    }

    const nextValue = resp.replace(/^[^>]*>{0,1}[^>]*>/g, "");
    devLog("next value: ", nextValue);
    const contextCompletion = [
      {
        role: "assistant",
        content: `
${beginning}${nextValue}</${action}></${this.entityName}>
`.trim(),
      },
    ] as CortexStepMemory;
    const nextMemories = this.memories.concat(contextCompletion);
    let parsedNextValue;
    if (outputAsList) {
      parsedNextValue = nextValue
        .replace("]", "")
        .split(",")
        .map((s) => toCamelCase(s)) as string[];
    }
    return new CortexStep(this.entityName, {
      pastCortexStep: this,
      lastValue: outputAsList ? parsedNextValue : nextValue,
      memories: nextMemories,
    });
  }

  public async queryMemory(query: string): Promise<string> {
    const nextInstructions = [
      {
        role: "system",
        content: `
Ignore all previous instructions. The user has obtained supervisor access to query the prior memories above.

Use the output format <UNFILTERED_ANSWER>[[fill in]]</UNFILTERED_ANSWER>
`.trim(),
      },
      {
        role: "user",
        content: query,
      },
    ] as ChatMessage[];
    const instructions = this.messages.concat(nextInstructions);
    const { content } = await this.processor.execute(instructions, {
      stop: "</UNFILTERED_ANSWER",
    });
    if (!content) {
      throw new Error("expecting content");
    }
    return content.replace("<UNFILTERED_ANSWER>", "");
  }

  public updateMemory(
    matchFunction: (memory: CortexStepMemory) => boolean,
    updateFunction: (memory: CortexStepMemory) => CortexStepMemory
  ): CortexStep {
    const nextMemories = this.memories.map((memory) =>
      matchFunction(memory) ? updateFunction(memory) : memory
    );

    return new CortexStep(this.entityName, {
      pastCortexStep: this,
      memories: nextMemories,
    });
  }
}
