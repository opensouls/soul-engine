import { ChatMessageRoleEnum } from ".";

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
