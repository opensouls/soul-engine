---
id: examples
sidebar_position: 3
---

# Learn by Example

Welcome to the examples, designed to highlight how `CortexStep` integrates the principles of functional programming and append-only context management to simplify the way we write LLM programs. In effect, `CortexStep` makes it possible to approach these programs as if we were dealing with more straightforward, imperative JavaScript code, reducing the complexity typically involved.

Let's dive right in!

## Simple chat

Using CortexStep can be thought of as building up a set of memories, and then performing functional, append-only manipulations on those memories. Here is a simple example that initializes a `CortexStep` with memories of being a helpful AI assitant.

```javascript
import { brainstorm, CortexStep, ChatMessageRoleEnum, externalDialog, internalMonologue, Memory } from "socialagi/next";

let step = new CortexStep("A Helpful Assistant");
const initialMemory = [
  {
    role: ChatMessageRoleEnum.System,
    content:
      "You are modeling the mind of a helpful AI assitant",
  },
];

step = step.withMemory(initialMemory);
```

Then, during an event loop, `withReply(...)` would be called with a memory of each new message:

```javascript
async function withReply(step: CortexStep, newMessage: Memory): Promise<CortexStep<any>> {
  let nextStep = step.withMemory([newMessage]);
  nextStep = await nextStep.next(externalDialog());
  console.log("AI:", nextStep.value);
  return nextStep
}
```

Although the `CortexStep` paradigm feels a bit verbose in this simple example, it makes the subsequent more complex examples much easier to express.

## Chain of thought

In the previous example, we saw how to use `CortexStep` to write an AI assistant with a reply function.

However, complex dialog agents require more thoughtful cognitive modeling than a direct reply. Samantha from [MeetSamantha.ai](http://meetsamantha.ai) feels so uncanny because her feelings and internal cognitive processes are modeled. Here's a 3 step process expressed in terms of `CortexSteps` that models the way she formulates a message.

```javascript
async function withIntrospectiveReply(step: CortexStep, newMessage: Memory): Promise<CortexStep<any>> {
  let message = step.withMemory([newMessage]);
  const feels = await message.next(internalMonologue("How do they feel about the last message?"));
  const thinks = await feels.next(internalMonologue("Thinks about the feelings and the last user message"));
  const says = await thinks.next(externalDialog());
  console.log("Samantha:", says.value);
  return says
}
```

## Decision making

Moving beyond a simple dialog agent, the `CortexStep` paradigm easily supports decision making.

In this example, we tell an agentic detective to think through a set of case memories before making a decision on what action to take.

```javascript
async function caseDecision(caseMemories: ChatMessage[]): Promise<string> {
  let initialMemory = [
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
      ["interview suspect", "search crime scene", "check alibi"],
    )
  );
  const decision = nextStep.value;
  return decision
}
```

## Brainstorming

Similar to decision making which narrows effective context scope, `CortexStep` supports brainstorming actions that expand scope. As opposed to choosing from a list of options, a new list of options is generated.

In this example, we ask a chef to consider a basket of ingredients, then brainstorm what dishes could be made.

```javascript
async function makeDishSuggestions(ingredientsMemories: ChatMessage[]): Promise<string[]> {
  let initialMemory = [
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
    brainstorms("Decides the meal to prepare")
  );

  return mealIdeas.value;
}
```

## While loops

While loops for controlling chains of thought are trivially supported in `CortexStep`.

### 5 Why's

In this simple example, we show a function that internally monologues a sequence of 5 successively deeper 'Why' questions.

```javascript
const with5Whys = async (question: CortexStep<any>): Promise<CortexStep<any>> => {
  let i = 0;
  while (i < 5) {
    question = await question.next(internalMonologue("Asks a deep 'why?'"));
    i++;
  }
  return question
}
```

### Conditional termination

In this slightly more complex example, we explore breaking the control flow depending on a decision made by a `CortexStep`.

Here, a detective is modeled interrogating a suspectl

```javascript
let initialMemory = [
  {
    role: ChatMessageRoleEnum.System,
    content: stripIndent`You are modeling the mind of Detective Smith who is questioning a suspect, seeking to extract a murder confession.`,
  },
];

let cortexStep = new CortexStep("Detective Smith");
cortexStep = cortexStep.withMemory(initialMemory);

// The detective starts questioning
let step = await cortexStep.next(Action.EXTERNAL_DIALOG, {
  action: "questions",
  description: "Detective Smith starts questioning the suspect",
});

let confession;
while (true) {
  // withUserSuspectInput awaits for the suspect's input, then adds to the CortexStep
  [step, possibleConfession] = await withUserSuspectInput(step);

  // The detective asks a probing question
  step = await step.next(externalDialog("Detective Smith asks a probing question"));

  // The detective interprets the suspect's response
  let response = await step.next(
    decision(
      "Detective Smith interprets the suspect's response",
      ["denial", "diversion", "confession"]
    )
  );

  if (response.value === "confession") {
    confession = possibleConfession;
    break;
  }
}

console.log("The suspect confessed!", possibleConfession);
```

Now, let's extend our detective example and add a sense of time pressure to cause the detective to give up if a confession has not been extracted. This type of interaction adds a plausible mechanism for naturally ending a possibly looping interaction.

```javascript
// ...

let decision;
let processingTime = 0;
const N = 10; // Arbitrary threshold

while (processingTime <= N) {
  // ...

  // Increase processing time
  processingTime++;

  // If the processing time is reaching the limit, the detective feels
  // the pressure and might give up
  if (processingTime > N) {
    let step = await step.next(internalMonologue("Detective feels the pressure from their boss to move on"))

    let surrender = await step.next(
      decision(
        "Detective considers giving up",
        ["continue", "give up"]
      )
    );

    if (surrender.value === "give up") {
      decision = surrender;
      break;
    }
  }
}

console.log(decision.toString());
```

## Branching

Here's an example of a simplified internal monologue which makes a progressive sequence of branching decisions and while maintaining prior context.

```javascript
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
```

One could of course extend this model further with subsequent memories to provide additional context in which the decisions are made.

## Map-reduce ("Tree of thoughts")

Map reduce is a very common pattern for complex data processing. In the LLM world, map-reduce is now often known as "Tree of thoughts." Here is an example that models a complex decision making process that maps an evaluation across several different options before merging them and making a final decision.

```javascript
async function withAdvisorDecision(crisisMemory: ChatMessage[]): CortexStep {
  let initialMemory = [
    {
      role: "system",
      content: stripIndent`
        You are modeling the mind of a \
        royal advisor who is weighing strategies to handle a crisis
      `,
    },
  ];

  let cortexStep = new CortexStep("Advisor");
  cortexStep = cortexStep.withMemory(initialMemory);
  cortexStep = cortexStep.withMemory(crisisMemory);

  const strategies = ["Diplomacy", "Military", "Trade sanctions"];

  const evaluations = await Promise.all(
    strategies.map(async (strategy) => {
      const evaluationStep = await cortexStep.next(internalMonologue(`Advisor evaulates the ${strategy} strategy`))
      const prosCons = await evaluationStep.next(internalMonologue(`Advisor considers the pros and cons of the ${strategy} strategy`))
      return prosCons;
    })
  );

  // Take all the pros and cons, and add them back to the main cortexStep
  cortexStep = cortexStep.withMemory([{
    role: "assistant"
    content: strategies.map((strategyName, i) => {
      return stripIndent`
        ## ${strategyName}
        ${evaluations[i].value}
      `
    }).join("\n")
  }])

  const recommendation = await cortexStep.next(decision("Advisor makes a recommendation based on the evaluations", strategies));
  return recommendation
}
```