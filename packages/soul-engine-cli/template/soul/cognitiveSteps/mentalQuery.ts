import { createCognitiveStep, WorkingMemory, ChatMessageRoleEnum, indentNicely, z } from "@opensouls/engine";

const mentalQuery = createCognitiveStep((statement: string) => {
  const params = z.object({
    isStatementTrue: z.boolean().describe(`Is the statement true or false?`),
  });

  return {
    command: ({ soulName: name }: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        name: name,
        content: indentNicely`
          ${name} reasons about the veracity of the following statement.
          > ${statement}

          Please reply with if ${name} believes the statement is true or false.
        `,
      };
    },
    schema: params,
    postProcess: async (memory: WorkingMemory, response: z.output<typeof params>) => {
      const newMemory = {
        role: ChatMessageRoleEnum.Assistant,
        content: `${memory.soulName} evaluated: \`${statement}\` and decided that the statement is ${response.isStatementTrue ? 'true' : 'false'}`
      };
      return [newMemory, response.isStatementTrue];
    }
  };
});

export default mentalQuery
