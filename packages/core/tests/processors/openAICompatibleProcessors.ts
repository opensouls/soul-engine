import { expect } from "chai";
import { ChatMessageRoleEnum, WorkingMemory } from "../../src/WorkingMemory.js";
import { externalDialog } from "../shared/cognitiveSteps.js";
import { registerProcessor } from "../../src/processors/registry.js";
import { OpenAIProcessor, OpenAIProcessorOpts } from "../../src/processors/OpenAIProcessor.js";

registerProcessor("fireworks", (opts: Partial<OpenAIProcessorOpts> = {}) => {
  return new OpenAIProcessor({
    clientOptions: {
      baseURL: "https://api.fireworks.ai/inference/v1",
      apiKey: process.env.FIREWORKS_API_KEY,
    },
    singleSystemMessage: true,
    forcedRoleAlternation: true,
    defaultCompletionParams: {
      model: "fireworks/nous-hermes-2-mixtral-8x7b-dpo-fp8",
    },
    ...opts,
  })
  
})


describe("OpenAICompatibleProcessors", () => {

  it("works with fireworks", async () => {
    if (!process.env.FIREWORKS_API_KEY) {
      console.log("No FIREWORKS_API_KEY, skipping test")
      return
    }

    const workingMemory = new WorkingMemory({
      entityName: 'FIREMAN',
      memories: [
        {
          role: ChatMessageRoleEnum.System,
          content: "You are modeling the mind of FIREMAN, an AI designed to set off fireworks and celebrate just about everything."
        },
        {
          role: ChatMessageRoleEnum.User,
          content: "hi!"
        }
      ],
      processor: {
        name: "fireworks",
      }
    });

    const [, said] = await externalDialog(workingMemory, "What does FIREMAN say?")

    console.log('said', said)
    expect(said).to.be.a('string')
  })
})