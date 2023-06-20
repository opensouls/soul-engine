import { EventEmitter } from "events";
import {
  ChatCompletionStreamer,
  ChatMessage,
  ChatMessageRoleEnum,
} from "./languageModels";
import { devLog } from "./utils";
import { Memory, Thought } from "./languageModels/memory";

export type MRecord = ChatMessage;

export const NeuralEvents = {
  newThought: "newThought",
  noNewThoughts: "noNewThoughts",
};

/* Takes in a sequence of memories and generates thoughts until no more thoughts will come */
export class ThoughtGenerator extends EventEmitter {
  private streamAborter?: AbortController;
  private languageModel: ChatCompletionStreamer;
  private entity: string;

  constructor(languageProcessor: ChatCompletionStreamer, entity: string) {
    super();
    this.languageModel = languageProcessor;
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

    let oldThoughts: Memory[] = [];
    const entity = this.entity;

    const { stream, abortController } = await this.languageModel.create({
      messages: records,
    });

    this.streamAborter = abortController;

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
