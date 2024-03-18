import "../src/processors/OpenAIProcessor.js"
import { codeBlock } from "common-tags"
import { ChatMessageRoleEnum, WorkingMemory } from "../src/WorkingMemory.js"
import { CognitiveTransformation, TransformMemoryOptions, transformMemory } from "../src/transformations.js"
import { expect } from "chai";

const stripResponseBoilerPlate = ({ entityName }: WorkingMemory, _verb: string, response: string) => {
  // sometimes the LLM will respond with something like "Bogus said with a sinister smile: "I'm going to eat you!" (adding more words)
  // so we just strip any of those
  let strippedResponse = response.replace(new RegExp(`${entityName}.*?:`, "i"), "").trim();
  // get rid of the quotes
  strippedResponse = strippedResponse.replace(/^["']|["']$/g, '').trim();
  return strippedResponse
}


const externalDialog = async (workingMemory: WorkingMemory, extraInstructions: string, verb = "says", overrides: Partial<TransformMemoryOptions> = {}) => {
  const opts: TransformMemoryOptions = {
    processor: workingMemory.defaultProcessor,
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
    postProcess: (memory: WorkingMemory, response: string) => {
      const stripped = stripResponseBoilerPlate(memory, verb, response)
      const newMemory = memory.withMemories([{
          role: ChatMessageRoleEnum.Assistant,
          content: `${memory.entityName} ${verb}: "${stripped}"`
      }])
      return Promise.resolve([newMemory, stripped])
    },
    ...overrides,
  }

  return transformMemory(workingMemory, opts)
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

    const [newMemory, response] = await externalDialog(workingMemory, "Please say hi back to me.")
    expect(response).to.be.a('string')
    console.log("newMemory", newMemory, "resp: ", response)
    expect(newMemory.find(m => m.role === ChatMessageRoleEnum.Assistant)?.content).to.include("testy says:")
  })

  
})