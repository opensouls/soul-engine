import { Action, ChatMessageRoleEnum, CortexStep } from "../src";
import dotenv from 'dotenv';
import { FunctionRunner, FunctionRunnerResponse } from "../src/languageModels/functions";
import { expect } from "chai";
import { devLog } from "../src/utils";
dotenv.config();

const additionFunction: FunctionRunner = {
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
  run: ({ a, b }): Promise<FunctionRunnerResponse> => {
    devLog("Running addition function")
    const mem = {
      role: ChatMessageRoleEnum.System,
      content: `The sum of ${a} and ${b} is ${a + b}`,
    }

    return Promise.resolve({
      lastValue: mem.content,
      memories: [mem]
    });
  }
}

describe.skip("function use in cortext step", () => {
  it("sends functions to next", async () => {
    const memory = [
      {
        role: ChatMessageRoleEnum.System,
        content:
          "<Context>You are modeling the mind of Abacus, a math genius.</Context> Important: always use functions for addition.",
      },
      {
        role: ChatMessageRoleEnum.User,
        content: "Hi! What's 335522 + 26222?",
      },
    ];
    const abacus = new CortexStep("Abacus").withMemory(memory);

    const says = await abacus.next(
      Action.CALL_FUNCTION,
      {
        name: "add",
      },
      [
        additionFunction
      ]);

    expect(says.value).to.contain("361744");
  })
})
