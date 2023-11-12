import { expect } from "chai";
import { ChatMessageRoleEnum } from "../../../src";
import { CortexStep, decision, externalDialog, internalMonologue, queryMemory, z } from "../../../src/next";
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
        singleSystemMessage: true,
      })
    });
    step = step.withMemory([{
      role: ChatMessageRoleEnum.System,
      content: "The name you are looking for is Jonathan"
    }])
    const resp = await step.next(queryMemory("What is the name I'm looking for? Answer in a single word"))
    expect(resp.value.answer).to.equal("Jonathan")
  }).timeout(65_000)


  it('does a long bogus monologue', async () => {
    try {
      const memory = [
        {
          role: ChatMessageRoleEnum.System,
          content:
            "You are modeling the mind of Bogus, an evil entity that eats children",
        },
        {
          role: ChatMessageRoleEnum.User,
          content: "hi",
        },
      ];
      const monologue = new CortexStep("Bogus", {
        processor: new FunctionlessLLM({
          baseURL: "http://localhost:1234/v1",
          singleSystemMessage: true,
        })
      }).withMemory(memory)

      enum BogusAction {
        stop = "stop",
        rambles = "rambles",
      }

      const feels = await monologue.next(internalMonologue("Bogus notes how it feels to themself in one sentence"))
      const thinks = await feels.next(internalMonologue("What does Bogus think to themself in one sentence"))
      const says = await thinks.next(externalDialog("What does Bogus says out loud next"))
      const action = await says.next(decision("Decide Bogus' next course of action in the dialog. Should he ramble or stop?", BogusAction))
      if (action.value === BogusAction.rambles) {
        const rambles = await action.next(externalDialog("Bogus rambles for two sentences out loud, extending his last saying"))
        const shouts = await rambles.next(externalDialog("Bogus shouts incredibly loudly with all caps"))
        const exclaims = await shouts.next(externalDialog("Bogus exclaims!"))
        const continues = await exclaims.next(externalDialog("Bogus continues"))
        console.log(continues.toString());
        const query = (await continues.next(queryMemory("Please provide a summary of everything Bogus said"))).value
        console.log(query)
        expect(query).to.have.length.greaterThan(10)
      } else {
        console.log(action.toString())
        const query = (await action.next(queryMemory("Please provide a summary of everything Bogus said"))).value
        console.log(query)
        expect(query).to.have.length.greaterThan(10)
      }
    } catch (err: any) {
      expect(err).to.not.exist
    }
  })

})