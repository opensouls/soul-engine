import { EventEmitter } from "events";
import { Configuration, OpenAIApi } from "openai";
import { OpenAIExt } from "openai-ext";

import { devLog } from "./utils";

export interface IMemory {
  role: string;
  entity: string;
  action: string;
  content: string;
}

export class Memory {
  memory: IMemory;

  constructor(memory: IMemory) {
    this.memory = memory;
    this.memory.action = this.memory.action.toUpperCase();
  }

  public isMessage() {
    return this.memory.action === "MESSAGES";
  }

  public toString() {
    return `<${this.memory.entity}><${this.memory.action}>${this.memory.content}</${this.memory.action}></${this.memory.entity}>`;
  }
}

export class Thought extends Memory {}

export enum LanguageProcessor {
  GPT_4 = "gpt-4",
  GPT_3_5_turbo = "gpt-3.5-turbo",
}

export interface MRecord {
  role: string;
  content: string;
}

export const NeuralEvents = {
  newThought: "newThought",
  noNewThoughts: "noNewThoughts",
};

/* Takes in a sequence of memories and generates thoughts until no more thoughts will come */
export class ThoughtGenerator extends EventEmitter {
  private stream: any = null;
  private languageProcessor: LanguageProcessor;

  constructor(languageProcessor: LanguageProcessor) {
    super();
    this.languageProcessor = languageProcessor;
  }

  private emitThought(thought: Thought) {
    this.emit(NeuralEvents.newThought, thought);
  }
  private emitThinkingFinished() {
    this.emit(NeuralEvents.noNewThoughts);
  }

  public interrupt(): void {
    try {
      this.stream?.destroy();
    } catch (error) {
      console.error("Failed to destroy the stream:", error);
    } finally {
      this.stream = null;
    }
  }

  public isThinking(): boolean {
    return !(this.stream === null);
  }

  public async generate(records: MRecord[]) {
    if (this.stream !== null) return;
    this.stream?.destroy();
    this.stream = undefined;
    const apiKey = process.env.OPENAI_API_KEY;

    const configuration = new Configuration({ apiKey });
    const openaiApi = new OpenAIApi(configuration);

    let oldThoughts: Memory[] = [];
    const openaiStreamConfig = {
      openai: openaiApi,
      handler: {
        onContent: (content: string) => {
          function extractThoughts(content: string): Thought[] {
            const regex =
              /<([A-Za-z0-9\s_]+)><([A-Za-z0-9\s_]+)>(.*?)<\/\2><\/\1>/g;
            const matches = content.matchAll(regex);
            const extractedThoughts = [];

            for (const match of matches) {
              const [_, entity, action, content] = match;
              const extractedThought = new Thought({
                role: "assistant",
                entity,
                action,
                content,
              });
              extractedThoughts.push(extractedThought);
            }

            return extractedThoughts;
          }
          const newThoughts = extractThoughts(
            content.replace(/(\r\n|\n|\r)/gm, "")
          );
          const diffThoughts = this.getUniqueThoughts(newThoughts, oldThoughts);
          oldThoughts = newThoughts;
          diffThoughts.forEach((diffThought) => {
            this.emitThought(diffThought);
          });
        },
        onDone: () => {
          this.emitThinkingFinished();
          this.interrupt();
        },
      },
    };

    // TODO: upstream lib parses stream chunks correctly but sometimes emits a spurious error
    //   open PR to silence non-fatal errors in https://github.com/justinmahar/openai-ext
    const openaiStreamResponse = await OpenAIExt.streamServerChatCompletion(
      {
        model: this.languageProcessor,
        messages: records,
      },
      openaiStreamConfig
    );

    this.stream = openaiStreamResponse.data;
  }

  private getUniqueThoughts(newArray: Memory[], oldArray: Memory[]): Thought[] {
    return newArray.filter(
      (newThought) =>
        !oldArray.some(
          (oldThought) => newThought.toString() === oldThought.toString()
        )
    );
  }
}
