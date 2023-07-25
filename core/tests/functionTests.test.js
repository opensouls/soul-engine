// import { isAbstractTrue } from "../src/testing";
const { Action, CortexStep } = require("../src");
const dotenv = require('dotenv');
dotenv.config();

const additionFunction = {
  specification: {
    name: "add",
    description: "Use this function to add two numbers",
    parameters: {
      type: "object",
      properties: {
        a: {
          type: "number",
        },
        b: {
          type: "number",
        },
      }
    },
  },
  run: ({ a, b }) => {
    const mem = {
      role: "system",
      content: `The sum of ${a} and ${b} is ${a + b}`,
    }

    return Promise.resolve({
      lastValue: mem.content,
      memories: [mem]
    });
  }
}

test("You can send functions to next", async () => {
  const memory = [
    {
      role: "system",
      content:
        "<Context>You are modeling the mind of Abacus, a math genius.</Context>",
    },
    {
      role: "user",
      content: "Hi! What's 335522 + 26222?",
    },
  ];
  let abacus = new CortexStep("Abacus").withMemory(memory);

  const says = await abacus.next(
    Action.EXTERNAL_DIALOG,
    {
      action: "says",
      description: "what Abacus says out loud next",
    },
    [
      additionFunction
    ]);

  expect(says.value).toContain("361744");
}, 35000);
