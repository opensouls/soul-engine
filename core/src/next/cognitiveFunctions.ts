import { EnumLike, z } from "zod"
import { CortexStep, NextFunction, StepCommand } from "./CortexStep";
import { ChatMessageRoleEnum } from "./languageModels";
import { html } from "common-tags";

export const externalDialog = (extraInstructions?: string, verb = "said") => {
  return () => {
    return {
      command: ({ entityName: name } : CortexStep<any>) => {
        return html`
          How would ${name} verbally respond?

          ${extraInstructions}
  
          ## Instructions
          * The response should be short (as most speech is short).
          * Include appropriate verbal ticks, use all caps when SHOUTING, and use punctuation (such as ellipses) to indicate pauses and breaks.
          * Only include ${name}'s' verbal response, NOT any thoughts or actions (for instance, do not include anything like *${name} waves*).
          * Do NOT include text that is not part of ${name}'s speech. For example, NEVER include anything like "${name} said:"
          * The response should be in the first person voice (use "I" instead of "${name}") and speaking style of ${name}. 

          Pretend to be ${name}!
        `;
      },
      commandRole: ChatMessageRoleEnum.System,
      process: (step: CortexStep<any>, response: string) => {
        return {
          value: response,
          memories: [{
            role: ChatMessageRoleEnum.Assistant,
            content: `${step.entityName} ${verb}: ${response}`
          }],
        }
      }
    }
  }
}

export const internalMonologue = (extraInstructions?: string, verb = "thought") => {
  return () => {
    return {
      command: ({ entityName: name }: CortexStep) => {
        return html`
          ${extraInstructions}
  
          What would ${name} think to themselves? What would their internal monologue be?
          The response should be short (as most internal thinking is short).
          Do not include any other text than ${name}'s thoughts.
          Do not surround the response with quotation marks.
          Respond in the first person voice (use "I" instead of "${name}") and speaking style of ${name}. Pretend to be ${name}!
      `},
      process: (step: CortexStep<any>, response: string) => {
        return {
          value: response,
          memories: [{
            role: ChatMessageRoleEnum.Assistant,
            content: `${step.entityName} ${verb}: ${response}`
          }],
        }
      }
    }
  }
}

export const decision = (description: string, choices: EnumLike | string[]) => {
  return () => {

    const params = z.object({
      decision: z.nativeEnum(choices as EnumLike).describe(description)
    })

    return {
      name: "decision",
      description,
      parameters: params,
      process: (step: CortexStep<any>, response: z.output<typeof params>) => {
        return {
          value: response.decision,
          memories: [{
            role: ChatMessageRoleEnum.Assistant,
            content: `${step.entityName} decides: ${response.decision}`
          }],
        }
      }
    };
  }
}

export const brainstorm = (description: string) => {
  return () => {
    const params = z.object({
      new_ideas: z.array(z.string()).describe(description)
    })

    return {
      name: "brainstorm",
      description,
      parameters: params,
      process: (step: CortexStep<any>, response: z.output<typeof params>) => {
        return {
          value: response.new_ideas,
          memories: [{
            role: ChatMessageRoleEnum.Assistant,
            content: html`
              ${step.entityName} brainstormed:
              ${response.new_ideas.join("\n")}
            `
          }],
        }
      }
    };
  }
}

export const queryMemory = (query: string) => {
  return () => {
    const params = z.object({
      answer: z.string().describe(`The answer to: ${query}`)
    })

    return {
      name: "query_memory",
      description: query,
      parameters: params,
      command: html`
        Do not repeat ${query} and instead use a dialog history.
        Do not copy sections of the chat history as an answer.
        Do summarize and thoughtfully answer in sentence and paragraph format.
        
        Analyze the chat history step by step and answer the question: ${query}.
      `,
      process: (_step: CortexStep<any>, response: z.output<typeof params>) => {
        return {
          value: response.answer,
          memories: [{
            role: ChatMessageRoleEnum.Assistant,
            content: html`
              The answer to ${query} is ${response.answer}.
            `
          }],
        }
      }
    };
  }
}

/**
 * `instruction` is used for instructions that do not use function calling. 
 * Instead, these instructions are inserted directly into the dialog. 
 * However, they are removed when the answer is returned.
 */
export const instruction = (command: StepCommand): NextFunction<unknown, string, string> => {
  return () => {
    return {
      command,
    }
  }
}

/**
 * @deprecated
 */
export const stringCommand = (command: StepCommand) => {
  return instruction(command)
}
