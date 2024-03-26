import { createCognitiveStep, WorkingMemory, ChatMessageRoleEnum, indentNicely, stripEntityAndVerb } from "@opensouls/engine";

export const summarize = createCognitiveStep((extraInstructions: string = "") => {
  return {
    command: ({ soulName: name }: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        name: name,
        content: indentNicely`
          ${name} summarizes the conversation so far.

          ## Extra Instructions
          ${extraInstructions}

          Please reply with the summary in the voice of ${name}. Use the format: ${name} summarized: "..."
        `
      };
    },
    postProcess: async (memory: WorkingMemory, response: string) => {
      const stripped = stripEntityAndVerb(memory.soulName, "summarized", response);
      const newMemory = {
        role: ChatMessageRoleEnum.Assistant,
        content: `${memory.soulName} summarized: "${stripped}"`
      };
      return [newMemory, stripped];
    }
  }
})
