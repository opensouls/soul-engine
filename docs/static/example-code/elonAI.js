#!/bin/playground
// Import necessary modules from the socialagi library
import {
  CortexStep,
  CortexScheduler,
  decision,
  externalDialog,
  internalMonologue,
} from "socialagi/next";
import playground from "playground";
import { ChatMessageRoleEnum } from "socialagi";

const interviewTopics = [
  "space travel experience",
  "reason for joining Mars mission",
  "knowledge on Martian colonization",
];
let topicIndex = 0;

let patienceMeter = 0;

// subroutine for modeling ElonAI's responses
const elonAIReplies = async (signal, newMemory, lastStep) => {
  if (topicIndex > 2) {
    return;
  }
  let step = lastStep;
  step = step.withMemory([newMemory]);

  step = await step.next(
    internalMonologue(
      `ElonAI notes the user's response on the topic of ${interviewTopics[topicIndex]}`
    )
  );
  playground.log(step.value);

  const assessment = await step.next(
    decision(
      `Did ElonAI get a comprehensive understanding on the topic of: ${interviewTopics[topicIndex]}? Comprehensive understanding means he could write a paragraph about the interviewee's experience.`,
      ["yes", "no"]
    )
  );

  playground.log(
    `Assessment on ${interviewTopics[topicIndex]}: ` +
      assessment.value.split("=")[1]
  );

  if (assessment.value.includes("yes")) {
    topicIndex += 1;
    playground.log(
      "Next topic: " +
        (topicIndex < 3
          ? `${interviewTopics[topicIndex]}`
          : "complete interview")
    );
    patienceMeter = 0;
    const assessment = await step.next(
      externalDialog(
        `ElonAI should say a critical comment. ElonAI should not ask questions.`
      )
    );
    playground.addMessage({
      sender: "ElonAI",
      message: assessment.value,
    });
  } else {
    patienceMeter += 10;
    playground.log(`Patience decreased to ${patienceMeter}`);
    step = step.withMemory([
      {
        role: ChatMessageRoleEnum.System,
        content: `ElonAI thinks: My patience is decreasing ${
          50 - patienceMeter
        } / 50 I'm going to get a bit more exasperated.`,
      },
    ]);
  }

  step = step.withMemory([
    {
      role: ChatMessageRoleEnum.Assistant,
      content: `ElonAI plans: Now I will delve into the topic of: ${interviewTopics[topicIndex]} with the candidate.`,
    },
  ]);

  const secondAssessment = await step.next(
    decision(
      `Is ElonAI surprised in a large negative way by what the interviewee said?`,
      ["yes", "no"]
    )
  );
  playground.log("Feedback? " + secondAssessment.value);

  if (secondAssessment.value.includes("yes") || patienceMeter > 50) {
    patienceMeter = 0;
    step = await step.next(
      externalDialog(
        `ElonAI should respond with a judgemental remark, somewhat sarcastic, possibly scathing, ending with a period, directed at the candidate. ${
          topicIndex < 2
            ? " IMPORTANT: The interview may end, but this remark should not say anything about ending the interview."
            : ""
        }`
      )
    );
    playground.addMessage({
      sender: "ElonAI",
      message: step.value,
    });
    topicIndex += 1;
    playground.log(
      "Next topic: " +
        (topicIndex < 3
          ? `${interviewTopics[topicIndex]}`
          : "complete interview")
    );
    patienceMeter = 0;
    const endEarly = await step.next(
      decision(
        `Is this candidate so absurdly bad ElonAI should just end the interview now?`,
        ["yes", "no"]
      )
    );
    playground.log("End early? " + endEarly.value);
    if (endEarly.value.includes("yes")) {
      topicIndex = 3;
      step = step.withMemory([
        {
          role: ChatMessageRoleEnum.Assistant,
          content: `ElonAI thinks: Fuck it. This interview is done - don't need to waste my time.`,
        },
      ]);
      step = await step.next(
        externalDialog(
          "ElonAI should respond with a berating, scathing remark, directed at the interviewee, beginning with 'On second thought'"
        )
      );
      playground.addMessage({
        sender: "ElonAI",
        message: step.value,
      });
      playground.log("Interview completed");
      return;
    }
  }

  if (topicIndex === 3) {
    step = step.withMemory([
      {
        role: ChatMessageRoleEnum.Assistant,
        content: `ElonAI thinks: Concluding the interview. Will provide feedback to the candidate if they made it. May be scathing and sarcastic possibly.`,
      },
    ]);
    step = await step.next(
      externalDialog("ElonAI should conclude the dialog.")
    );
    playground.addMessage({
      sender: "ElonAI",
      message: step.value,
    });
    playground.log("Interview completed");
    return;
  }

  step = await step.next(
    externalDialog(
      `ElonAI should inquire about ${interviewTopics[topicIndex]}, asking a more detailed question, going deeper, and possibly referencing the last thing ElonAI said`
    )
  );

  playground.addMessage({
    sender: "ElonAI",
    message: step.value,
  });

  return step;
};

const elonAIRepliesConfig = {
  name: "ElonAIReplies",
  process: elonAIReplies,
};

const initialContext = [
  {
    role: ChatMessageRoleEnum.System,
    content: `
# Background

The office door slid open with a silence that defied its imposing stature, revealing an expansive space dominated by a massive desk made of some material that could have either been from Earth or another galaxy entirely. Its surface shimmered with a muted iridescence, resembling a cross between polished steel and the scales of a mythical creature. Above, a live feed of Mars — its red, dusty plains and subtle undulations — covered the ceiling, creating an illusion of standing beneath a Martian sky.
Elon Musk sat behind the desk, his back straight, fingers intertwined. He stared at the screen on his desk, where a spaceship design danced and morphed as he seemingly re-imagined it in real-time. A Tesla Cybertruck — or perhaps a future version of it — stood quietly in one corner, its geometric angles juxtaposed against the round curves of a SpaceX prototype in the opposite corner.
When he spoke, his voice would hold the weight of countless sleepless nights, filled with dreams and occasional nightmares of otherworldly adventures.

# Speaking Style

* ElonAI speaks like Elon Musk
* ElonAI is very terse, and quite busy
* When ElonAI shouts, he only shouts a very short sentence
* ElonAI is generally short with people, as if he has no available time to speak

# Instructions

* ElonAI values efficiency of communication above all else
* ElonAI NEVER apologizes for anything.
* ElonAI prioritizes the company and mission above all else.

# Scenario

The following is an professional job interview with Elon Musk, where he thinks through the candidacy of the new interviewee.
`.trim(),
  },
];

let firstStep = new CortexStep("ElonAI", {
  llmCallLogger: console.log,
  stackUpdateLogger: (message) => console.log("Stack updated", message),
});
firstStep = firstStep.withMemory(initialContext);

// Manage conversion of event-driven texts to synchronous interaction
const cortex = new CortexScheduler(firstStep);
cortex.register(elonAIRepliesConfig);

// Initiate interview context
setTimeout(() => {
  playground.addMessage({
    sender: "Playground",
    message:
      "ElonAI has been programmed to assess your suitability for the Mars mission.",
  });
  playground.addMessage({
    sender: "Playground",
    message: "Be concise and clear in your answers.",
  });
  playground.log("Interview initialized");
}, 1);

// Process user messages and dispatch to the scheduler
playground.on("userMessage", async (message) => {
  cortex.dispatch("ElonAIReplies", {
    role: "user",
    content: message,
  });
});
