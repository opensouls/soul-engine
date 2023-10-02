import { CortexStep } from "../../src/next/CortexStep";
import { ChatMessageRoleEnum } from "../../src/next/languageModels";
import { decision, externalDialog, internalMonologue, queryMemory, stringCommand } from "../../src/next/cognitiveFunctions";
import { expect } from "chai";
import { z } from "zod";
import { trace } from "@opentelemetry/api";

describe("CortexStep", () => {

  console.log("acquiring tracer")
  const tracer = trace.getTracer(
    "cortexstep-tests"
  )

  it("uses functions for external dialog", async () => {
    const step = new CortexStep("Bogus",)
    const resp = await step.withMemory([{
      role: ChatMessageRoleEnum.System,
      content: "You are modeling the mind of Bogus, a very bad dude.",
    }]).next(externalDialog("shouts", "What does Bogus shout?"))

    expect(resp.value).to.be.an("string")
    expect(resp.value).to.have.length.greaterThan(10)
  })

  describe("next", () => {

    it("takes tags as an option", async () => {
      const step = new CortexStep("BogusTagger",)
      const resp = await step.withMemory([{
        role: ChatMessageRoleEnum.System,
        content: "You are modeling the mind of Bogus, a very bad dude.",
      }]).next(externalDialog("shouts", "What does Bogus shout about tag support?"), {
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
      }]).next(externalDialog("whispers", "What does Bogus whisper about request option headers?"), {
        requestOptions: {
          headers: {
            "x-test-header": "test"
          }
        }
      })

      expect(resp.value).to.be.an("string")
      expect(resp.value).to.have.length.greaterThan(10)
    })

    it("can take a temporary system command and not just functions", async () => {
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
      ]).next(stringCommand("What would Bogus say now?"))

      expect(resp.memories[resp.memories.length - 1].content).to.eq(resp.value)

      expect(resp.value).to.be.an("string")
      expect(resp.value).to.have.length.greaterThan(10)
    })
  })

  it("EXPERIMENTALLY streams next steps", async () => {
    const step = new CortexStep("BogusStreamer",)
    const { nextStep, stream } = await step.withMemory([
      {
        role: ChatMessageRoleEnum.System,
        content: "You are modeling the mind of Bogus, a very bad dude.",
      }
    ]).experimentalStreamingNext(stringCommand("What one paragraph response would bogus have now?"))

    let streamed = ""

    for await (const chunk of stream) {
      expect(chunk).to.be.a("string")
      expect(chunk).to.exist
      streamed += chunk
    }

    const resp = await nextStep
    expect(resp.memories[resp.memories.length - 1].content).to.eq(resp.value)
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
    }]).next(externalDialog("whispers", "What does Bogus whisper about request option headers?"))

    expect(resp.tags).to.deep.equal({
      "test-spec": "child-tags"
    })

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
        const monologue = new CortexStep("Bogus").withMemory(memory)

        enum BogusAction {
          none = "none",
          rambles = "rambles",
        }

        const feels = await monologue.next(internalMonologue("feels", "Bogus notes how it feels to themself in one sentence"))
        const thinks = await feels.next(internalMonologue("thinks", "what Bogus thinks to themself in one sentence"))
        const says = await thinks.next(externalDialog("says", "what Bogus says out loud next"))
        const action = await says.next(decision("decision", BogusAction))
        if (action.value.decision === BogusAction.rambles) {
          const rambles = await action.next(externalDialog("rambles", "Bogus rambles for two sentences out loud, extending its last saying"))
          const shouts = await rambles.next(externalDialog("shouts", "Bogus shouts incredibly loudly with all caps"))
          const exclaims = await shouts.next(externalDialog("exclaims", "Bogus exclaims"))
          const continues = await exclaims.next(externalDialog("continues", "Bogus continues"))
          console.log(continues.toString());
          const query = (await continues.next(queryMemory("Please provide a summary of everything Bogus said"))).value
          span.end()
          console.log(query)
          expect(query.answer).to.have.length.greaterThan(10)
        } else {
          console.log(action.toString())
          const query = (await action.next(queryMemory("Please provide a summary of everything Bogus said"))).value
          span.end()
          console.log(query)
          expect(query.answer).to.have.length.greaterThan(10)
        }
      } catch (err: any) {
        span.end()
        span.recordException("error", err)
        expect(err).to.not.exist
      }
    })
  })
})
