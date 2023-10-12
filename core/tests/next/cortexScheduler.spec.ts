import {
  AbortSignal,
} from "abort-controller";
import { expect } from "chai";
import { CortexScheduler, CortexStep, ChatMessageRoleEnum, ChatMessage, externalDialog, Job } from '../../src/next';

describe("CortexScheduler", () => {
  it("executes conversation", async () => {
    const samanthaReplies = async (signal:AbortSignal, newMemory:ChatMessage, lastStep:CortexStep<any>) => {
      let step = lastStep;
      step = step.withMemory([newMemory]);
      const shouts = await step.next(externalDialog("SHOUT IN ALL CAPS!"));
      if (signal.aborted) {
        return step;
      } else {
        console.log("Samantha says: ", shouts.value);
        return shouts;
      }
    };
    const abortQueuingStrategy = (currentJob:Job|null, queue:Job[], newJob:Job) => {
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
