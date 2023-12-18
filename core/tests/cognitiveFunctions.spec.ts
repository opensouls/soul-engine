import { expect } from "chai";
import { CortexStep, externalDialog } from "../src";

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
});
