import { stripIndent } from "common-tags";
import {
  CortexStep,
  CortexScheduler,
  decision,
  externalDialog,
  ChatMessageRoleEnum,
  ChatMessage,
  Memory,
  internalMonologue,
  brainstorm,
} from "../../src/next";

describe("examples from the docs", () => {

  describe("CortexStep examples", () => {
    let step: CortexStep<any>;

    beforeEach(() => {
      step = new CortexStep("A Helpful Assistant");
      step = new CortexStep("A Helpful Assistant");
      const initialMemory = [
        {
          role: ChatMessageRoleEnum.System,
          content:
            "You are modeling the mind of a helpful AI assitant",
        },
      ];

      step = step.withMemory(initialMemory);
    })

    it("runs chain of thought", async () => {
      const withIntrospectiveReply = async (step: CortexStep, newMessage: Memory): Promise<CortexStep<string>> => {
        const message = step.withMemory([newMessage]);
        const feels = await message.next(internalMonologue("How do they feel about the last message?"));
        const thinks = await feels.next(internalMonologue("Thinks about the feelings and the last user message"));
        const says = await thinks.next(externalDialog());
        console.log("Samantha:", says.value);
        return says
      }

      await withIntrospectiveReply(step, { role: ChatMessageRoleEnum.User, content: "Hello, AI!" })

    })

    it("runs the simple chat example", async () => {
      const withReply = async (step: CortexStep<any>, newMessage: Memory): Promise<CortexStep> => {
        let nextStep = step.withMemory([newMessage]);
        nextStep = await nextStep.next(externalDialog());
        console.log("AI:", nextStep.value);
        return nextStep
      }

      await withReply(step, { role: ChatMessageRoleEnum.User, content: "Hello, AI!" })
    })

    it("runs caseDecision", async () => {
      const caseDecision = async (caseMemories: ChatMessage[]): Promise<string | number> => {
        const initialMemory = [
          {
            role: ChatMessageRoleEnum.System,
            content: "You are modeling the mind of a detective who is currently figuring out a complicated case",
          },
        ];

        let cortexStep = new CortexStep("Detective");
        cortexStep = cortexStep
          .withMemory(initialMemory)
          .withMemory(caseMemories);

        const analysis = await cortexStep.next(internalMonologue("The detective analyzes the evidence"));

        const hypothesis = await analysis.next(internalMonologue("The detective makes a hypothesis based on the analysis"));

        const nextStep = await hypothesis.next(
          decision(
            "Decides the next step based on the hypothesis",
            ["interview suspect", "search crime scene", "check alibi"] as Record<number, string>,
          )
        );

        return nextStep.value;
      }

      console.log("decided: ", await caseDecision([{ role: ChatMessageRoleEnum.User, content: "Hello, AI!" }]))
    })

    it("runs make dish decision", async () => {
      const makeDishSuggestions = async function (ingredientsMemories: ChatMessage[]): Promise<string[]> {
        const initialMemory = [
          {
            role: ChatMessageRoleEnum.System,
            content: "You are modeling the mind of a chef who is preparing a meal.",
          },
        ];

        let cortexStep = new CortexStep("Chef");
        cortexStep = cortexStep
          .withMemory(initialMemory)
          .withMemory(ingredientsMemories);

        const ingredients = await cortexStep.next(internalMonologue("The chef considers the ingredients"));

        const mealIdeas = await ingredients.next(
          brainstorm("Decides the meal to prepare")
        );

        return mealIdeas.value;
      }

      console.log("suggestion: ", await makeDishSuggestions([{ role: ChatMessageRoleEnum.User, content: "I want to do something with peppers" }]))
    })

    it("runs the WHY while loops", async () => {
      const with5Whys = async (question: CortexStep<any>): Promise<CortexStep<any>> => {
        let i = 0;
        while (i < 5) {
          question = await question.next(internalMonologue("Asks a deep 'why?' in 1 sentence."));
          i++;
        }
        return question
      }
      console.log("5 whys: ", (await with5Whys(step)).value)
    })

    it("runs branching", async () => {
      const initialMemory = [
        {
          role: ChatMessageRoleEnum.System,
          content: stripIndent`
            You are modeling the mind of a protagonist who is deciding on actions in a quest
          `
        },
      ];

      let quest = new CortexStep<any>("Protagonist");
      quest = quest.withMemory(initialMemory) as CortexStep<any>;

      // The protagonist considers the quests
      quest = await quest.next(
        decision(
          "Protagonist considers the quests",
          ["slay dragon", "find artifact"],
        )
      );

      if (quest.value === "slay dragon") {
        // Branch 1: Slay the dragon
        quest = await quest.next(
          decision(
            "Protagonist decides how to prepare for the quest",
            ["gather weapons", "train skills"]
          )
        );

        if (quest.value === "gather weapons") {
          // implement gather tooling for character
        } else {
          // implement training tooling for character
        }
      } else {
        // Branch 2: Find the artifact
        quest = await quest.next(
          decision(
            "Protagonist decides how to find the artifact",
            ["search old records", "ask elders"]
          )
        );

        if (quest.value === "search old records") {
          // search for clues about the artifact
        } else {
          // ask the elders about the arffact
        }
      }

      console.log(quest.toString());
    })
  })



  it("runs the cortex scheduler example", async () => {
    const abortQueuingStrategy = (currentJob: any, queue: any, newJob: any) => {
      currentJob?.abortController?.abort();
      return [newJob];
    };

    const samanthaReplies = async (signal: any, newMemory: any, lastStep: any) => {
      let step = lastStep;
      step = step.withMemory([newMemory]);
      const shouts = await step.next(externalDialog("shouts in all caps"));
      console.log("Samantha says: ", shouts.value);
      return shouts;
    };
    const samanthaRepliesConfig = {
      name: "SamanthaReplies",
      process: samanthaReplies,
    };

    const initialMemories = [
      {
        role: ChatMessageRoleEnum.System,
        content: "You are modeling the mind of Samantha"
      },
    ];
    let firstStep = new CortexStep("Samantha");
    firstStep = firstStep.withMemory(initialMemories);
    const cortex = new CortexScheduler(firstStep, {
      queuingStrategy: abortQueuingStrategy,
    });
    cortex.register(samanthaRepliesConfig);

    await cortex.dispatch("SamanthaReplies", {
      role: ChatMessageRoleEnum.User,
      content: "hello, Samantha!",
      name: "Alice",
    });
  })
})