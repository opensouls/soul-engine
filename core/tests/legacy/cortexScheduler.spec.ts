import { expect } from "chai";
import { CortexScheduler, Action, CortexStep, ChatMessageRoleEnum } from '../../src/legacy';
import * as dotenv from 'dotenv';
dotenv.config();

describe.skip("CortexScheduler", () => {
  it("executes conversation", async () => {
    const samanthaReplies = async (signal:any, newMemory:any, lastStep:any) => {
      let step = lastStep;
      step = step.withMemory([newMemory]);
      const shouts = await step.next(Action.EXTERNAL_DIALOG, {
        action: "shouts in all caps",
      });
      if (signal.aborted) {
        return step;
      } else {
        console.log("Samantha says: ", shouts.value);
        return shouts;
      }
    };
    const abortQueuingStrategy = (currentJob:any, queue:any, newJob:any) => {
      currentJob?.abortController?.abort();
      return [newJob];
    };
    const samanthaRepliesConfig = {
      name: "SamanthaReplies",
      process: samanthaReplies,
    };

    const initialMemories = [
      {
        role: ChatMessageRoleEnum.System,
        content: "<Context>You are modeling the mind of Samantha</Context>",
      },
    ];
    let firstStep = new CortexStep("Samantha");
    firstStep = firstStep.withMemory(initialMemories);
    const cortex = new CortexScheduler(firstStep, {
      queuingStrategy: abortQueuingStrategy,
    });
    cortex.register(samanthaRepliesConfig);

    // dispatch without waiting for return
    cortex.dispatch("SamanthaReplies", {
      role: ChatMessageRoleEnum.User,
      content: "Hello, Samantha!",
    });

    await cortex.dispatch("SamanthaReplies", {
      role: ChatMessageRoleEnum.User,
      content: "F U!",
    });
    expect(true).to.be.true;
  });
});
