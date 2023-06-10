import { LanguageProcessor } from "./lmStream";
import { EventEmitter } from "events";
import { Blueprint, ThoughtFramework } from "./blueprint";
import {
  ConversationalContext,
  ConversationProcessor,
  Message,
  ParticipationStrategy,
} from "./conversationProcessor";
import { Action } from "./action";

type ConversationStore = {
  [convoName: string]: ConversationProcessor;
};

interface SoulOptions {
  defaultContext?: ConversationalContext;
  actions?: Action[];
}

export class Soul extends EventEmitter {
  conversations: ConversationStore = {};
  public blueprint: Blueprint;

  public defaultContext: ConversationalContext;
  public actions: Action[];

  constructor(blueprint: Blueprint, soulOptions: SoulOptions = {}) {
    super();

    this.defaultContext = soulOptions.defaultContext || "";
    this.actions = soulOptions.actions || [];

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
        "ReflectiveLP ThoughtFramework requires the GPT4 language processor",
      );
    }
  }

  public reset(): void {
    this.getConversations().map((c) => c.reset());
  }

  private getConversations(): ConversationProcessor[] {
    return Object.values(this.conversations);
  }

  public getConversation(
    convoName: string,
    context?: ConversationalContext
  ): ConversationProcessor {
    if (!Object.keys(this.conversations).includes(convoName)) {
      this.conversations[convoName] = new ConversationProcessor(
        this,
        context || this.defaultContext
      );
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
    convoName = "default",
  ): void {
    this.getConversation(convoName).read(msg, participationStrategy);
  }

  public inspectPeopleMemory(userName: string, convoName = "default"): string {
    return this.getConversation(convoName).inspectPeopleMemory(userName);
  }
}
