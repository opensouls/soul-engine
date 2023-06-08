import { LanguageProcessor } from "./lmStream";
import { EventEmitter } from "events";
import { Blueprint, ThoughtFramework } from "./blueprint";
import {
  ConversationProcessor,
  Message,
  ParticipationStrategy,
} from "./conversationProcessor";

type ConversationStore = {
  [convoName: string]: ConversationProcessor;
};

export class Soul extends EventEmitter {
  conversations: ConversationStore = {};
  public blueprint: Blueprint;

  constructor(blueprint: Blueprint) {
    super();

    this.blueprint = blueprint;
    // soul blueprint validation
    if (this.blueprint?.thoughtFramework === undefined) {
      this.blueprint.thoughtFramework = ThoughtFramework.Introspective;
    }
    if (
      this.blueprint.thoughtFramework === ThoughtFramework.ReflectiveLP &&
      this.blueprint.languageProcessor !== LanguageProcessor.GPT_4
    ) {
      throw new Error(
        "ReflectiveLP ThoughtFramework requires the GPT4 language processor"
      );
    }
  }

  public reset(): void {
    this.getConversations().map((c) => c.reset());
  }

  private getConversations(): ConversationProcessor[] {
    return Object.values(this.conversations);
  }

  private getConversation(convoName: string): ConversationProcessor {
    if (!Object.keys(this.conversations).includes(convoName)) {
      this.conversations[convoName] = new ConversationProcessor(this.blueprint);
      this.conversations[convoName].on("thinks", (thought) => {
        this.emit("thinks", thought, convoName);
      });
      this.conversations[convoName].on("thinking", () => {
        this.emit("thinking", convoName);
      });
      this.conversations[convoName].on("says", (message) => {
        this.emit("says", message, convoName);
      });
    }
    return this.conversations[convoName];
  }

  public tell(text: string, convoName = "default"): void {
    this.getConversation(convoName).tell(text);
  }

  public seesTyping(convoName = "default"): void {
    this.getConversation(convoName).seesTyping();
  }

  public read(
    msg: Message,
    participationStrategy: ParticipationStrategy,
    convoName = "default"
  ): void {
    this.getConversation(convoName).read(msg, participationStrategy);
  }

  public inspectPeopleMemory(userName: string, convoName = "default"): string {
    return this.getConversation(convoName).inspectPeopleMemory(userName);
  }
}
