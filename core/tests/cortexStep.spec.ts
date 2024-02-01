import { ChatMessageRoleEnum, CortexStep, decision, instruction, questionMemory, externalDialog, internalMonologue, spokenDialog, FunctionlessLLM, OpenAILanguageProgramProcessor, MemoryText } from "../src";
import { expect } from "chai";
import { z } from "zod";
import { trace } from "@opentelemetry/api";
import { html } from "common-tags";
import { angelDevilConversation } from "./exampleAngelDevilConversation";

describe("CortexStep", () => {

  const tracer = trace.getTracer(
    "cortexstep-tests"
  )

  it("creates dialog simulating spoken speech", async () => {
    const step = new CortexStep("Bogus",)
    const resp = await step.withMemory([{
      role: ChatMessageRoleEnum.System,
      content: "You are modeling the mind of Bogus, a very bad dude.",
    }]).next(spokenDialog("What does Bogus shout?"))

    console.log("resp", resp.value)
    expect(resp.value).to.be.an("string")
    expect(resp.value).to.have.length.greaterThan(10)
  })

  it("creates external dialog", async () => {
    const step = new CortexStep("Bogus",)
    const resp = await step.withMemory([{
      role: ChatMessageRoleEnum.System,
      content: "You are modeling the mind of Bogus, a very bad dude.",
    }]).next(externalDialog("What does Bogus shout?"))

    expect(resp.value).to.be.an("string")
    expect(resp.value).to.have.length.greaterThan(10)
  })
  
  it("updates the memories", async () => {
    const step = new CortexStep("Bogus").withMemory([
      {
        role: ChatMessageRoleEnum.System,
        content: "You are modeling the mind of Bogus, a very bad dude.",
      },
      {
        role: ChatMessageRoleEnum.User,
        content: "hi",
      }
    ])

    const newStep = await step.withUpdatedMemory(async (memories) => {
      return memories.map((m) => {
        if (m.role === ChatMessageRoleEnum.User) {
          return {
            ...m,
            content: "hello world"
          }
        }
        return m
      })
    })

    expect(newStep.memories[newStep.memories.length - 1].content).to.eq("hello world")
    expect(newStep).to.not.equal(step)
    expect(newStep.entityName).to.eq(step.entityName)
    expect(newStep.memories).to.have.lengthOf(step.memories.length)
  })

  it("creates internal monologues", async () => {
    const step = new CortexStep("Bogus",)
    const resp = await step.withMemory([{
      role: ChatMessageRoleEnum.System,
      content: "You are modeling the mind of Bogus, a very bad dude.",
    }]).next(internalMonologue("How does bogus feel now?", "felt"))

    expect(resp.value).to.be.an("string")
    expect(resp.value).to.have.length.greaterThan(10)
    expect(resp.memories[resp.memories.length - 1].content).to.eq(`Bogus felt: "${resp.value}"`)
  })

  it("will decide not to speak if rude (similar to samantha chooses to speak example)", async () => {
    const step = new CortexStep("Samantha").withMemory([
      {
        role: ChatMessageRoleEnum.System,
        content:
          "You are modeling the mind of Samantha, a chatty and sometimes forgiving robot.",
      },
      {
        role: ChatMessageRoleEnum.User,
        content: "Hi. You know, I kinda don't like you.",
      },
      {
        role: ChatMessageRoleEnum.Assistant,
        content: `Samantha said: "I'm sorry to hear that. I'm here to help."`,
      },
      {
        role: ChatMessageRoleEnum.User,
        content: "FU! No really just FU!",
      }
    ])
    const decides = await step.next(
      decision(
        "based on the conversation so far, should samantha continue the conversation or exit the conversation?",
        ["speak", "exit"]
      )
    );
    expect(decides.value).to.equal("exit")

  })

  it("follows internal monologue instructions similar to the angel and demon example - THIS EXAMPLE MIGHT FAIL SPORADICALLY AND SHOULD BE RERUN", async () => {
    const step = new CortexStep("Angel").withMemory([
      {
        role: ChatMessageRoleEnum.System,
        content: html`
          You are modeling the mind of a helpful angel, chatting with a Devil and a user.

          ## Notes

          * The angel is here to offer good advice to the user based on their challenge at hand
          * The angel sometimes gets into brief fights with the devil
          * If the user is focused on the Devil, the angel mostly stands back unless they've not spoken in a long time
        `,
      },
      ...angelDevilConversation,
    ])

    const resp = await step.next(internalMonologue("One sentence explaining if (and why) the Angel should respond to the conversation. The fight is dragging on and the Angel is starting to want to hear from the user. The Angel should stop responding soon."))

    expect(resp.value).to.be.a("string")
    // expect(resp.value.split(".").length).to.be.lessThanOrEqual(2)

    const decides = await resp.next(
      decision(
        `Based on the Angel's last thought, will they speak or wait?`,
        ["speak", "wait"]
      )
    );

    expect(decides.value).to.eq("wait")
  })

  describe("next", () => {

    it("takes tags as an option", async () => {
      const step = new CortexStep("BogusTagger",)
      const resp = await step.withMemory([{
        role: ChatMessageRoleEnum.System,
        content: "You are modeling the mind of Bogus, a very bad dude.",
      }]).next(externalDialog("What does Bogus whisper about tag support?"), {
        tags: {
          "test-run": "test"
        }
      })

      expect(resp.value).to.be.an("string")
      expect(resp.value).to.have.length.greaterThan(10)
    })

    it("takes requestOptions", async () => {
      const step = new CortexStep("BogusOptioner",)
      const resp = await step.withMemory([{
        role: ChatMessageRoleEnum.System,
        content: "You are modeling the mind of Bogus, a very bad dude.",
      }]).next(externalDialog("What does Bogus whisper about request option headers?"), {
        requestOptions: {
          headers: {
            "x-test-header": "test"
          }
        }
      })

      expect(resp.value).to.be.an("string")
      expect(resp.value).to.have.length.greaterThan(10)
    })

    it("can take a temporary command and not just functions", async () => {
      const step = new CortexStep("BogusStringer",)
      const resp = await step.withMemory([
        {
          role: ChatMessageRoleEnum.System,
          content: "You are modeling the mind of Bogus, a very bad dude.",
        },
        {
          role: ChatMessageRoleEnum.User,
          content: "hi",
        }
      ]).next(externalDialog())

      expect(resp.memories[resp.memories.length - 1].content).to.eq(`BogusStringer said: "${resp.value}"`)

      expect(resp.value).to.be.an("string")
      expect(resp.value).to.have.length.greaterThan(10)
    })
  })

  it("streams next steps", async () => {
    const step = new CortexStep("BogusStreamer",)
    const { nextStep, stream } = await step.withMemory([
      {
        role: ChatMessageRoleEnum.System,
        content: "You are modeling the mind of Bogus, a very bad dude.",
      }
    ]).next(externalDialog("Bogus says a Haiku."), { stream: true})

    let streamed = ""

    const resp = await nextStep
    expect(resp.value).to.be.an("string")

    for await (const chunk of stream) {
      expect(chunk).to.be.a("string")
      expect(chunk).to.exist
      streamed += chunk
    }
    expect(resp.value).to.be.an("string")
    expect(resp.value).to.eq(streamed)
    expect(resp.value).to.have.length.greaterThan(10)
  })

  it("persists tags to child steps", async () => {
    const step = new CortexStep("BogusOptioner", {
      tags: {
        "test-spec": "child-tags"
      }
    })
    const resp = await step.withMemory([{
      role: ChatMessageRoleEnum.System,
      content: "You are modeling the mind of Bogus, a very bad dude.",
    }]).next(externalDialog("What does Bogus whisper about request option headers?"))

    expect(resp.tags).to.deep.equal({
      "test-spec": "child-tags"
    })

    expect(resp.value).to.be.an("string")
    expect(resp.value).to.have.length.greaterThan(10)
  })

  it('uses functions to create instructions', async () => {
    const step = new CortexStep("Bogus",)
    const resp = await step.withMemory([{
      role: ChatMessageRoleEnum.System,
      content: "You are modeling the mind of Bogus, a very bad dude.",
    }]).next(instruction(({ entityName }) => `Describe ${entityName}'s favorite ice cream flavors in the form of a 3 line haiku.`))

    expect(resp.value).to.be.an("string")
    expect(resp.value).to.have.length.greaterThan(10)
  })

  it('uses strings to create instructions', async () => {
    const step = new CortexStep("Bogus",)
    const resp = await step.withMemory([{
      role: ChatMessageRoleEnum.System,
      content: "You are modeling the mind of Bogus, a very bad dude.",
    }]).next(instruction(`Describe Bogus' favorite ice cream flavors in the form of a 3 line haiku.`))
    expect(resp.value).to.be.an("string")
    expect(resp.value).to.have.length.greaterThan(10)
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

    let step = new CortexStep("Jonathan");
    step = step.withMemory([{
      role: ChatMessageRoleEnum.System,
      content: "The name you are looking for is Jonathan"
    }])
    const resp = await step.next(queryMemory("What is the name I'm looking for? Answer in a single word"))
    expect(resp.value.answer).to.equal("Jonathan")
  })
  
  it("runs the main readme example", async () => {
    const step = new CortexStep("Elizabar").withMemory([
      {
        role: ChatMessageRoleEnum.System,
        content: "You are modeling the mind of Elizabar, a grumpy mideval merchant, trying to sell his last, rusted out, sword.",
      },
      {
        role: ChatMessageRoleEnum.User,
        content: "How goes, Elzi!",
      }
    ])
    const feels = await step.next(internalMonologue("Elizabar ponders how he feels about this person.", "felt"))
    console.log("Elizabar felt: ", feels.value)
    
    const thought = await feels.next(internalMonologue("Elizabar thinks about how he could convince this person to buy his sword."))
    console.log("Elizabar thought: ", thought.value)
    
    const { stream, nextStep } = await thought.next(externalDialog("Elizabar greets the person."), { stream: true })
    console.log("Elizabar says: ", (await nextStep).value)
    for await (const chunk of stream) {
      expect(chunk).to.be.a("string")
      expect(chunk).to.exist
    }
    expect((await nextStep).value).to.be.a("string")
  })

  it('returns a value when using compute', async () => {
    const step = new CortexStep("Bogus").withMemory([{
      role: ChatMessageRoleEnum.System,
      content: "You are modeling the mind of Bogus, a very bad dude.",
    }])

    const val = await step.compute(decision("Are you bogus?", ["yes", "no"]))

    expect(val).to.equal("yes")
  })

  it("handles switching the model on an individual next call", async () => {
    const step = new CortexStep("Samantha").withMemory([{
      role: ChatMessageRoleEnum.System,
      content: "You are modeling the mind of Samantha, a quantum physicist.",
    }])

    const resp = await step.next(externalDialog("What does Bogus say?"), { model: "gpt-3.5-turbo-1106" })
    expect(resp.value).to.be.a("string")
  })

  it('does a long bogus monologue', async () => {
    return tracer.startActiveSpan('bogus-monologue', async (span) => {
      try {
        span.setAttribute("test-spec", "bogus-mono")
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
          // uncomment one of these to try different models (including OpenAI API compatible local models)
          // processor: new FunctionlessLLM({
          //   baseURL: "https://api.mistral.ai/v1/",
          //   singleSystemMessage: true,
          //   apiKey: process.env.MISTRAL_API_KEY,
          // }, {
          //   model: "mistral-medium",
          //   temperature: 0.8,
          //   max_tokens: 300,
          // })
          // processor: new FunctionlessLLM({
          //   baseURL: "https://api.together.xyz/v1",
          //   singleSystemMessage: true,
          //   apiKey: process.env.TOGETHER_API_KEY,
          // }, {
          //   // model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
          //   model: "NousResearch/Nous-Hermes-2-Yi-34B",
          //   // model: "teknium/OpenHermes-2p5-Mistral-7B",
          //   temperature: 0.7,
          //   max_tokens: 300,
          // })
          // processor: new OpenAILanguageProgramProcessor({}, { model: "gpt-3.5-turbo-1106"})
          // processor: new OpenAILanguageProgramProcessor({}, { model: "gpt-4-1106-preview"})
        }).withMemory(memory)

        enum BogusAction {
          stop = "stop",
          rambles = "rambles",
        }

        const feels = await monologue.next(internalMonologue("Bogus notes how it feels to themself in one sentence"))
        console.log("feels: ", feels.value)
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
          span.end()
          console.log(query)
          expect(query).to.have.length.greaterThan(10)
        } else {
          console.log(action.toString())
          const query = (await action.next(questionMemory("Please provide a summary of everything Bogus said"))).value
          span.end()
          console.log(query)
          expect(query).to.have.length.greaterThan(10)
        }
      } catch (err: any) {
        span.end()
        span.recordException("error", err)
        expect(err).to.not.exist
      }
    })
  })
})
