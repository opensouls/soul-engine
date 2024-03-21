import "../../src/processors/OpenAIProcessor.js"
import { codeBlock } from "common-tags"
import { EnumLike, z } from "zod";
import { ChatMessageRoleEnum, WorkingMemory } from "../../src/WorkingMemory.js";
import { createCognitiveStep } from "../../src/cognitiveStep.js";
import { stripEntityAndVerb, stripEntityAndVerbFromStream } from "../../src/utils.js";

export const externalDialog = createCognitiveStep((instructions: string | { instructions: string; verb: string }) => {
  let instructionString: string, verb: string;
  if (typeof instructions === "string") {
    instructionString = instructions;
    verb = "said";
  } else {
    instructionString = instructions.instructions;
    verb = instructions.verb;
  }
  return {
    command: ({ entityName: name }: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        name: name,
        content: `
            Model the mind of ${name}.
    
            ## Instructions
            * DO NOT include actions (for example, do NOT add non-verbal items like *John Smiles* or *John Nods*, etc).
            * DO NOT include internal thoughts (for example, do NOT respond with John thought: "...").
            * If necessary, use all CAPS to emphasize certain words.
    
            ${instructionString}
    
            Please reply with the next utterance from ${name}. Use the format '${name} ${verb}: "..."'
          `
      };
    },
    streamProcessor: stripEntityAndVerbFromStream,
    postProcess: async (memory: WorkingMemory, response: string) => {
      const stripped = stripEntityAndVerb(memory.entityName, verb, response);
      const newMemory = {
        role: ChatMessageRoleEnum.Assistant,
        content: `${memory.entityName} ${verb}: "${stripped}"`
      };
      return [newMemory, stripped];
    }
  }
})

export const internalMonologue = createCognitiveStep((instructions: string | { instructions: string; verb: string }) => {
  let instructionString: string, verb: string;
  if (typeof instructions === "string") {
    instructionString = instructions;
    verb = "thought";
  } else {
    instructionString = instructions.instructions;
    verb = instructions.verb;
  }

  return {
    command: ({ entityName: name }: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        name: name,
        content: codeBlock`
          Model the mind of ${name}.

          ## Description
          ${instructionString}

          ## Rules
          * Internal monologue thoughts should match the speaking style of ${name}.
          * Only respond with the format '${name} ${verb}: "..."', no additional commentary or text.
          * Follow the Description when creating the internal thought!

          Please reply with the next internal monologue thought of ${name}. Use the format '${name} ${verb}: "..."'
        `
      };
    },
    streamProcessor: stripEntityAndVerbFromStream,
    postProcess: async (memory: WorkingMemory, response: string) => {
      const stripped = stripEntityAndVerb(memory.entityName, verb, response);
      const newMemory = {
        role: ChatMessageRoleEnum.Assistant,
        content: `${memory.entityName} ${verb}: "${stripped}"`
      };
      return [newMemory, stripped];
    }
  }
})

export const decision = createCognitiveStep(({ description, choices, verb = "decided" }: { description: string, choices: EnumLike | string[], verb?: string }) => {
  const params = z.object({
    decision: z.string().describe(`The decision made by the entity.`)
  });
  return {
    schema: params,
    command: ({ entityName: name }: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        name: name,
        content: codeBlock`
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
      const stripped = stripEntityAndVerb(memory.entityName, verb, response.decision);
      const newMemory = {
        role: ChatMessageRoleEnum.Assistant,
        content: `${memory.entityName} ${verb}: "${stripped}"`
      };
      return [newMemory, stripped];
    }
  }
})

export const summarize = createCognitiveStep((extraInstructions: string = "") => {
  return {
    command: ({ entityName: name }: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        name: name,
        content: codeBlock`
          ${name} summarizes the conversation so far.

          ## Extra Instructions
          ${extraInstructions}

          Please reply with the summary in the voice of ${name}. Use the format '${name} summarized: "..."'
        `
      };
    },
    postProcess: async (memory: WorkingMemory, response: string) => {
      const stripped = stripEntityAndVerb(memory.entityName, "summarized", response);
      const newMemory = {
        role: ChatMessageRoleEnum.Assistant,
        content: `${memory.entityName} summarized: "${stripped}"`
      };
      return [newMemory, stripped];
    }
  }
})

export const brainstorm = createCognitiveStep((description: string) => {
  const params = z.object({
    newIdeas: z.array(z.string()).describe(`The new brainstormed ideas.`)
  });

  return {
    command: ({ entityName: name }: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        name: name,
        content: codeBlock`
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
        content: `${memory.entityName} brainstormed: ${newIdeas.join("\n")}`
      };
      return [newMemory, newIdeas];
    }
  }
})

export const mentalQuery = createCognitiveStep((statement: string) => {
  const params = z.object({
    isStatementTrue: z.boolean().describe(`Is the statement true or false?`),
  });

  return {
    command: ({ entityName: name }: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        name: name,
        content: codeBlock`
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
        content: `${memory.entityName} evaluated: \`${statement}\` and decided that the statement is ${response.isStatementTrue ? 'true' : 'false'}`
      };
      return [newMemory, response.isStatementTrue];
    }
  };
});

export const instruction = createCognitiveStep((instructions: string) => {
  return {
    command: ({ entityName: name }: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        name: name, // Utilizing entityName from WorkingMemory for name
        content: instructions,
      };
    }
  };
});
