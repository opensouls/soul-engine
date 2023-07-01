// import { isAbstractTrue } from "../src/testing";
const { Action, CortexStep } = require("../src");

test("CortexStep long monologue", async () => {
  const context = [
    {
      role: "system",
      content:
        "<Context>You are modeling the mind of Bogus, an evil entity that eats children</Context>",
    },
    {
      role: "user",
      content: "hi",
    },
  ];
  const monologue = new CortexStep("Bogus");
  monologue.pushContext(context);
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
  } else {
    console.log(action.toString());
  }

  expect(true).toBeTruthy();
}, 35000);

test("CortexStep decision", async () => {
  const context = [
    {
      role: "system",
      content:
        "<Context>You are modeling the mind of Bogus, an evil entity that eats children</Context>",
    },
    {
      role: "user",
      content: "hi",
    },
  ];
  const initialCortex = new CortexStep("Bogus");
  initialCortex.pushContext(context);
  const feels = await initialCortex.next(Action.INTERNAL_MONOLOGUE, {
    action: "feels",
    description: "Bogus notes how it feels to themself in one sentence",
  });
  const decision = await feels.next(Action.DECISION, {
    description: "the action Bogus decides to take next",
    choices: ["none", "rambles"],
  });
  console.log(decision.toString());

  expect(true).toBeTruthy();
}, 35000);
