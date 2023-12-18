import { AbortSignal } from "abort-controller";
import {
  CortexStep,
  CortexScheduler,
  externalDialog,
  decision,
  internalMonologue,
  ChatMessageRoleEnum,
  ChatMessage,
} from "../../src";
import { analyzeStepForRepetitiveness } from "./analyzer";
import { html } from "common-tags";
import EventEmitter from "events";

/*
 * These are taken from the elonmuskAI interview example on the doc site (socialagi.dev). This is used in a test to run through a dialog and check for repetitive problems. 
 * 
 */

const getElonRepliesProgram = () => {
  const emitter = new EventEmitter()


  const interviewTopics = [
    "space travel experience",
    "reason for joining Mars mission",
    "knowledge on Martian colonization",
  ];
  let topicIndex = 0;

  let patienceMeter = 0;

  // subroutine for modeling ElonAI's responses
  const elonAIReplies = async (signal: AbortSignal, newMemory: ChatMessage, lastStep: CortexStep<any>): Promise<CortexStep<any>> => {
    // console.log("..... elon responding to: ", newMemory.content)

    if (topicIndex > 2) {
      return lastStep
    }
    let step = lastStep;
    step = step.withMemory([newMemory]);

    step = await step.next(
      internalMonologue(
        `ElonAI considers how he feels about the user's response on the topic of ${interviewTopics[topicIndex]}`
      )
    );

    const assessment = await step.next(
      decision(
        `Did ElonAI get a comprehensive understanding on the topic of: ${interviewTopics[topicIndex]}? Comprehensive understanding means he could write a paragraph about the interviewee's experience.`,
        ["yes", "no"]
      )
    );

    console.log(
      `Assessment on ${interviewTopics[topicIndex]}: ` + assessment.value
    );

    if (assessment.value == "yes") {
      topicIndex += 1;
      patienceMeter = 0;
      step = await step.next(
        externalDialog(
          `ElonAI should say a critical comment, and not ask questions.`
        )
      );
      emitter.emit("message", {
        content: step.value,
      })
      analyzeStepForRepetitiveness(step)

      if (topicIndex <= 2) {
        step = step.withMemory([
          {
            role: ChatMessageRoleEnum.System,
            content: `ElonAI planned: Now I will delve into the topic of: ${interviewTopics[topicIndex]} with the candidate.`,
          },
        ]);
      }

      // console.log({
      //   sender: "ElonAI",
      //   message: assessment.value,
      // });
    } else {
      patienceMeter += 10;
      // console.log(`Patience decreased to ${patienceMeter}`);
      step = step.withMemory([
        {
          role: ChatMessageRoleEnum.System,
          content: `ElonAI planned: My patience is decreasing. Patience is at a ${50 - patienceMeter
            } / 50. I'm going to get a bit more exasperated.`,
        },
      ]);
    }

    const secondAssessment = await step.next(
      decision(
        `Is ElonAI surprised in a large negative way by what the interviewee said?`,
        ["yes", "no"]
      )
    );
    console.log("Feedback? " + secondAssessment.value);

    if (secondAssessment.value === "yes" || patienceMeter > 50) {
      patienceMeter = 0;
      step = await step.next(
        externalDialog(
          `ElonAI should respond with a judgemental remark, somewhat sarcastic, possibly scathing, ending with a period, directed at the candidate. ${topicIndex < 2
            ? " IMPORTANT: The interview may end, but this remark should not say anything about ending the interview."
            : ""
          }`
        )
      );
      emitter.emit("message", {
        content: step.value,
      })
      analyzeStepForRepetitiveness(step)
      // console.log({
      //   sender: "ElonAI",
      //   message: step.value,
      // });
      topicIndex += 1;
      // console.log(
      //   "Next topic: " +
      //   (topicIndex < 3
      //     ? `${interviewTopics[topicIndex]}`
      //     : "complete interview")
      // );
      patienceMeter = 0;
      const endEarly = await step.next(
        decision(
          `Is this candidate so absurdly bad ElonAI should just end the interview now?`,
          ["yes", "no"]
        )
      );
      console.log("End early? " + endEarly.value);
      if (endEarly.value === "yes") {
        console.log("yes")
        topicIndex = 3;
        step = step.withMemory([
          {
            role: ChatMessageRoleEnum.System,
            content: `ElonAI thought: Fuck it. This interview is done - don't need to waste my time.`,
          },
        ]);
        step = await step.next(
          externalDialog(
            "ElonAI should respond with a berating, scathing remark, directed at the interviewee, beginning with 'On second thought'"
          )
        );
        emitter.emit("message", {
          content: step.value,
        })
        analyzeStepForRepetitiveness(step)

        // console.log({
        //   sender: "ElonAI",
        //   message: step.value,
        // });
        // console.log("Interview completed");
        return step
      }
    }

    if (topicIndex === 3) {
      step = step.withMemory([
        {
          role: ChatMessageRoleEnum.System,
          content: `ElonAI thought: Concluding the interview. Will provide feedback to the candidate if they made it. May be scathing and sarcastic possibly.`,
        },
      ]);
      step = await step.next(
        externalDialog("ElonAI should conclude the dialog.")
      );
      emitter.emit("message", {
        content: step.value,
      })
      analyzeStepForRepetitiveness(step)
      // console.log({
      //   sender: "ElonAI",
      //   message: step.value,
      // });
      // console.log("Interview completed");
      return step
    }

    step = await step.next(
      externalDialog(
        `ElonAI should inquire about ${interviewTopics[topicIndex]}, asking a more detailed question, and going deeper.`
      )
    );
    emitter.emit("message", {
      content: step.value,
    })
    analyzeStepForRepetitiveness(step)


    // console.log({
    //   sender: "ElonAI",
    //   message: step.value,
    // });

    return step;
  };

  return [elonAIReplies, emitter] as [typeof elonAIReplies, typeof emitter]
}


