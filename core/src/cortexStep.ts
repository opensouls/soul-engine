import { ChatMessage } from "./languageModels";
import { OpenAILanguageProgramProcessor } from "./languageModels/openAI";

type CortexStepMemory = ChatMessage[];
type WorkingMemory = CortexStepMemory[];
type PastCortexStep = {
  lastValue?: null | string;
  memories: WorkingMemory;
};
type InternalMonologueSpec = {
  action: string;
  description: string;
};
type ExternalDialogSpec = {
  action: string;
  description: string;
};
type DecisionSpec = {
  description: string;
  choices: string[];
};
type ActionCompletionSpec = {
  action: string;
  prefix?: string;
  description: string;
};
type CustomSpec = {
  [key: string]: any;
};
export enum Action {
  INTERNAL_MONOLOGUE,
  EXTERNAL_DIALOG,
  DECISION,
}
type NextSpec =
  | DecisionSpec
  | ExternalDialogSpec
  | InternalMonologueSpec
  | CustomSpec;
type CortexNext = (spec: NextSpec) => CortexStep;
type NextActions = {
  [key: string]: CortexNext;
};

export class CortexStep {
  private readonly entityName: string;
  private readonly _lastValue: null | string;
  private memories: WorkingMemory;
  private extraNextActions: NextActions;

  constructor(entityName: string, pastCortexStep?: PastCortexStep) {
    this.entityName = entityName;
    if (pastCortexStep?.memories) {
      this.memories = pastCortexStep.memories;
    } else {
      this.memories = [];
    }
    if (pastCortexStep?.lastValue) {
      this._lastValue = pastCortexStep.lastValue;
    } else {
      this._lastValue = null;
    }
    this.extraNextActions = {};
  }

  public pushMemory(memory: CortexStepMemory) {
    this.memories.push(memory);
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

  get value() {
    return this._lastValue;
  }

  // TODO - abstract equals
  //   public async valueIsEqualTo(abstractCondition: string) {
  //     const nextInstructions = [
  //       {
  //         role: "system",
  //         content: `
  // You are to evaluate the truthfulness of a value against a condition.
  //
  // ...
  // `.trim(),
  //       },
  //     ] as ChatMessage[];
  //     const instructions = this.messages.concat(nextInstructions);
  //     const processor = new OpenAILanguageProgramProcessor(
  //       {},
  //       {
  //         stop: `</${action}`,
  //       }
  //     );
  //     const nextValue = (await processor.execute(instructions)).slice(
  //       beginning.length
  //     );
  //   }

  // TODO - brainstorm actions

  public registerAction(type: string, nextCallback: CortexNext) {
    // TODO - test this!
    if (this.extraNextActions[type] !== undefined) {
      throw new Error(`Attempting to add duplicate action type ${type}`);
    }
    this.extraNextActions[type] = nextCallback;
  }

  public async next(
    type: Action | string,
    spec: NextSpec
  ): Promise<CortexStep> {
    if (type === Action.INTERNAL_MONOLOGUE) {
      const monologueSpec = spec as InternalMonologueSpec;
      return this.generateAction({
        action: monologueSpec.action,
        description: monologueSpec.description,
      } as ActionCompletionSpec);
    } else if (type === Action.EXTERNAL_DIALOG) {
      const dialogSpec = spec as ExternalDialogSpec;
      return this.generateAction({
        action: dialogSpec.action,
        description: dialogSpec.description,
      } as ActionCompletionSpec);
    } else if (type === Action.DECISION) {
      const decisionSpec = spec as DecisionSpec;
      const choicesList = decisionSpec.choices.map((c) => "choice=" + c);
      const choicesString = `[${choicesList.join(",")}]`;
      const description = decisionSpec.description;
      return this.generateAction({
        action: "decides",
        prefix: `choice=`,
        description: `${description}. Choose one of: ${choicesString}`,
      } as ActionCompletionSpec);
    } else if (Object.keys(this.extraNextActions).includes(type)) {
      return this.extraNextActions[type](spec);
    } else {
      throw new Error(`Unknown action type ${type}`);
    }
  }

  private async generateAction(
    spec: ActionCompletionSpec
  ): Promise<CortexStep> {
    const { action, prefix, description } = spec;
    const beginning = `<${this.entityName}><${action}>${prefix || ""}`;
    const nextInstructions = [
      {
        role: "system",
        content: `
Now, for ${this.entityName}, model ${description}.

Reply in the output format: ${beginning}[[fill in]]</${action}>
`.trim(),
      },
    ] as ChatMessage[];
    const instructions = this.messages.concat(nextInstructions);
    const processor = new OpenAILanguageProgramProcessor(
      {},
      {
        stop: `</${action}`,
      }
    );
    const nextValue = (await processor.execute(instructions)).slice(
      beginning.length
    );
    const contextCompletion = [
      {
        role: "assistant",
        content: `
${beginning}${nextValue}</${action}></${this.entityName}>
`.trim(),
      },
    ] as CortexStepMemory;
    const nextMemories = this.memories.concat(contextCompletion);
    return new CortexStep(this.entityName, {
      lastValue: nextValue,
      memories: nextMemories,
    } as PastCortexStep);
  }
}
