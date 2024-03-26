import { createCognitiveStep, WorkingMemory, ChatMessageRoleEnum, indentNicely, z } from "@opensouls/engine";

export const brainstorm = createCognitiveStep((description: string) => {
  const params = z.object({
    newIdeas: z.array(z.string()).describe(`The new brainstormed ideas.`)
  });

  return {
    command: ({ soulName: name }: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        name: name,
        content: indentNicely`
          ${name} is brainstorming new ideas.

          ## Idea Description
          ${description}

          Reply with the new ideas that ${name} brainstormed.
        `
      };
    },
    schema: params,
    postProcess: async (memory: WorkingMemory, response: z.output<typeof params>) => {
      const newIdeas = response.newIdeas;
      const newMemory = {
        role: ChatMessageRoleEnum.Assistant,
        content: `${memory.soulName} brainstormed: ${newIdeas.join("\n")}`
      };
      return [newMemory, newIdeas];
    }
  }
})
