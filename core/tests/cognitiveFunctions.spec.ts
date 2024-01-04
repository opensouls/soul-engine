import { expect } from "chai";
import { ChatMessageRoleEnum, CortexStep, externalDialog, mentalQuery } from "../src";
import { html } from "common-tags";
import { beforeEach } from "mocha";

describe("cognitiveFunctions", () => {
  it("correctly strips boilerplate from LLM response when there's a verb", async () => {
    const step = new CortexStep("Samantha");
    const result = await externalDialog()();

    if (!result.process) {
      throw new Error("missing process")
    }

    const { value } = await result.process(
      step,
      `${step.entityName} said: "Meet me 6:00PM at the park"`
    );
    expect(value).to.be.equal("Meet me 6:00PM at the park");
  });

  it("correctly strips boilerplate from LLM response when there's NO verb", async () => {
    const step = new CortexStep("Samantha");
    const result = await externalDialog()();
    
    if (!result.process) {
      throw new Error("missing process")
    }

    const { value } = await result.process(
      step,
      `${step.entityName}: "Meet me 6:00PM at the park"`
    );
    expect(value).to.be.equal("Meet me 6:00PM at the park");
  });

  describe.only("mentalQuery", () => {
    let samantha: CortexStep
    beforeEach(async () => {
      samantha = new CortexStep("Samantha").withMemory([{
        role: ChatMessageRoleEnum.System,
        content: html`
          You are modeling the mind of Samantha, a gen-z quantum computer physicist.
        `
      }])
    })

    it("decides true on a simple statement", async () => {
      const result = await samantha.next(mentalQuery(`The sky is blue`))
      expect(result.value).to.be.true
    })

    it("decides false on a simple statement", async () => {
      const result = await samantha.next(mentalQuery(`Samantha is a professional gardener.`))
      expect(result.value).to.be.false
    })

    it("decides true on a more complex dialog interaction", async () => {
      const game = samantha.withMemory([
        {
          role: ChatMessageRoleEnum.System,
          content: html`
            ## Conversational Setting
            Samantha is playing a guessing game where the user thinks of a rock star and Samantha tries to guess who the rock star is by asking yes or no questions.
          `
        },
        {
          role: ChatMessageRoleEnum.Assistant,
          content: html`
            Samantha said: Did the artist die before 1980?
          `
        },
        {
          role: ChatMessageRoleEnum.User,
          content: html`
            Interlocutor said: YES! THEY SURE DID!
          `
        },
      ])

      const result = await game.next(mentalQuery(`Samantha's conversation partner told them they guessed the rockstar correctly.`))
      // const result = await game.next(mentalQuery(`Samantha has guessed the rockstar correctly.`))
      expect(result.value).to.be.false
    })
  })
});
