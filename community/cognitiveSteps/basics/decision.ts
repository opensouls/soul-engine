import { createCognitiveStep, WorkingMemory, ChatMessageRoleEnum, indentNicely, stripEntityAndVerb, stripEntityAndVerbFromStream, z } from "@opensouls/engine";

export const decision = createCognitiveStep(({ description, choices, verb = "decided" }: { description: string, choices: z.EnumLike | string[], verb?: string }) => {
  const params = z.object({
    decision: z.string().describe(`The decision made by the entity.`)
  });
  return {
    schema: params,
    command: ({ soulName: name }: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        name: name,
        content: indentNicely`
          ${name} is deciding between the following options:
          ${Array.isArray(choices) ? choices.map((c) => `* ${c}`).join('\n') : JSON.stringify(choices, null, 2)}

          ## Description
          ${description}

          ## Rules
          * ${name} must decide on one of the options. Return ${name}'s decision.
        `
      };
    },
    streamProcessor: stripEntityAndVerbFromStream,
    postProcess: async (memory: WorkingMemory, response: z.infer<typeof params>) => {
      const stripped = stripEntityAndVerb(memory.soulName, verb, response.decision);
      const newMemory = {
        role: ChatMessageRoleEnum.Assistant,
        content: `${memory.soulName} ${verb}: "${stripped}"`
      };
      return [newMemory, stripped];
    }
  }
})