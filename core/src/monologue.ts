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
export enum Action {
  INTERNAL_MONOLOGUE,
  EXTERNAL_DIALOG,
  DECISION,
}

export class CortexStep {
  private readonly entityName: string;
  private readonly _lastValue: null | string;
  private memories: WorkingMemory;

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

  public async next(
    action: Action,
    spec: DecisionSpec | ExternalDialogSpec | InternalMonologueSpec
  ) {
    if (action === Action.INTERNAL_MONOLOGUE) {
      const monologueSpec = spec as InternalMonologueSpec;
      return this.generateAction({
        action: monologueSpec.action,
        description: monologueSpec.description,
      } as ActionCompletionSpec);
    } else if (action === Action.EXTERNAL_DIALOG) {
      const dialogSpec = spec as ExternalDialogSpec;
      return this.generateAction({
        action: dialogSpec.action,
        description: dialogSpec.description,
      } as ActionCompletionSpec);
    } else if (action === Action.DECISION) {
      const decisionSpec = spec as DecisionSpec;
      const choicesList = decisionSpec.choices.map((c) => "choice=" + c);
      const choicesString = `[${choicesList.join(",")}]`;
      const description = decisionSpec.description;
      return this.generateAction({
        action: "decides",
        prefix: `choice=`,
        description: `${description}. Choose one of: ${choicesString}`,
      } as ActionCompletionSpec);
    }
  }

  private async generateAction(spec: ActionCompletionSpec) {
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
    const nextContexts = this.memories.concat(contextCompletion);
    return new CortexStep(this.entityName, {
      lastValue: nextValue,
      memory: nextContexts,
    } as PastCortexStep);
  }
}
