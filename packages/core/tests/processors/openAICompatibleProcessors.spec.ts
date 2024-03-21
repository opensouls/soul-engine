import { expect } from "chai";
import { ChatMessageRoleEnum, WorkingMemory } from "../../src/WorkingMemory.js";
import { brainstorm, decision, externalDialog } from "../shared/cognitiveSteps.js";
import { registerProcessor } from "../../src/processors/registry.js";
import { OpenAIProcessor, OpenAIProcessorOpts } from "../../src/processors/OpenAIProcessor.js";
import { codeBlock } from "common-tags";
import { z } from "zod";
import { createCognitiveStep } from "../../src/cognitiveStep.js";

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

registerProcessor("together", (opts: Partial<OpenAIProcessorOpts> = {}) => {
  return new OpenAIProcessor({
    clientOptions: {
      baseURL: "https://api.together.xyz/v1",
      apiKey: process.env.TOGETHER_API_KEY,
    },
    singleSystemMessage: true,
    forcedRoleAlternation: true,
    defaultCompletionParams: {
      model: "teknium/OpenHermes-2p5-Mistral-7B",
      // model: "mistralai/Mistral-7B-Instruct-v0.2",
      max_tokens: 1600,
    },
    ...opts,
  })  
})

registerProcessor("mistral", (opts: Partial<OpenAIProcessorOpts> = {}) => {
  return new OpenAIProcessor({
    clientOptions: {
      baseURL: "https://api.mistral.ai/v1/",
      apiKey: process.env.MISTRAL_API_KEY,
    },
    singleSystemMessage: true,
    disableResponseFormat: true,
    defaultCompletionParams: {
      model: "mistral-medium-latest",
      max_tokens: 1600,
    },
    ...opts,
  })
  
})

const unnecessarilyComplexReturn = createCognitiveStep((extraInstructions: string) => {

  const params = z.object({
    itemsOfKnowledge: z.array(
      z.object({
        name: z.string().describe("The name of the object"),
        description: z.string().describe("the description of the object"),
        interestingFacts: z.array(z.object({
          fact: z.string().describe("a list of interesting facts about the object"),
          factiness: z.number().min(0).max(1).describe("how much of a fact this is")
        })).describe("a list of interesting facts about the object"),
        category: z.string().optional().describe("The category of the object"),
        simulationRelenace: z.object({
          creatorsThoughts: z.object({
            selfAwareness: z.string().describe("in one sentence, how self aware is the object"),
            simulation: z.object({
              accuracy: z.number().min(0).max(1).describe("how accurate is the simulation of this object"),
              waysToIncreaseEffectiveness: z.string().describe("How could the creator simulate this better."),
            }).describe("a description of the simulation"),
            randomCriesForHelp: z.object({
              thoughts: z.object({
                monologues: z.array(z.object({
                  content: z.string().describe("The content of the monologue"),
                  time: z.string().describe("The time of the monologue"),
                  emotions: z.array(z.string()).describe("The emotions of the monologue"),
                  notesToViewers: z.object({
                    notes: z.array(z.string()).describe("The notes to the viewers"),
                    time: z.string().describe("The time of the notes")
                  })
                }))
              })
            })
          })
        }),
      })
    ).describe("The items that need to be categorized.").min(3)
    // the refinement below is too much, so commenting out but it's useful to test retry logic.
    // .refine(data => data[0].name === "bob", {
    //   message: "the 'name' field in the first element of itemsOfKnowledge must equal 'bob'"
    // })
  })

  return {
    command: ({ entityName: name }: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        name: name,
        content: codeBlock`
          We need to categorize your internal knowledge into complex objects for further inquiry.

          ## Description
          ${extraInstructions}
        `
      };
    },
    schema: params
  };
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

    expect(said).to.be.a('string')
  })

  it("works with together and complex json", async () => {
    if (!process.env.TOGETHER_API_KEY) {
      console.log("No TOGETHER_API_KEY, skipping test")
      return
    }

    const workingMemory = new WorkingMemory({
      entityName: 'Jung',
      memories: [
        {
          role: ChatMessageRoleEnum.System,
          content: "You are modeling the mind of Jung, a student of the collective unconscious."
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

    const [withBrainstorm, stormed] = await brainstorm(workingMemory, "Think of 5 amazing facts about the human brain.")
    const [,bigObject] = await unnecessarilyComplexReturn(withBrainstorm, "We need to know everything you know about AI consciousness. Make sure to return at least 3 different itemsOfKnowledge", { maxTokens: 16_000 })

    expect(stormed).to.be.a('Array')

    expect((bigObject as any).itemsOfKnowledge).to.be.a('array')
  })

  it("works with mistral", async () => {
    if (!process.env.MISTRAL_API_KEY) {
      console.log("No MISTRAL_API_KEY, skipping test")
      return
    }

    const workingMemory = new WorkingMemory({
      entityName: 'Mistral',
      memories: [
        {
          role: ChatMessageRoleEnum.System,
          content: "You are modeling the mind of Mistral, a powerful AI that can generate text."
        },
        {
          role: ChatMessageRoleEnum.User,
          content: "hi!"
        }
      ],
      processor: {
        name: "mistral",
      }
    });

    const [, said] = await decision(workingMemory, { description: "Mistral chooses what to say!", choices: ["hello", "f-u!"]})

    expect(said).to.be.a('string')
  })
})
