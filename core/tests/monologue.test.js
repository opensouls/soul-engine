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
  const feels = await monologue.next(
    "feels",
    "Bogus feels ",
    "Bogus notes how it feels to themself in one sentence"
  );
  const thinks = await feels.next(
    "thinks",
    "Bogus thinks ",
    "what Bogus thinks to themself in one sentence"
  );
  const says = await thinks.next(
    "says",
    'Bogus says, "',
    "what Bogus says out loud next"
  );
  const action = await says.next(
    "action",
    "decision=",
    "the action Bogus decides to take next. Either 'decision=none' or 'decision=rambles'"
  );
  if (action.lastValue === "rambles") {
    const rambles = await action.next(
      "rambles",
      'Bogus rambles, "',
      "Bogus rambles for two sentences out loud next"
    );
    console.log(rambles.toString());
  } else {
    console.log(action.toString());
  }

  expect(true).toBeTruthy();
}, 35000);
