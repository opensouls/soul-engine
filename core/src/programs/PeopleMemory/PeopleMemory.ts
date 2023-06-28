import { PersonModel } from "./PersonModel";
import { Blueprint } from "../../blueprint";
import { ConversationProcessor } from "../../conversationProcessor";
import { ChatMessageRoleEnum } from "../../languageModels";
import { Thought } from "../../languageModels/memory";
import { Soul } from "../../soul";
import { ConversationalProgram } from "../index";

interface MentalModels {
  [key: string]: PersonModel;
}

export class PeopleMemory implements ConversationalProgram {
  public memory: MentalModels;
  private readonly observerBlueprint: Blueprint;
  private readonly soul: Soul;

  public id = "internal-people-memory";

  constructor(soul: Soul) {
    this.memory = {};
    this.soul = soul;
    this.observerBlueprint = soul.blueprint;
  }

  async toOutput(conversation: ConversationProcessor) {
    const content = this.toMessageContent(conversation);
    if (content) {
      return {
        beginningMessages: [
          {
            role: ChatMessageRoleEnum.Assistant,
            content: this.toMessageContent(conversation),
            name: conversation.blueprint.name,
          },
        ],
      };
    }
    return {};
  }

  public async update(
    thoughts: Thought[],
    conversation: ConversationProcessor
  ) {
    const { entity: name } = thoughts[0].memory;
    if (name === undefined) {
      throw new Error("PeopleMemory requires named messages to be passed in");
    }
    const hasNameMemory = Object.keys(this.memory).includes(name as string);
    if (!hasNameMemory && name !== this.observerBlueprint.name) {
      this.memory[name] = new PersonModel(this.soul, name);
    }
    return await Promise.all(
      Object.values(this.memory).map((m) => m.update(thoughts, conversation))
    );
  }

  private toMessageContent(conversation: ConversationProcessor): string {
    const userNames = conversation.thoughts
      .filter((t) => t.memory.role === ChatMessageRoleEnum.User)
      .map((t) => t.memory.entity);

    const lastUserName = userNames.slice(-1)[0];

    if (!lastUserName) {
      console.error("No last person in conversation");
      return "";
    }

    const memory = this.memory[lastUserName];
    if (!memory) {
      return "";
    }
    return memory.toLinguisticProgram(conversation);
  }
}
