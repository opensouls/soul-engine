import { EnumLike, z } from "zod"
import { CortexStep, NextFunction, StepCommand } from "./CortexStep";
import { ChatMessageRoleEnum } from "./languageModels";
import { html } from "common-tags";

const stripRepsponseBoilerPlate = ({ entityName }: CortexStep<any>, verb: string, response: string) => {
  let strippedResponse = response.replace(`${entityName} ${verb}:`, "").trim();
  strippedResponse = strippedResponse.replace(`${entityName}:`, "").trim();
  strippedResponse = strippedResponse.replace(/^["']|["']$/g, '').trim();
  return strippedResponse
}

export const externalDialog = (extraInstructions?: string, verb = "said") => {
  return () => {
    return {
      command: ({ entityName: name }: CortexStep<any>) => {
        return html`
          Model the mind of ${name}.
  
          ## Instructions
          * DO NOT include actions (for example, do NOT add non-verbal items like *John Smiles* or *John Nods*, etc).
          * Include appropriate verbal ticks.
          * Use punctuation to indicate pauses and breaks in speech.
          * If necessary, use all caps to SHOUT certain words.
          
          ${extraInstructions}

          Please reply with the next utterance from ${name}. Use the format '${name} ${verb}: "..."'
        `;
      },
      commandRole: ChatMessageRoleEnum.System,
      process: (step: CortexStep<any>, response: string) => {
        return {
          value: stripRepsponseBoilerPlate(step, verb, response),
          memories: [{
            role: ChatMessageRoleEnum.Assistant,
            content: response
          }],
        }
      }
    }
  }
}

export const internalMonologue = (extraInstructions?: string, verb = "thought") => {
  return () => {

    const instructions = extraInstructions ? `\n## Instructions\n\n${extraInstructions}\n` : ""

    return {
      command: ({ entityName: name }: CortexStep) => {
        return html`
          Model the mind of ${name}.
          ${instructions}
          Please reply with the next internal mental thought of ${name}. Use the format '${name} ${verb}: "..."'
      `},
      process: (step: CortexStep<any>, response: string) => {
        return {
          value: stripRepsponseBoilerPlate(step, verb, response),
          memories: [{
            role: ChatMessageRoleEnum.Assistant,
            content: response
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
      description: description,
      parameters: params,
      command: ({ entityName }: CortexStep<any>) => {
        return html`
          Model the mind of ${entityName}.
          ${entityName} is deciding: ${description}
        `;
      },
      process: (step: CortexStep<any>, response: z.output<typeof params>) => {
        return {
          value: response.decision,
          memories: [{
            role: ChatMessageRoleEnum.Assistant,
            content: `${step.entityName} decided: ${response.decision}`
          }],
        }
      }
    };
  }
}

export const brainstorm = (description: string) => {
  return ({ entityName }: CortexStep<any>) => {
    const params = z.object({
      new_ideas: z.array(z.string()).describe(`The new ideas that ${entityName} brainstormed.`)
    })

    return {
      name: "save_brainstorm_ideas",
      description: html`        
        ${description}

        Save the new ideas.
      `,
      command: html`
        Model the mind of ${entityName}.
        ${entityName} brainstormed new ideas: ${description}
      `,
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
        Do not repeat ${query} and instead use the dialog history.
        Do not copy sections of the chat history as an answer.
        Do summarize and thoughtfully answer in sentence and paragraph format.
        
        Take a deep breath, analyze the chat history step by step and answer the question: ${query}.
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
