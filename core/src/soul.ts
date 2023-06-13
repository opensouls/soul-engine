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
import { MentalModel } from "./mentalModels";
import { PeopleMemory } from "./memory";

type ConversationStore = {
  [convoName: string]: ConversationProcessor;
};

interface SoulOptions {
  defaultContext?: ConversationalContext;
  // if you want to always get the entire "say" thought instead of streaming it out sentence by sentence,
  // then turn on "disableSayDelay"
  disableSayDelay?: boolean;
  actions?: Action[];
  mentalModels?: MentalModel[];
}

export class Soul extends EventEmitter {
  conversations: ConversationStore = {};
  public blueprint: Blueprint;

  public actions: Action[];
  readonly options: SoulOptions;
  readonly mentalModels: MentalModel[];

  constructor(blueprint: Blueprint, soulOptions: SoulOptions = {}) {
    super();

    this.options = soulOptions;
    this.actions = soulOptions.actions || [];

    this.mentalModels = soulOptions.mentalModels || [new PeopleMemory(blueprint)];


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

  get defaultContext() {
    return this.options.defaultContext || "";
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
}
