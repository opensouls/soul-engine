// import { isAbstractTrue } from "../src/testing";
const { Monologue } = require("../src");

test("Monologue stuff", async () => {
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
  const monologue = new Monologue("Bogus");
  monologue.pushContext(context);
  const feels = await monologue.next({
    action: "feels",
    prefix: "Bogus feels ",
    description: "Bogus notes how it feels to themself in one sentence",
  });
  const thinks = await feels.next({
    action: "thinks",
    prefix: "Bogus thinks ",
    description: "what Bogus thinks to themself in one sentence",
  });
  const says = await thinks.next({
    action: "says",
    prefix: 'Bogus says, "',
    description: "what Bogus says out loud next",
  });
  const action = await says.next({
    action: "action",
    prefix: "decision=",
    description:
      "the action Bogus decides to take next. Either 'decision=none' or 'decision=rambles'",
  });
  if (action.lastValue === "rambles") {
    const rambles = await action.next({
      action: "rambles",
      prefix: 'Bogus rambles, "',
      description:
        "Bogus rambles for two sentences out loud, extending its last saying",
    });
    console.log(rambles.toString());
  } else {
    console.log(action.toString());
  }

  expect(true).toBeTruthy();
}, 35000);
