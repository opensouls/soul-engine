import { MentalModel, PersonModel } from "./mentalModels";
import { Blueprint } from "./blueprint";
import { ConversationProcessor } from "./conversationProcessor";
import { ChatMessageRoleEnum } from "./languageModels";
import { Thought } from "./languageModels/memory";
import { Soul } from "./soul";

interface MentalModels {
  [key: string]: PersonModel;
}

export class PeopleMemory implements MentalModel {
  public memory: MentalModels;
  private readonly observerBlueprint: Blueprint;
  private readonly soul: Soul;

  constructor(soul: Soul) {
    this.memory = {};
    this.soul = soul;
    this.observerBlueprint = soul.blueprint;
  }

  public async update(
    thoughts: Thought[],
    conversation: ConversationProcessor,
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
      Object.values(this.memory).map((m) => m.update(thoughts, conversation)),
    );
  }

  public toLinguisticProgram(conversation: ConversationProcessor): string {
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
