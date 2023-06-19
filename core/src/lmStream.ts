import { EventEmitter } from "events";
import OpenAI from "openai";
import { ChatMessage, ChatMessageRoleEnum } from "./languageModels";
import { devLog } from "./utils";

export interface IMemory {
  role: ChatMessageRoleEnum;
  entity: string;
  action: string;
  content: string;
}

export class Memory {
  memory: IMemory;

  constructor(memory: IMemory) {
    this.memory = memory;
    this.memory.entity = this.memory.entity.replace(/[^a-zA-Z0-9_-]/g, "");
    this.memory.action = this.memory.action.toUpperCase();
  }

  public isMessage() {
    return this.memory.action === "MESSAGES";
  }

  public toString() {
    return `<${this.memory.action}>${this.memory.content}</${this.memory.action}>`;
  }
}

export class Thought extends Memory {}

export enum LanguageProcessor {
  GPT_4 = "gpt-4",
  GPT_3_5_turbo = "gpt-3.5-turbo",
}

export type MRecord = ChatMessage;

export const NeuralEvents = {
  newThought: "newThought",
  noNewThoughts: "noNewThoughts",
};

/* Takes in a sequence of memories and generates thoughts until no more thoughts will come */
export class ThoughtGenerator extends EventEmitter {
  private streamAborter?: AbortController;
  private languageProcessor: LanguageProcessor;
  private entity: string;

  constructor(languageProcessor: LanguageProcessor, entity: string) {
    super();
    this.languageProcessor = languageProcessor;
    this.entity = entity;
  }

  private emitThought(thought: Thought) {
    this.emit(NeuralEvents.newThought, thought);
  }
  private emitThinkingFinished() {
    this.emit(NeuralEvents.noNewThoughts);
  }

  public interrupt(): void {
    this.streamAborter?.abort();
    this.streamAborter = undefined;
  }

  public isThinking(): boolean {
    return !(this.streamAborter === null);
  }

  public async generate(records: MRecord[]) {
    if (this.streamAborter) return;

    const apiKey = process.env.OPENAI_API_KEY;

    const openaiApi = new OpenAI({ apiKey });

    let oldThoughts: Memory[] = [];
    const entity = this.entity;

    const stream = await openaiApi.chat.completions.create({
      model: this.languageProcessor,
      messages: records,
      stream: true,
    });

    this.streamAborter = stream.controller;

    function extractThoughts(content: string): Thought[] {
      const regex = /<([A-Za-z0-9\s_]+)>(.*?)<\/\1>/g;
      const matches = content.matchAll(regex);
      const extractedThoughts = [];

      for (const match of matches) {
        const [_, action, internalContent] = match;
        const extractedThought = new Thought({
          role: ChatMessageRoleEnum.Assistant,
          entity,
          action,
          content: internalContent,
        });
        extractedThoughts.push(extractedThought);
      }

      return extractedThoughts;
    }

    let content = "";

    for await (const data of stream) {
      devLog("stream: " + data.choices[0].delta?.content || "");
      content += data.choices[0].delta?.content || "";

      const newThoughts = extractThoughts(
        content.replace(/(\r\n|\n|\r)/gm, "")
      );
      const diffThoughts = this.getUniqueThoughts(newThoughts, oldThoughts);
      oldThoughts = newThoughts;
      diffThoughts.forEach((diffThought) => {
        this.emitThought(diffThought);
      });
    }

    this.emitThinkingFinished();
    this.interrupt();
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
