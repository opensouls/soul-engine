import { expect } from "chai";
import { CortexStep, ChatMessageRoleEnum, decision, externalDialog, internalMonologue, questionMemory, z, brainstorm } from "../../src";
import { FunctionlessLLM } from "../../src/languageModels/FunctionlessLLM";

// this is set to skip because it requires a locally running LLM server.
describe.skip("FunctionlessLLM", () => {
  const step = new CortexStep("bob", {
    processor: new FunctionlessLLM({
      baseURL: "https://api.together.xyz/v1",
      singleSystemMessage: true,
      apiKey: process.env.TOGETHER_API_KEY,
    }, {
      // model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
      // model: "NousResearch/Nous-Hermes-2-Yi-34B",
      model: "teknium/OpenHermes-2p5-Mistral-7B",
      temperature: 0.7,
      max_tokens: 300,
    })
  })

  it('works with non-streaming, non-functions', async () => {
    const result = await step.next(externalDialog("hi"))
    expect(result.value).to.be.a("string")
  })

  it('works with streaming non-functions', async () => {
    const { nextStep, stream } = await step.next(externalDialog("hi"), { stream: true })
    expect(stream).to.be.an("AsyncGenerator")
    let streamed = ""
    for await (const res of stream) {
      streamed += res
    }
    expect((await nextStep).value).to.be.a("string")
    expect(streamed).to.equal((await nextStep).value)
  })

  it('streams functions', async () => {
    const { nextStep, stream } = await step.next(brainstorm("hi"), { stream: true })

    let streamed = ""
    for await (const res of stream) {
      streamed += res
    }
    expect((await nextStep).value).to.be.an("array")
    expect(JSON.parse(streamed).new_ideas[0]).to.equal((await nextStep).value[0])
  })

  it("works with functions", async () => {
    const result = await step.next(brainstorm("numbers less than 5"))
    expect(result.value).to.be.an("array")
    expect(parseInt(result.value[0])).to.be.a("number")
  })

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

    const step2 = step.withMemory([{
      role: ChatMessageRoleEnum.System,
      content: "The name you are looking for is Jonathan"
    }])
    const resp = await step2.next(queryMemory("What is the name I'm looking for? Answer in a single word"))
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

    const step2 = step.withMemory([{
      role: ChatMessageRoleEnum.System,
      content: "The name you are looking for is Jonathan"
    }])
    const resp = await step2.next(queryMemory("What is the name I'm looking for? Answer in a single word"))
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
          baseURL: "https://api.together.xyz/v1",
          singleSystemMessage: true,
          apiKey: process.env.TOGETHER_API_KEY,
        }, {
          // model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
          // model: "NousResearch/Nous-Hermes-2-Yi-34B",
          model: "teknium/OpenHermes-2p5-Mistral-7B",
          temperature: 0.7,
          max_tokens: 300,
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
        const query = (await continues.next(questionMemory("Please provide a summary of everything Bogus said"))).value
        console.log(query)
        expect(query).to.have.length.greaterThan(10)
      } else {
        console.log(action.toString())
        const query = (await action.next(questionMemory("Please provide a summary of everything Bogus said"))).value
        console.log(query)
        expect(query).to.have.length.greaterThan(10)
      }
    } catch (err: any) {
      expect(err).to.not.exist
    }
  })

})