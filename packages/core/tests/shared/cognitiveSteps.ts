import "../../src/processors/OpenAIProcessor.js"
import { codeBlock } from "common-tags"
import { ChatMessageRoleEnum, CognitiveStep, MemoryTransformationOptions, TransformOptions, WorkingMemory } from "../../src/WorkingMemory.js"
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

// CognitiveStep
export function externalDialog(
  memory: WorkingMemory,
  instructions: string | { instructions: string; verb: string },
  transformOpts: TransformOptions = {}
) {
  let instructionString: string, verb: string;
  if (typeof instructions === "string") {
    instructionString = instructions;
    verb = "said";
  } else {
    instructionString = instructions.instructions;
    verb = instructions.verb;
  }

  const opts: MemoryTransformationOptions<string> = {
    command: ({ entityName: name }: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        name: name,
        content: /* use the correct templating function or literal here */ `
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
    streamProcessor: boilerPlateStreamProcessor,
    postProcess: async (memory: WorkingMemory, response: string) => {
      const stripped = stripResponseBoilerPlate(memory, verb, response);
      const newMemory = {
        role: ChatMessageRoleEnum.Assistant,
        content: `${memory.entityName} ${verb}: "${stripped}"`
      };
      return [newMemory, stripped];
    }
  };

  if (transformOpts.stream) {
    return memory.transform(opts, { ...transformOpts, stream: true });
  } else {
    return memory.transform(opts, transformOpts);
  }
}

export const internalMonologue = (
  memory: WorkingMemory,
  instructions: string | { instructions: string; verb: string },
  transformOpts: TransformOptions = {}
) => {
  let instructionString: string, verb: string;
  if (typeof instructions === "string") {
    instructionString = instructions;
    verb = "thought";
  } else {
    instructionString = instructions.instructions;
    verb = instructions.verb;
  }

  const opts: MemoryTransformationOptions<string> = {
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
    streamProcessor: boilerPlateStreamProcessor,
    postProcess: async (memory: WorkingMemory, response: string) => {
      const stripped = stripResponseBoilerPlate(memory, verb, response);
      const newMemory = {
        role: ChatMessageRoleEnum.Assistant,
        content: `${memory.entityName} ${verb}: "${stripped}"`
      };
      return [newMemory, stripped];
    }
  };

  if (transformOpts.stream) {
    return memory.transform(opts, { ...transformOpts, stream: true });
  } else {
    return memory.transform(opts, transformOpts);
  }
}

export const decision = (memory: WorkingMemory, { description, choices, verb = "decided" }: { description: string, choices: EnumLike | string[], verb?: string }, transformOpts: TransformOptions = {}) => {
  const instructionString = description || "";
  const opts: MemoryTransformationOptions<string> = {
    command: ({ entityName: name }: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        name: name,
        content: codeBlock`
          ${name} is deciding between the following options:
          ${Array.isArray(choices) ? choices.map((c) => `* ${c}`).join('\n') : JSON.stringify(choices, null, 2)}

          ## Description
          ${instructionString}

          ## Rules
          * ${name} must decide on one of the options. Return ${name}'s decision.
        `
      };
    },
    streamProcessor: boilerPlateStreamProcessor,
    postProcess: async (memory: WorkingMemory, response: string) => {
      const stripped = stripResponseBoilerPlate(memory, verb, response);
      const newMemory = {
        role: ChatMessageRoleEnum.Assistant,
        content: `${memory.entityName} ${verb}: "${stripped}"`
      };
      return [newMemory, stripped];
    }
  };

  if (transformOpts.stream) {
    return memory.transform(opts, { ...transformOpts, stream: true });
  } else {
    return memory.transform(opts, transformOpts);
  }
}

export const summarize = (memory: WorkingMemory, extraInstructions: string, transformOpts: TransformOptions = {}) => {
  const opts: MemoryTransformationOptions<string> = {
    command: ({ entityName: name }: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        name: name,
        content: codeBlock`
          ${name} is summarizing the information provided.

          ## Extra Instructions
          ${extraInstructions}

          Please reply with the summary in the voice of ${name}. Use the format '${name} summarized: "..."'
        `
      };
    },
    postProcess: async (memory: WorkingMemory, response: string) => {
      const stripped = stripResponseBoilerPlate(memory, "summarized", response);
      const newMemory = {
        role: ChatMessageRoleEnum.Assistant,
        content: `${memory.entityName} summarized: "${stripped}"`
      };
      return [newMemory, stripped];
    }
  };

  if (transformOpts.stream) {
    return memory.transform(opts, { ...transformOpts, stream: true });
  } else {
    return memory.transform(opts, transformOpts);
  }
}



export const brainstorm = (memory: WorkingMemory, description: string, transformOpts: TransformOptions = {}) => {
  const params = z.object({
    newIdeas: z.array(z.string()).describe(`The new brainstormed ideas.`)
  });

  const opts: MemoryTransformationOptions<z.infer<typeof params>, string[]> = {
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
  };

  if (transformOpts.stream) {
    return memory.transform(opts, { ...transformOpts, stream: true });
  } else {
    return memory.transform(opts, transformOpts);
  }
}

export const mentalQuery = (memory: WorkingMemory, statement: string, transformOpts: TransformOptions = {}) => {
  const params = z.object({
    isStatementTrue: z.boolean().describe(`Is the statement true or false?`),
  });

  const opts: MemoryTransformationOptions<z.infer<typeof params>, boolean> = {
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
        content: `${memory.entityName} evaluated: \`${statement}\` and decided that the statement is ${response}`
      };
      return [newMemory, response.isStatementTrue];
    }
  };

  if (transformOpts.stream) {
    return memory.transform(opts, { ...transformOpts, stream: true });
  } else {
    return memory.transform(opts, transformOpts);
  }
}

export const instruction = (memory: WorkingMemory, command: string, transformOpts: TransformOptions = {}) => {
  const opts: MemoryTransformationOptions<string, string> = {
    command: ({ entityName: name }: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        name: name, // Utilizing entityName from WorkingMemory for name
        content: command,
      };
    },
    postProcess: async (memory: WorkingMemory, response: string) => {
      const newMemory = {
        role: ChatMessageRoleEnum.Assistant,
        content: `${memory.entityName} executed command: ${command} with response: ${response}`
      };
      return [newMemory, response];
    }
  };

  if (transformOpts.stream) {
    return memory.transform(opts, { ...transformOpts, stream: true });
  } else {
    return memory.transform(opts, transformOpts);
  }
}
