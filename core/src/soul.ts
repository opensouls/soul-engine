import { EventEmitter } from "events";
import { Blueprint, ThoughtFramework } from "./blueprint";
import {
  ConversationOptions,
  ConversationProcessor,
  Message,
} from "./conversationProcessor";
import { Action } from "./action";
import { MentalModel } from "./mentalModels";
import { PeopleMemory } from "./memory";
import {
  ChatCompletionStreamer,
  LanguageModelProgramExecutor,
} from "./languageModels";
import {
  Model,
  OpenAILanguageProgramProcessor,
  OpenAIStreamingChat,
} from "./languageModels/openAI";

type ConversationStore = {
  [convoName: string]: ConversationProcessor;
};

const blueprintToStreamer = (blueprint: Blueprint): ChatCompletionStreamer => {
  if (blueprint.languageProcessor === Model.GPT_4) {
    return new OpenAIStreamingChat(
      {},
      {
        model: Model.GPT_4,
      },
    );
  }
  return new OpenAIStreamingChat();
};

interface SoulOptions {
  // defaultContext?: ConversationalContext;
  // if you want to always get the entire "say" thought instead of streaming it out sentence by sentence,
  // then turn on "disableSayDelay"
  disableSayDelay?: boolean;
  actions?: Action[];
  mentalModels?: MentalModel[];
  chatStreamer?: ChatCompletionStreamer;
  languageProgramExecutor?: LanguageModelProgramExecutor;
  defaultConversationOptions?: ConversationOptions;
}

export class Soul extends EventEmitter {
  conversations: ConversationStore = {};
  public blueprint: Blueprint;

  public actions: Action[];
  readonly options: SoulOptions;
  readonly mentalModels: MentalModel[];

  public chatStreamer: ChatCompletionStreamer;
  public languageProgramExecutor: LanguageModelProgramExecutor;

  constructor(blueprint: Blueprint, soulOptions: SoulOptions = {}) {
    super();

    this.options = soulOptions;
    this.actions = soulOptions.actions || [];
    this.blueprint = blueprint;

    this.mentalModels = soulOptions.mentalModels ||
      [new PeopleMemory(this)];

    // soul blueprint validation
    if (this.blueprint?.thoughtFramework === undefined) {
      this.blueprint.thoughtFramework = ThoughtFramework.Introspective;
    }
    if (
      this.blueprint.thoughtFramework === ThoughtFramework.ReflectiveLP &&
      this.blueprint.languageProcessor !== Model.GPT_4
    ) {
      throw new Error(
        "ReflectiveLP ThoughtFramework requires the GPT4 language processor",
      );
    }
    this.chatStreamer = soulOptions.chatStreamer ||
      blueprintToStreamer(blueprint);
    this.languageProgramExecutor = soulOptions.languageProgramExecutor ||
      new OpenAILanguageProgramProcessor();
  }

  public reset(): void {
    this.getConversations().map((c) => c.reset());
  }

  private getConversations(): ConversationProcessor[] {
    return Object.values(this.conversations);
  }

  public getConversation(
    convoName: string,
    options?: ConversationOptions
  ): ConversationProcessor {
    if (!Object.keys(this.conversations).includes(convoName)) {
      this.conversations[convoName] = new ConversationProcessor(this, {
        ...(this.options.defaultConversationOptions || {}),
        ...(options || {}),
      });
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

  public read(msg: Message, convoName = "default"): void {
    this.getConversation(convoName).read(msg);
  }
}
