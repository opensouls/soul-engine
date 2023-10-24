import { expect } from 'chai';
import { Action, ChatMessageRoleEnum, CortexStep } from "../src";
import dotenv from 'dotenv';
dotenv.config();

describe.skip("CortexStep", function() {
  this.timeout(35000);

  it("long monologue", async function() {
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
    let monologue = new CortexStep("Bogus");
    monologue = monologue.withMemory(memory);
    const feels = await monologue.next(Action.INTERNAL_MONOLOGUE, {
      action: "feels",
      description: "Bogus notes how it feels to themself in one sentence",
    });
    const thinks = await feels.next(Action.INTERNAL_MONOLOGUE, {
      action: "thinks",
      description: "what Bogus thinks to themself in one sentence",
    });
    const says = await thinks.next(Action.EXTERNAL_DIALOG, {
      action: "says",
      description: "what Bogus says out loud next",
    });
    const action = await says.next(Action.DECISION, {
      description:
        "the action Bogus decides to take next. Bogus rambles only 20% of the time.",
      choices: ["none", "rambles"],
    });
    if (action.value === "rambles") {
      const rambles = await action.next(Action.EXTERNAL_DIALOG, {
        action: "rambles",
        description:
          "Bogus rambles for two sentences out loud, extending its last saying",
      });
      const shouts = await rambles.next(Action.EXTERNAL_DIALOG, {
        action: "shouts",
        description: "Bogus shouts incredibly loudly with all caps",
      });
      const exclaims = await shouts.next(Action.EXTERNAL_DIALOG, {
        action: "exclaims",
        description: "Bogus exclaims",
      });
      const continues = await exclaims.next(Action.EXTERNAL_DIALOG, {
        action: "continues",
        description: "Bogus continues",
      });
      console.log(continues.toString());
      console.log(
        await continues.queryMemory(
          "please provide a summary of everything Bogus said"
        )
      );
    } else {
      console.log(action.toString());
      console.log(
        await action.queryMemory(
          "please provide a summary of everything Bogus said"
        )
      );
    }
  
    expect(true).to.be.true;
  });

  it("decision", async function() {
    const context = [
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
    let initialCortex = new CortexStep("Bogus");
    initialCortex = initialCortex.withMemory(context);
    const feels = await initialCortex.next(Action.INTERNAL_MONOLOGUE, {
      action: "feels",
      description: "Bogus notes how it feels to themself in one sentence",
    });
    const decision = await feels.next(Action.DECISION, {
      description: "the action Bogus decides to take next",
      choices: ["none", "rambles"],
    });
    console.log(decision.toString());
  
    expect(true).to.be.true; 
  });

  it("brainstorm", async function() {
    const context = [
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
    const initialCortex = new CortexStep("Bogus");
    initialCortex.withMemory(context);
    const feels = await initialCortex.next(Action.INTERNAL_MONOLOGUE, {
      action: "feels",
      description: "Bogus notes how it feels to themself in one sentence",
    });
    const decision = await feels.next(Action.BRAINSTORM_ACTIONS, {
      description: "ways to take over the world",
    });
    console.log(decision.value);
    console.log(decision.toString());
  
    expect(true).to.be.true; 
  });

  it("decision no description", async function() {
    const context = [
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
    const initialCortex = new CortexStep("Bogus");
    initialCortex.withMemory(context);
    const feels = await initialCortex.next(Action.INTERNAL_MONOLOGUE, {
      action: "feels",
      description: "Bogus notes how it feels to themself in one sentence",
    });
    const decision = await feels.next(Action.DECISION, {
      choices: ["offersCandy", "eatsChild"],
    });
    console.log(decision.toString());
  
    expect(true).to.be.true; 
  });

  it("value abstract equals", async function() {
    const context = [
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
    let initialCortex = new CortexStep("Bogus");
    initialCortex = initialCortex.withMemory(context);
    const feels = await initialCortex.next(Action.INTERNAL_MONOLOGUE, {
      action: "feels",
      description: "Bogus notes how it feels to themself in one sentence",
    });
    const isHappy = await feels.is("description of a happy emotion");
    const isEvil = await feels.is("description of an evil emotion");
    console.log(feels.value, isHappy, isEvil);
  
    expect(true).to.be.true; 
  });

  it("keep going!", async function() {
    const context = [
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
    let monologue = new CortexStep("Bogus");
    monologue = monologue.withMemory(context);
    let counter = 3;
    while (counter > 0) {
      const methodology = await monologue.next(Action.INTERNAL_MONOLOGUE, {
        action: "considers",
        description:
          "One sentence of Bogus internal monologue about what thinking methodology to use to determine its next thoughts",
      });
      const ideas = await methodology.next(Action.BRAINSTORM_ACTIONS, {
        description: methodology.value,
      });
      const decision = await ideas.next(Action.DECISION, {
        choices: ideas.value,
      });
      monologue = await decision.next(Action.INTERNAL_MONOLOGUE, {
        action: decision.value,
        description:
          "One sentence of Bogus internal monologue about how to accomplish the action",
      });
      counter -= 1;
    }
    console.log(monologue.toString());
  
    expect(true).to.be.true; 
  });
});
