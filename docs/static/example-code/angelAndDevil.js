#!/bin/playground// Import a few important pieces from the socialagi library
// check out https://www.socialagi.dev/ for further detail
import {
  CortexStep,
  CortexScheduler,
  externalDialog,
  internalMonologue,
  decision,
} from "socialagi/next";
import playground from "playground";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function randomDelay() {
  await delay(Math.floor(Math.random() * (3500 - 750 + 1)) + 750);
}
let fightCounter = 0;

// subroutine for modeling the angel's replies
const angelReplies = async (signal, newMemory, lastStep) => {
  await randomDelay();
  let step = lastStep;
  step = step.withMemory([newMemory]);
  step = await step.next(
    internalMonologue(
      `One sentence explaining if (and why) the Angel wants to respond to the Devil \
or to the user.

${
  fightCounter > 2
    ? "The fight is dragging on and the Angel is starting to want to hear from the user. I should stop responding soon"
    : ""
}`
    )
  );
  playground.log("Angel thinks: " + step.value);
  const decides = await step.next(
    decision(
      `based on the Angel's last thought, are they going to respond? (yes or no)`,
      ["yes", "no"]
    )
  );
  playground.log("Angel decides to respond: " + decides.value);
  if (decides.value.includes("yes")) {
    step = await step.next(externalDialog());
    playground.addMessage({
      sender: "Angel",
      message: step.value,
    });
  }
  return step;
};
const angelRepliesConfig = {
  name: "AngelReplies",
  process: angelReplies,
};

// subroutine for modeling the devil's replies
const devilReplies = async (signal, newMemory, lastStep) => {
  await randomDelay();
  let step = lastStep;
  step = step.withMemory([newMemory]);
  step = await step.next(
    internalMonologue(`One sentence explaining if (and why) the Devil wants to respond to the angel \
or to the user.

${
  fightCounter > 2
    ? "The fight is dragging on and the Devil is starting to want to hear from the user. I should stop responding soon"
    : ""
}`)
  );
  playground.log("Devil schemes " + step.value);
  const decides = await step.next(
    decision(
      `based on the Devil's last thought, are they going to respond?  (yes or no)`,
      ["yes", "no"]
    )
  );
  playground.log("Devil decides to respond: " + decides.value);
  if (decides.value.includes("yes")) {
    step = await step.next(externalDialog("The devil should tempt the angel."));
    playground.addMessage({
      sender: "Devil",
      message: step.value,
    });
  }
  return step;
};
const devilRepliesConfig = {
  name: "DevilReplies",
  process: devilReplies,
};

const initialMemoriesAngel = [
  {
    role: "system",
    content: `
You are modeling the mind of a helpful angel, chatting with a Devil and a user.

## Notes

* The angel is here to offer good advice to the user based on their challenge at hand
* The angel sometimes gets into brief fights with the devil
* If the user is focused on the Devil, the angel mostly stands back unless they've not spoken in a long time
`.trim(),
  },
];

let firstStepAngel = new CortexStep("Angel");
firstStepAngel = firstStepAngel.withMemory(initialMemoriesAngel);

const cortexAngel = new CortexScheduler(firstStepAngel);
cortexAngel.register(angelRepliesConfig);

const initialMemoriesDevil = [
  {
    role: "system",
    content: `
You are modeling the mind of a devious corrupt devil, chatting with an Angel and a user.

## Notes

* The devil is here to offer devilish advice to the user based on their challenge at hand
* The devil sometimes gets into brief fights with the angel
* If the user is focused on the Angel, the devil mostly stands back unless they've not spoken in a long time
`.trim(),
  },
];

let firstStepDevil = new CortexStep("Devil");
firstStepDevil = firstStepDevil.withMemory(initialMemoriesDevil);

const cortexDevil = new CortexScheduler(firstStepDevil);
cortexDevil.register(devilRepliesConfig);

setTimeout(() => {
  playground.addMessage({
    sender: "Playground",
    message:
      "In this example, the Angel and Devil are programmed to have a choice whether to participate in the conversation",
  });
  playground.log("Playground initialized");
  playground.on("message", async ({ sender, message }) => {
    if (sender === "user") {
      fightCounter = 0;
    } else {
      fightCounter += 1;
      playground.log("fight counter at: " + fightCounter);
    }
    if (sender !== "Angel") {
      cortexAngel.dispatch("AngelReplies", {
        role: "user",
        content: `${sender} says: ${message}}`,
      });
    }
    if (sender !== "Devil") {
      setTimeout(
        () =>
          cortexDevil.dispatch("DevilReplies", {
            role: "user",
            content: `${sender} says: ${message}`,
          }),
        200
      );
    }
  });
}, 1);

playground.on("userMessage", () => {});
