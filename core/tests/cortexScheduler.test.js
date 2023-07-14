// import { isAbstractTrue } from "../src/testing";
const { CortexScheduler, Action, CortexStep } = require("../src");

const dotenv = require("dotenv");
dotenv.config();

test("CortexScheduler runs", async () => {
  const SamanthaReplies = async (signal, newMemory, lastStep) => {
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
  const abortQueuingStrategy = (currentJob, queue, newJob) => {
    currentJob?.abortController?.abort();
    return [newJob];
  };
  const samanthaRepliesConfig = {
    name: "SamanthaReplies",
    process: SamanthaReplies,
  };

  const initialMemories = [
    {
      role: "system",
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
    role: "user",
    content: "Hello, Samantha!",
  });

  await cortex.dispatch("SamanthaReplies", {
    role: "user",
    content: "F U!",
  });
  expect(true).toBeTruthy();
}, 35000);
