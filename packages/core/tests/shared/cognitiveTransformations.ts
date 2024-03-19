import "../../src/processors/OpenAIProcessor.js"
import { codeBlock } from "common-tags"
import { ChatMessageRoleEnum, TransformMemoryOptions, WorkingMemory } from "../../src/WorkingMemory.js"
import { EnumLike, z } from "zod";

const stripResponseBoilerPlate = ({ entityName }: WorkingMemory, _verb: string, response: string) => {
  // sometimes the LLM will respond with something like "Bogus said with a sinister smile: "I'm going to eat you!" (adding more words)
  // so we just strip any of those
  let strippedResponse = response.replace(new RegExp(`${entityName}.*?:`, "i"), "").trim();
  // get rid of the quotes
  strippedResponse = strippedResponse.replace(/^["']|["']$/g, '').trim();
  return strippedResponse
}

const boilerPlateStreamProcessor = async ({ entityName }: WorkingMemory, stream: AsyncIterable<string>): Promise<AsyncIterable<string>> => {
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

export const externalDialog = (extraInstructions: string, verb = "says") => {
  const opts: TransformMemoryOptions<string> = {
    command: ({ entityName: name }: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        name: name,
        content: codeBlock`
          Model the mind of ${name}.

          ## Instructions
          * DO NOT include actions (for example, do NOT add non-verbal items like *John Smiles* or *John Nods*, etc).
          * DO NOT include internal thoughts (for example, do NOT respond with John thought: "...").
          * If necessary, use all CAPS to emphasize certain words.
          
          ${extraInstructions}

          Please reply with the next utterance from ${name}. Use the format '${name} ${verb}: "..."'
        `
      }
    },
    streamProcessor: boilerPlateStreamProcessor,
    postProcess: (memory: WorkingMemory, response: string) => {
      const stripped = stripResponseBoilerPlate(memory, verb, response)
      const newMemory = [{
        role: ChatMessageRoleEnum.Assistant,
        content: `${memory.entityName} ${verb}: "${stripped}"`
      }]
      return Promise.resolve({ memories: newMemory, value: stripped })
    },
  }

  return opts
}

export const internalMonologue = (extraInstructions?: string, verb = "thought") => {
  const opts: TransformMemoryOptions<string> = {
    command: ({ entityName: name }: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        name: name,
        content: codeBlock`
          Model the mind of ${name}.

          ## Description
          ${extraInstructions}

          ## Rules
          * Internal monologue thoughts should match the speaking style of ${name}.
          * Only respond with the format '${name} ${verb}: "..."', no additional commentary or text.
          * Follow the Description when creating the internal thought!

          Please reply with the next internal monologue thought of ${name}. Use the format '${name} ${verb}: "..."'
        `
      }
    },
    streamProcessor: boilerPlateStreamProcessor,
    postProcess: (memory: WorkingMemory, response: string) => {
      const stripped = stripResponseBoilerPlate(memory, verb, response)
      const newMemory = [{
        role: ChatMessageRoleEnum.Assistant,
        content: `${memory.entityName} ${verb}: "${stripped}"`
      }]
      return Promise.resolve({ memories: newMemory, value: stripped })
    },
  }

  return opts
}

export const decision = (description: string, choices: EnumLike | string[]) => {

  const params = z.object({
    decision: z.nativeEnum(choices as EnumLike).describe(description)
  })

  const opts: TransformMemoryOptions<z.infer<typeof params>, z.infer<typeof params>["decision"]> = {
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
      }
    },
    schema: params,
    postProcess: (memory: WorkingMemory, response: z.output<typeof params>) => {
      return Promise.resolve({
        memories: [{
          role: ChatMessageRoleEnum.Assistant,
          content: `${memory.entityName} decided: ${response.decision}`
        }],
        value: response.decision
      })
    }
  }

  return opts

}


export const brainstorm = (description: string) => {
  const params = z.object({
    newIdeas: z.array(z.string()).describe(`The new brainstormed ideas.`)
  })

  const opts: TransformMemoryOptions<z.infer<typeof params>, Array<string>> = {

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
      }
    },
    schema: params,
    postProcess: (memory: WorkingMemory, response: z.output<typeof params>) => {
      return Promise.resolve({
        value: response.newIdeas,
        memories: [{
          role: ChatMessageRoleEnum.Assistant,
          content: `${memory.entityName} brainstormed: ${response.newIdeas.join("\n")}`
        }]
      })
    }
  };

  return opts;
}

export const mentalQuery = (statement: string): TransformMemoryOptions<boolean> => {
  // *first* we create an internal thought that we'll use to guide the decision making process.
  const params = z.boolean().describe(`Is the statement true or false?`)

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
      }
    },
    postProcess: async (memory: WorkingMemory, response: z.infer<typeof params>) => {
      return {
        value: response,
        memories: [{
          content: `${memory.entityName} evaluated: \`${statement}\` and decided that the statement is ${response}`,
          role: ChatMessageRoleEnum.Assistant
        }],
      }
    }
  }

}

export const instruction = (command: string) => {
  const opts: TransformMemoryOptions<string> = {
    command: () => {
      return {
        role: ChatMessageRoleEnum.System,
        name: '', // Assuming name is not required or can be empty for this case
        content: command,
      }
    },
    // Assuming no streamProcessor is needed for this simple command
    postProcess: (memory: WorkingMemory, response: string) => {
      // Assuming the response does not need to be modified before being returned
      return Promise.resolve({ memories: [], value: response });
    },
  };

  return opts;
}