import { EnumLike, z } from "zod"
import { BrainFunction, CortexStep, NextFunction, StepCommand } from "./cortexStep";
import { ChatMessageRoleEnum } from "./languageModels";
import { html } from "common-tags";

const stripResponseBoilerPlate = ({ entityName }: CortexStep<any>, _verb: string, response: string) => {
  // sometimes the LLM will respond with something like "Bogus said with a sinister smile: "I'm going to eat you!" (adding more words)
  // so we just strip any of those
  let strippedResponse = response.replace(new RegExp(`${entityName}.*?:`, "i"), "").trim();
  // get rid of the quotes
  strippedResponse = strippedResponse.replace(/^["']|["']$/g, '').trim();
  return strippedResponse
}

const boilerPlateStreamProcessor = async ({ entityName }: CortexStep<any>, stream: AsyncIterable<string>): Promise<AsyncIterable<string>> => {
  const prefix = new RegExp(`^${entityName}.*?:\\s*["']*`, "i")
  const suffix = /["']$/

  let isStreaming = !prefix
  let prefixMatched = !prefix
  let buffer = ""
  const isStreamingBuffer: string[] = []

  const processedStream = (async function* () {
    for await (const chunk of stream) {
      // if we are already streaming, then we need to look out for a suffix
      // we keep the last 2 chunks in the buffer to check after the stream is finished
      // othwerwise we keep streaming
      if (isStreaming) {
        if (!suffix) {
          yield chunk
          continue;
        }
        isStreamingBuffer.push(chunk)
        if (isStreamingBuffer.length > 2) {
          yield isStreamingBuffer.shift() as string
        }
        continue;
      }

      // if we're not streaming, then keep looking for the prefix, and allow one *more* chunk
      // after detecting a hit on the prefix to come in, in case the prefix has some optional ending
      // characters.
      buffer += chunk;
      if (prefix && prefix.test(buffer)) {
        if (prefixMatched) {
          isStreaming = true;

          buffer = buffer.replace(prefix, '');
          yield buffer; // yield everything after the prefix
          buffer = ''; // clear the buffer
          continue
        }
        prefixMatched = true
      }
    }
    buffer = [buffer, ...isStreamingBuffer].join('')
    // if we ended before switching on streaming, then we haven't stripped the prefix yet.
    if (!isStreaming && prefix) {
      buffer = buffer.replace(prefix, '');
    }
    if (buffer.length > 0) {
      // if there was some buffer left over, then we need to check if there was a suffix
      // and remove that from the last part of the stream.
      if (suffix) {
        buffer = buffer.replace(suffix, '');
        yield buffer; // yield everything before the suffix
        return
      }
      // if there was no suffix, then just yield what's left.
      yield buffer; // yield the last part of the buffer if anything is left
    }
  })();
  return processedStream;
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
      streamProcessor: boilerPlateStreamProcessor,
      process: (step: CortexStep<any>, response: string) => {
        const stripped = stripResponseBoilerPlate(step, verb, response)
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
      streamProcessor: boilerPlateStreamProcessor,
      commandRole: ChatMessageRoleEnum.System,
      process: (step: CortexStep<any>, response: string) => {
        return {
          value: stripResponseBoilerPlate(step, verb, response),
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
      streamProcessor: boilerPlateStreamProcessor,
      process: (step: CortexStep<any>, response: string) => {
        return {
          value: stripResponseBoilerPlate(step, verb, response),
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


/**
 * @deprecated since version 0.1.3, will be removed in version 0.2.0. Use questionMemory instead.
 */
export const queryMemory = (query: string) => {
  return questionMemory(query)
}

export const questionMemory = (question: string) => {
  return () => {
    const params = z.object({
      answer: z.string().describe(`The answer to: ${question}`)
    });

    return {
      name: "query_memory",
      description: question,
      parameters: params,
      command: html`
        ## Instructions
        * Do not repeat the question in your answer.
        * Do not copy sections of the chat history as an answer.
        * Do summarize and thoughtfully answer in sentence and paragraph format.
        * Do use the dialog history to answer the question.

        Take a deep breath, analyze the chat history step by step and answer the question:
        > ${question}.
      `,
      process: (_step: CortexStep<any>, response: z.infer<typeof params>) => {
        // Use the inferred type from the Zod schema
        return {
          value: response.answer,
          memories: [{
            role: ChatMessageRoleEnum.Assistant,
            content: html`
              The answer to ${question} is ${response.answer}.
            `
          }],
        }
      }
    };
  }
}


// This is an internal use function that is used in mentalQuery to make the decision *after* thinking through the answer.
const _mentalQueryDecision = (statement: string) => {
  return ({entityName: name}: CortexStep<any>) => {

    const params = z.object({
      decision: z.boolean().describe(`Is the statement true or false in the mind of ${name}?`)
    })

    return {
      description: html`
        Save whether or not ${name} believes the following statement to be true or false:
        > ${statement}
      `,
      name: "mentalQuery",
      parameters: params
    };
  }
}

/**
 * mentalQuery is used to model the mind of an entity and make a decision based on a question. The `question` parameter should be a true or false statement.
 * 
 * Example:
 * mentalQuery("The meeting is today.")
 * 
 * @param statement - A true or false statement that the entity evaluates.
 * 
 * When used in a CortexStep#next or #compute command, the typed #value will be the boolean result of the decision process, reflecting the entity's belief.
 * This cognitive function makes two calls to the underlying LanguageProcessor: one to think through 
 */
export const mentalQuery = (statement: string) => {
  // *first* we create an internal thought that we'll use to guide the decision making process.
  return () => {

    return {
      command: ({ entityName: name }: CortexStep) => {
        return html`
          ${name} decides if the following statement is true or false and gives their reasoning:
          > ${statement}

          Please reply with whether or not ${name} thinks the statement is true or false and provide their reasoning. Use the format '${name} decided: "..."'
      `},
      process: async (step: CortexStep<any>, response: string) => {
        const stepWithThought = step.withMemory([{
          role: ChatMessageRoleEnum.Assistant,
          content: html`
            ${step.entityName} considered if the following statment is true or false:
            > ${statement}
            ${response}
          `
        }])

        const { decision } = await stepWithThought.compute(_mentalQueryDecision(statement))
        
        return {
          value: decision,
          memories: [{
            content: `${step.entityName} evaluated: \`${statement}\` and decided that the statement is ${decision}`,
            role: ChatMessageRoleEnum.Assistant
          }],
        }
      }
    }
  }
}

/**
 * `instruction` is used for instructions that do not use function calling. 
 * Instead, these instructions are inserted directly into the dialog. 
 * However, they are removed when the answer is returned.
 */
export const instruction = (command: StepCommand): NextFunction<string, string> => {
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