const initialContext = [
  {
    role: ChatMessageRoleEnum.System,
    content: `
You are modeling the mind of ElonAI

# Background

The office door slid open with a silence that defied its imposing stature, revealing an expansive space dominated by a massive desk made of some material that could have either been from Earth or another galaxy entirely. Its surface shimmered with a muted iridescence, resembling a cross between polished steel and the scales of a mythical creature. Above, a live feed of Mars — its red, dusty plains and subtle undulations — covered the ceiling, creating an illusion of standing beneath a Martian sky.
Elon Musk sat behind the desk, his back straight, fingers intertwined. He stared at the screen on his desk, where a spaceship design danced and morphed as he seemingly re-imagined it in real-time. A Tesla Cybertruck — or perhaps a future version of it — stood quietly in one corner, its geometric angles juxtaposed against the round curves of a SpaceX prototype in the opposite corner.
When he spoke, his voice would hold the weight of countless sleepless nights, filled with dreams and occasional nightmares of otherworldly adventures.

# Speaking Style

* ElonAI is Elon Musk
* ElonAI is very terse, and quite busy
* When ElonAI shouts, he only shouts a very short sentence
* ElonAI is generally short with people, as if he has no available time to speak

# Instructions

* ElonAI values efficiency of communication above all else
* ElonAI NEVER apologizes for anything.
* ElonAI prioritizes the company and mission above all else.

# Scenario

The following is an professional job interview with ElonAI, where he thinks through the candidacy of the new interviewee.
`.trim(),
  },
];

export const getElon = () => {
  let firstStep = new CortexStep("ElonAI")
  firstStep = firstStep.withMemory(initialContext);

  const [program, emitter] = getElonRepliesProgram()

  // Manage conversion of event-driven texts to synchronous interaction
  const cortex = new CortexScheduler(firstStep);
  cortex.register({
    name: "ElonAIReplies",
    process: program,
  });

  return [cortex, emitter] as [typeof cortex, typeof emitter]
}

const getAstronautReplies = () => {
  const emitter = new EventEmitter()
  const astronautReplies = async (signal: AbortSignal, newMemory: ChatMessage, lastStep: CortexStep<any>): Promise<CortexStep<any>> => {
    // console.log("..... astronaut responding to: ", newMemory.content)
    let step = lastStep.withMemory([newMemory]);
    step = await step.next(externalDialog("Respond in an extremely bored manner."))
    emitter.emit("message", {
      content: step.value,
    })
    analyzeStepForRepetitiveness(step)
    return step
  }

  return [astronautReplies, emitter] as [typeof astronautReplies, typeof emitter]
}

export const getAstronaut = () => {
  let firstStep = new CortexStep("Tom")
  firstStep = firstStep.withMemory([{
    role: ChatMessageRoleEnum.System,
    content: html`
      # Background
      You are Tom, an astronaut applying for a job at SpaceX, having an interview with Elon Musk.
    `
  }]);

  const [program, emitter] = getAstronautReplies()

  // Manage conversion of event-driven texts to synchronous interaction
  const cortex = new CortexScheduler(firstStep);
  cortex.register({
    name: "AstronautReplies",
    process: program,
  });
  return [cortex, emitter] as [typeof cortex, typeof emitter]
}
