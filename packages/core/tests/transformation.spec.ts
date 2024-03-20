import "../src/processors/OpenAIProcessor.js"
import { codeBlock } from "common-tags"
import { ChatMessageRoleEnum, MemoryTransformation, MemoryTransformationOptions, WorkingMemory, TransformOptions } from "../src/WorkingMemory.js"
import { expect } from "chai";
import { EnumLike, z } from "zod";
import { externalDialog } from "./shared/cognitiveSteps.js";

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

    const [newMemory, response] = await externalDialog(workingMemory, "Please say hi back to me.")
    expect(response).to.be.a('string')
    // console.log("newMemory", newMemory, "resp: ", response)
    expect(newMemory.find(m => m.role === ChatMessageRoleEnum.Assistant)?.content).to.include("testy said:")
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

    const [, stream, response] = await externalDialog(workingMemory, "Please say hi back to me.", { stream: true })
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

    let newMemory, stream, response;
    [newMemory, stream, response] = await externalDialog(workingMemory, "Please say hi back to me.", { stream: true });
    // for instance you could speak(stream) here and then just carry on
    [newMemory, stream] = await externalDialog(newMemory, "Now please say 'goodbye'", { stream: true });
    await newMemory.finished

    expect(newMemory.memories.length).to.equal(4)
  })

  it("runs example from readme", async () => {

    const params = z.object({
      answer: z.string().describe(`The answer to the question.`)
    })
    const queryMemory = (memory: WorkingMemory, query: string, transformOpts: TransformOptions = {}) => {
      const opts: MemoryTransformationOptions<z.infer<typeof params>, string> = {
        command: ({ entityName: name }: WorkingMemory) => {
          return {
            role: ChatMessageRoleEnum.System,
            name: name,
            content: codeBlock`
              ${name} is querying the following:
              > ${query}

              Please reply with the answer to the query.
            `
          };
        },
        schema: params,
        postProcess: async (memory: WorkingMemory, response: z.output<typeof params>) => {
          const newMemory = {
            role: ChatMessageRoleEnum.Assistant,
            content: `${memory.entityName} queried: \`${query}\` and found that the answer is ${response.answer}`
          };
          return [newMemory, response.answer];
        }
      };

      if (transformOpts.stream) {
        return memory.transform(opts, { ...transformOpts, stream: true });
      } else {
        return memory.transform(opts, transformOpts);
      }
    }

    let memory = new WorkingMemory({
      entityName: "Jonathan",
      memories: [{
        role: ChatMessageRoleEnum.System,
        content: "The name you are looking for is Jonathan"
      }]
    });

    const [, value] = await queryMemory(memory, "What is the name I'm looking for? Answer in a single word")
    expect(value).to.equal("Jonathan")
  })


})