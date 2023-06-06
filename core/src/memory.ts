import { PersonModel } from "./mentalModels";
import { ChatCompletionRequestMessage } from "openai";
import { Blueprint } from "./blueprint";

interface MentalModels {
  [key: string]: PersonModel;
}

export class PeopleMemory {
  private memory: MentalModels = {};
  private readonly observerBlueprint: Blueprint;

  constructor(observerBlueprint: Blueprint) {
    this.observerBlueprint = observerBlueprint;
  }

  public async update({ role, content, name }: ChatCompletionRequestMessage) {
    if (name === undefined) {
      throw new Error("PeopleMemory requires named messages to be passed in");
    }
    const hasNameMemory = Object.keys(this.memory).includes(name as string);
    if (!hasNameMemory && name !== this.observerBlueprint.name) {
      this.memory[name] = new PersonModel(name, this.observerBlueprint);
    }
    return await Promise.all(
      Object.values(this.memory).map((m) => m.update({ role, content, name }))
    );
  }

  public inspect(userName: string): string {
    if (Object.keys(this.memory).includes(userName)) {
      return this.memory[userName].toString();
    }
    throw new Error(`no userName: ${userName} in memory found`);
  }
}
