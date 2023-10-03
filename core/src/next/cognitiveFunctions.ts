import { EnumLike, z } from "zod"
import { CortexStep } from "./CortexStep";
import { ChatMessageRoleEnum } from "./languageModels";
import { html } from "common-tags";

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
      name: "query_memory",
      description: query,
      parameters: z.object({
        answer: z.string().describe(`The answer to: ${query}`)
      }),
      command: html`
        Do not repeat ${query} and instead use a dialog history.
        Do not copy sections of the chat history as an answer.
        Do summarize and thoughtfully answer in sentence and paragraph format.
        
        Analyze the chat history step by step and answer the question: ${query}.
      `
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
