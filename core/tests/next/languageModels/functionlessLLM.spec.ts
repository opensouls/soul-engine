import { expect } from "chai";
import { ChatMessageRoleEnum } from "../../../src";
import { CortexStep, z } from "../../../src/next";
import { FunctionlessLLM } from "../../../src/next/languageModels/FunctionlessLLM";

// this is set to skip because it requires a locally running LLM server.
describe.skip("FunctionlessLLM", () => {
  it("runs example from readme", async () => {
    const queryMemory = (query: string) => {
      return () => {
        return {
          name: "queryMemory",
          description: query,
          parameters: z.object({
            answer: z.string().describe(`The answer to: ${query}`)
          })
        };
      }
    }

    let step = new CortexStep("Jonathan", {
      processor: new FunctionlessLLM({
        baseURL: "http://localhost:1234/v1"
      })
    });
    step = step.withMemory([{
      role: ChatMessageRoleEnum.System,
      content: "The name you are looking for is Jonathan"
    }])
    const resp = await step.next(queryMemory("What is the name I'm looking for? Answer in a single word"))
    expect(resp.value.answer).to.equal("Jonathan")
  }).timeout(65_000)

  it("runs example from readme when combining system messages", async () => {
    const queryMemory = (query: string) => {
      return () => {
        return {
          name: "queryMemory",
          description: query,
          parameters: z.object({
            answer: z.string().describe(`The answer to: ${query}`)
          })
        };
      }
    }

    let step = new CortexStep("Jonathan", {
      processor: new FunctionlessLLM({
        baseURL: "http://localhost:1234/v1",
        compressSystemMessages: true,
      })
    });
    step = step.withMemory([{
      role: ChatMessageRoleEnum.System,
      content: "The name you are looking for is Jonathan"
    }])
    const resp = await step.next(queryMemory("What is the name I'm looking for? Answer in a single word"))
    expect(resp.value.answer).to.equal("Jonathan")
  }).timeout(65_000)

})