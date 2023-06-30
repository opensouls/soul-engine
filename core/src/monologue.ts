import { ChatMessage } from "./languageModels";
import { OpenAILanguageProgramProcessor } from "./languageModels/openAI";

type MonologueContext = ChatMessage[];
type PastMonologue = {
  lastValue?: null | string;
  contexts: MonologueContext[];
};

export class Monologue {
  private readonly entityName: string;
  private readonly _lastValue: null | string;
  private contexts: MonologueContext[];

  constructor(entityName: string, pastMonologue?: PastMonologue) {
    this.entityName = entityName;
    if (pastMonologue?.contexts) {
      this.contexts = pastMonologue.contexts;
    } else {
      this.contexts = [];
    }
    if (pastMonologue?.lastValue) {
      this._lastValue = pastMonologue.lastValue;
    } else {
      this._lastValue = null;
    }
  }

  public pushContext(context: MonologueContext) {
    this.contexts.push(context);
  }

  private get messages(): ChatMessage[] {
    return this.contexts.flat();
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

  get lastValue() {
    return this._lastValue;
  }

  public async next(
    action: string,
    prefix: string | null,
    description: string
  ) {
    const beginning = `<${action}>${prefix || ""}`;
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
    const nextValue = (await processor.execute(instructions)).replace(
      beginning,
      ""
    );
    const contextCompletion = [
      {
        role: "assistant",
        content: `
${beginning}${nextValue}</${action}>
`.trim(),
      },
    ] as MonologueContext;
    const nextContexts = this.contexts.concat(contextCompletion);
    return new Monologue(this.entityName, {
      lastValue: nextValue,
      contexts: nextContexts,
    } as PastMonologue);
  }
}
