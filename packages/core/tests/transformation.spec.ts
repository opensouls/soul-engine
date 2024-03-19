import "../src/processors/OpenAIProcessor.js"
import { codeBlock } from "common-tags"
import { ChatMessageRoleEnum, CognitiveTransformation, TransformMemoryOptions, WorkingMemory } from "../src/WorkingMemory.js"
import { expect } from "chai";
import { EnumLike, z } from "zod";
import { decision, externalDialog, internalMonologue } from "./shared/cognitiveTransformations.js";

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

    const [, stream, response] = await workingMemory.next(externalDialog("Please say hi back to me."), { stream: true })
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

  it('allows next chaining', async () => {
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

  it("runs example from readme", async () => {

    const params = z.object({
      answer: z.string().describe(`The answer to the question.`)
    })

    const queryMemory = (query: string): TransformMemoryOptions<z.infer<typeof params>, string> => {
      return {
        command: codeBlock`
            ${query}
          `,
        schema: params,
        postProcess: (memory: WorkingMemory, response: z.infer<typeof params>) => {
          return {
            memories: [{
              role: ChatMessageRoleEnum.System,
              content: `The answer to ${query} is ${response.answer}.`
            }],
            value: response.answer
          }
        }
      }
    }

    let memory = new WorkingMemory({
      entityName: "Jonathan",
      memories: [{
        role: ChatMessageRoleEnum.System,
        content: "The name you are looking for is Jonathan"
      }]
    });

    const [, value] = await memory.next(queryMemory("What is the name I'm looking for? Answer in a single word"))
    expect(value).to.equal("Jonathan")
  })


})