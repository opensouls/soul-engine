import { EnumLike, z } from "zod"
import { CortexStep, NextFunction, StepCommand } from "./CortexStep";
import { ChatMessageRoleEnum } from "./languageModels";
import { html } from "common-tags";

const stripRepsponseBoilerPlate = ({ entityName }: CortexStep<any>, verb: string, response: string) => {
  // sometimes the LLM will respond with something like "Bogus said with a sinister smile: "I'm going to eat you!" (adding more words)
  // so we just strip any of those
  let strippedResponse = response.replace(new RegExp(`${entityName} .*:`), "").trim();
  // sometimes the LLM will ignore the verb and just respond with: Bogus: "..."
  strippedResponse = strippedResponse.replace(`${entityName}:`, "").trim();
  // get rid of the quotes
  strippedResponse = strippedResponse.replace(/^["']|["']$/g, '').trim();
  return strippedResponse
}

/**
 * externalDialog is used to create dialog that is said by the Open Soul, generally used for textual interactions. The opitonal `extraInstructions` parameter is used to provide additional instructions to the Open Soul.
 * For example, you might add "Keep responses to 1-2 sentences at most." or `${entityName} should say a critical comment, and not ask questions.`
 * 
 * @param [extraInstructions] These are instructions that help guide the response of the Open Soul.
 * @param [verb] - The verb that is used to describe the action of the Open Soul. For example, "said" or "yelloed", defaults to "said"
 * 
 * When used in a CortexStep#next command, the typed #value will be a string
 */
export const externalDialog = (extraInstructions?: string, verb = "said") => {
  return () => {
    return {
      command: ({ entityName: name }: CortexStep<any>) => {
        return html`
          Model the mind of ${name}.
  
          ## Instructions
          * DO NOT include actions (for example, do NOT add non-verbal items like *John Smiles* or *John Nods*, etc).
          * DO NOT include internal thoughts (for example, do NOT respond with John thought: "...").
          * If necessary, use all CAPS to emphasize certain words.
          
          ${extraInstructions}

          Please reply with the next utterance from ${name}. Use the format '${name} ${verb}: "..."'
        `;
      },
      commandRole: ChatMessageRoleEnum.System,
      process: (step: CortexStep<any>, response: string) => {
        const stripped = stripRepsponseBoilerPlate(step, verb, response)
        return {
          value: stripped,
          memories: [{
            role: ChatMessageRoleEnum.Assistant,
            content: `${step.entityName} ${verb}: "${stripped}"`
          }],
        }
      }
    }
  }
}

/**
 * spokenDialog is used to create dialog that is spoken outloud by the Open Soul. It includes verbal tickets, 
 * ellipsis, etc to make the dialog more realistic when spoken.
 * The optional `extraInstructions` parameter is used to provide additional instructions to the Open Soul.
 * For example, you might add "Speak with a sense of urgency." or `${entityName} should speak in a calm and soothing tone.`
 * 
 * @param [extraInstructions] These are instructions that help guide the response of the Open Soul.
 * @param [verb] - The verb that is used to describe the action of the Open Soul. For example, "said" or "whispered", defaults to "said"
 * 
 * When used in a CortexStep#next command, the typed #value will be a string
 */
export const spokenDialog = (extraInstructions?: string, verb = "said") => {
  return () => {
    return {
      command: ({ entityName: name }: CortexStep<any>) => {
        return html`
          Model the mind of ${name}.
  
          ## Instructions
          * Include appropriate verbal ticks (e.g., uhhh, umm, like, "you know what I mean", etc).
          * Use punctuation to indicate pauses and breaks in speech (e.g., an ellipsis)
          * If necessary, use all caps to SHOUT certain words.
          * DO NOT include internal thoughts (for example, do NOT respond with John thought: "...")
          * DO NOT include actions (for example, do NOT add non-verbal items like *John Smiles* or *John Nods*, etc).

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

/**
 * internalMonologue is used to create an internal thought process that is thought by the Open Soul. The optional `extraInstructions` parameter is used to provide additional instructions to the Open Soul.
 * For example, you might add "Keep thoughts to 1-2 sentences at most." or `${entityName} notes the user's response on the topic of climate change.` or "What strongly felt emotions does Samantha have about the last message?"
 * 
 * @param [extraInstructions] These are instructions that help guide the response of the Open Soul.
 * @param [verb] - The verb that is used to describe the action of the Open Soul. For example, "thought" or "pondered", defaults to "thought"
 * 
 * When used in a CortexStep#next command, the typed #value will be a string
 */
export const internalMonologue = (extraInstructions?: string, verb = "thought") => {
  return () => {

    return {
      command: ({ entityName: name }: CortexStep) => {
        return html`
          Model the mind of ${name}.
          
          ## Description
          ${extraInstructions}

          ## Rules
          * Internal monologue thoughts should match the speaking style of ${name}.
          * Only respond with the format '${name} ${verb}: "..."', no additonal commentary or text.
          * Follow the Description when creating the internal thought!

          Please reply with the next internal monologue thought of ${name}. Use the format '${name} ${verb}: "..."'
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

/**
 * decision is used to pick from a set of choices. The `description` parameter is used to describe the decision to be made and the `choices` parameter provides the set of choices to pick from.
 * 
 * Example:
 * decision("is samantha still angry enough to scream?", ["yes", "no"])
 * 
 * Example:
 * decision("What color should the car be?", ["red", "blue", "green", "yellow"])
 * 
 * @param description - This is a description of the decision to be made.
 * @param choices - These are the choices to pick from.
 * 
 * When used in a CortexStep#next command, the typed #value will the value of one of the choices submitted.
 */
export const decision = (description: string, choices: EnumLike | string[]) => {
  return () => {

    const params = z.object({
      decision: z.nativeEnum(choices as EnumLike).describe(description)
    })

    return {
      name: "decision",
      description: description,
      parameters: params,
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


/**
 * brainstorm is used to generate new ideas. The `description` parameter is used to describe the brainstorming session.
 * 
 * Example:
 * brainstorm("What are some potential features for our new product?")
 * 
 * @param description - This is a description of the idea to think through.
 * 
 * When used in a CortexStep#next command, the typed #value will be a string[]
 */
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
