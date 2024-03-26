import { createCognitiveStep, WorkingMemory, ChatMessageRoleEnum } from "@opensouls/engine";

export const instruction = createCognitiveStep((instructions: string) => {
  return {
    command: ({ soulName }: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        name: soulName,
        content: instructions,
      };
    }
  };
});
