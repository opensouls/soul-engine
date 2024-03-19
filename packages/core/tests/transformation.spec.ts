import "../src/processors/OpenAIProcessor.js"
import { codeBlock } from "common-tags"
import { ChatMessageRoleEnum, CognitiveTransformation, TransformMemoryOptions, WorkingMemory } from "../src/WorkingMemory.js"
import { expect } from "chai";
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

const externalDialog = (extraInstructions: string, verb = "says") => {
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

const internalMonologue = (extraInstructions?: string, verb = "thought") => {
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

const decision = (description: string, choices: EnumLike | string[]) => {

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

describe("memory transformations", () => {
  
  it('allows simple externalDialog implementation', async () => {
    const workingMemory = new WorkingMemory({
      entityName: 'testy',
      memories: [
        {
          role: ChatMessageRoleEnum.System,
          content: "You are modeling the mind of Testy, a super testy QA robot."
        },
        {
          role: ChatMessageRoleEnum.User,
          content: "hi!"
        }
      ]
    })

    const [newMemory, response] = await workingMemory.next(externalDialog("Please say hi back to me."))
    expect(response).to.be.a('string')
    console.log("newMemory", newMemory, "resp: ", response)
    expect(newMemory.find(m => m.role === ChatMessageRoleEnum.Assistant)?.content).to.include("testy says:")
  })

  it('streams a simple externalDialog implementation', async () => {
    const workingMemory = new WorkingMemory({
      entityName: 'testy',
      memories: [
        {
          role: ChatMessageRoleEnum.System,
          content: "You are modeling the mind of Testy, a super testy QA robot."
        },
        {
          role: ChatMessageRoleEnum.User,
          content: "hi!"
        }
      ]
    })
    
    const [,stream, response] = await workingMemory.next(externalDialog("Please say hi back to me."), { stream: true })
    let streamed = ""
    for await (const chunk of stream) {
      streamed += chunk
    }
    expect(await response).to.equal(streamed)
  })

  it('returns a new memory that can be used right away even if stream is not finished', async () => {
    const workingMemory = new WorkingMemory({
      entityName: 'testy',
      memories: [
        {
          role: ChatMessageRoleEnum.System,
          content: "You are modeling the mind of Testy, a super testy QA robot."
        },
        {
          role: ChatMessageRoleEnum.User,
          content: "hi!"
        }
      ]
    })
    
    let newMemory, stream, response
    [newMemory, stream, response] = await workingMemory.next(externalDialog("Please say hi back to me."), { stream: true });
    // for instance you could speak(stream) here and then just carry on
    [newMemory, stream] = await newMemory.next(externalDialog("Now please say 'goodbye'"), { stream: true });
    await newMemory.finished

    expect(newMemory.memories.length).to.equal(4)
  })

  it.only('allows next chaining', async () => {
    const workingMemory = new WorkingMemory({
      entityName: 'testy',
      memories: [
        {
          role: ChatMessageRoleEnum.System,
          content: "You are modeling the mind of Testy, a super testy QA robot."
        },
        {
          role: ChatMessageRoleEnum.User,
          content: "you are quite testy!"
        }
      ]
    })

    const [newMemory, value] = await workingMemory.next(
      internalMonologue("Testy thinks about a beautiful retort.")
    ).next(
      decision("Testy decides to respond with a witty retort.", ["I'm rubber, you're glue.", "I know you are but what am I?"])
    )

    await newMemory.finished
    
    expect(newMemory.memories.length).to.equal(4)

    console.log('value: ', value)

    expect(["I'm rubber, you're glue.", "I know you are but what am I?"]).to.include(value)
  })


})