import { EnumLike, z } from "zod"
import { BrainFunction, CortexStep } from "./CortexStep";
import { ChatMessageRoleEnum } from "./languageModels";
import { html } from "common-tags";

const singleResponse = (action:string, description:string) => {
  return () => {
    const params = z.object({
      [action]: z.string().describe(description)
    })

    return {
      name: action,
      description,
      parameters: params,
      process: (step: CortexStep<any>, response: z.output<typeof params>) => {
        return {
          value: response[action],
          memories: [{
            role: ChatMessageRoleEnum.Assistant,
            content: `${step.entityName} ${action} ${response[action]}`
          }],
        }
      }
    };
  }
}

export const externalDialog = singleResponse
export const internalMonologue = singleResponse

export const decision = (description:string, choices: EnumLike) => {
  return () => {
    
    const params = z.object({
      decision: z.nativeEnum(choices).describe(description)
    })

    return {
      name: "decision",
      description,
      parameters: params,
      process: (step: CortexStep<any>, response: z.output<typeof params>) => {
        return {
          value: response,
          memories: [{
            role: ChatMessageRoleEnum.Assistant,
            content: `${step.entityName} decides: ${response.decision}`
          }],
        }
      }
    };
  }
}

export const brainstorm = (description:string) => {
  return () => {
    const params = z.object({
      answers: z.array(z.string()).describe(description)
    })

    return {
      name: "brainstorm",
      description,
      parameters: params,
      process: (step: CortexStep<any>, response: z.output<typeof params>) => {
        return {
          value: response,
          memories: [{
            role: ChatMessageRoleEnum.Assistant,
            content: html`
              ${step.entityName} brainstorms:
              ${response.answers.join("\n")}
            `
          }],
        }
      }
    };
  }
}

export const queryMemory = (query:string) => {
  return () => {
    return {
      name: "queryMemory",
      description: query,
      parameters: z.object({
        answer: z.string().describe(`The answer to: ${query}`)
      })
    };
  }
}

export const stringCommand = (command:string) => {
  return () => {
    return {
      command,
    }
  }
}
