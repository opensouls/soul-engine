import { MentalModel, PersonModel } from "./mentalModels";
import { Blueprint } from "./blueprint";
import { Thought } from "./lmStream";
import { ConversationProcessor } from "./conversationProcessor";

interface MentalModels {
  [key: string]: PersonModel;
}

export class PeopleMemory implements MentalModel {
  public memory: MentalModels;
  private readonly observerBlueprint: Blueprint;

  constructor(observerBlueprint: Blueprint) {
    this.memory = {};
    this.observerBlueprint = observerBlueprint;
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
      this.memory[name] = new PersonModel(name, this.observerBlueprint);
    }
    return await Promise.all(
      Object.values(this.memory).map((m) => m.update(thoughts, conversation)),
    );
  }

  public toLinguisticProgram(conversation: ConversationProcessor): string {
    const userNames = conversation.thoughts
      .filter((t) => t.memory.role === "user")
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
