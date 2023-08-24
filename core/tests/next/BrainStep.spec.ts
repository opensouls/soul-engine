import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema"
import { BrainStep } from "../../src/next/BrainStep";
import { ChatMessageRoleEnum } from "../../src";
import { decision, externalDialog, internalMonologue, queryMemory } from "../../src/next/cognitiveFunctions";


describe("BrainStep", () => {

  it.skip("zods", async () => {
    const Utterance = z.object({
      "utterance": z.string().describe("The utterance to send to the chatbot")
    })

    console.log(zodToJsonSchema(Utterance))
  })

  it("uses functions for utterance", async () => {
    const step = new BrainStep("utterance",)
    const resp = await step.withMemory([{
      role: ChatMessageRoleEnum.System,
      content: "You are modeling the mind of Bogus, a very bad dude.",
    }]).next(externalDialog("shouts", "What does Bogus shout?"))

    console.log("resp:" , resp.value)
  })

  it('does a long bogus monologue', async () => {
    const memory = [
      {
        role: ChatMessageRoleEnum.System,
        content:
          "<Context>You are modeling the mind of Bogus, an evil entity that eats children</Context>",
      },
      {
        role: ChatMessageRoleEnum.User,
        content: "hi",
      },
    ];
    const monologue = new BrainStep("Bogus").withMemory(memory)

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
      console.log((await continues.next(queryMemory("Please provide a summary of everything Bogus said"))).value)
    } else {
      console.log(action.value.toString())
      console.log((await action.next(queryMemory("Please provide a summary of everything Bogus said"))).value)
    }
  })

})