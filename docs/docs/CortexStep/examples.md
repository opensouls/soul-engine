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
import {CortexStep} from "socialagi";

let step = new CortexStep("A Helpful Assistant")
const initialMemory = [
  {
    role: ChatMessageRoleEnum.System,
    content: "<CONTEXT>You are modeling the mind of a helpful AI assitant</CONTEXT>",
  },
];

step = step.withMemory(initialMemory);
```
Then, during an event loop, `withReply(...)` would be called with a memory of each new message:
```javascript
async function withReply(step: CortexStep, newMessage: ChatMessage): CortexStep {
  let nextStep = step.withMemory(newMessage);
  nextStep = await nextStep.next(Action.EXTERNAL_DIALOG, {
    action: "says",
    description: "Says out loud next",
  });
  console.log("AI:", nextStep.value);
  return nextStep
}
```

Although the `CortexStep` paradigm feels a bit verbose in this simple example, it makes the subsequent more complex examples much easier to express.

## Chain of thought

In the previous example, we saw how to use `CortexStep` to write an AI assistant with a reply function.

However, complex dialog agents require more thoughtful cognitive modeling than a direct reply. Samantha from [MeetSamantha.ai](http://meetsamantha.ai) feels so uncanny because her feelings and internal cognitive processes are modeled. Here's a 3 step process expressed in terms of `CortexSteps` that models the way she formulates a message.

```javascript
async function withIntrospectiveReply(step: CortexStep, newMessage: ChatMessage): CortexStep {
  let message = step.withMemory(newMessage);
  const feels = await message.next(Action.INTERNAL_MONOLOGUE, {
    action: "feels",
    description: "Feels about the last message",
  });
  const thinks = await feels.next(Action.INTERNAL_MONOLOGUE, {
    action: "thinks",
    description: "Thinks about the feelings and the last user message",
  });
  const says = await thinks.next(Action.EXTERNAL_DIALOG, {
    action: "says",
    description: `Says out loud next`,
  });
  console.log("Samantha:", says.value);
  return says
}
```

## Decision making

Moving beyond a simple dialog agent, the `CortexStep` paradigm easily supports decision making.  

In this example, we tell an agentic detective to think through a set of case memories before making a decision on what action to take.

```javascript
async function caseDecision(caseMemories: ChatMessage[]): string {
  let initialMemory = [
  {
    role: "system",
    content: "<Context>You are modeling the mind of a detective who is currently figuring out a complicated case</Context>",
  },
  ];
  
  let cortexStep = new CortexStep("Detective");
  cortexStep = cortexStep
      .withMemory(initialMemory)
      .withMemory(caseMemories);
  
  const analysis = await cortexStep.next(Action.INTERNAL_MONOLOGUE, {
    action: "analyses",
    description: "The detective analyses the evidence",
  });
  
  const hypothesis = await analysis.next(Action.INTERNAL_MONOLOGUE, {
    action: "hypothesizes",
    description: "The detective makes a hypothesis based on the analysis",
  });
  
  const nextStep = await hypothesis.next(Action.DECISION, {
    description: "Decides the next step based on the hypothesis",
    choices: ["interview suspect", "search crime scene", "check alibi"],
  });
  const decision = nextStep.value;
  return decision
}
```

## Brainstorming

Similar to decision making which narrows effective context scope, `CortexStep` supports brainstorming actions that expand scope. As opposed to choosing from a list of options, a new list of options is generated. 

In this example, we ask a chef to consider a basket of ingredients, then brainstorm what dishes could be made.

```javascript
async function makeDishSuggestions(ingredientsMemories: ChatMessage[]): string[] {
  let initialMemory = [
    {
      role: "system",
      content: "<Context>You are modeling the mind of a chef who is preparing a meal</Context>",
    },
  ];
  
  let cortexStep = new CortexStep("Chef");
  cortexStep = cortexStep
    .withMemory(initialMemory)
    .withMemory(ingredientsMemories);
  
  const ingredients = await cortexStep.next(Action.INTERNAL_MONOLOGUE, {
    action: "considers",
    description: "The chef considers the ingredients",
  });
  
  const mealIdeas = await ingredients.next(Action.BRAINSTORM_ACTIONS, {
    actionsForIdea: "Decides the meal to prepare",
  });
  
  return mealIdeas.value;
}
```

## While loops

While loops for controlling chains of thought are trivially supported in `CortexStep`.

### 5 Why's

In this simple example, we show a function that internally monologues a sequence of 5 successively deeper 'Why' questions.

```javascript
async function with5Whys(step: CortexStep): CortexStep {
  let i = 0;
  while (i < 5) {
    question = await question.next(Action.INTERNAL_MONOLOGUE, {
      action: "asks",
      description: "Asks a deep 'why?'",
    });
    i++;
  }
}
```

### Conditional termination

In this slightly more complex example, we explore breaking the control flow depending on a decision made by a `CortexStep`.

Here, a detective is modeled interrogating a suspectl

```javascript
let initialMemory = [
  {
    role: "system",
    content: stripIndent`<Context>You are modeling the mind of Detective Smith who is \
    questioning a suspect, seeking to extract a murder confession.</Context>`,
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
while(true) {
  // withUserSuspectInput awaits for the suspect's input, then adds to the CortexStep 
  [step, possibleConfession] = await withUserSuspectInput(step);
  
  // The detective asks a probing question
  step = await step.next(Action.EXTERNAL_DIALOG, {
    action: "probes",
    description: "Detective Smith asks a probing question",
  });

  // The detective interprets the suspect's response
  let response = await step.next(Action.DECISION, {
    description: "Detective Smith interprets the suspect's response",
    choices: ["denial", "diversion", "confession"],
  });

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

while(processingTime <= N) {
  // ...

  // Increase processing time
  processingTime++;

  // If the processing time is reaching the limit, the detective feels 
  // the pressure and might give up
  if (processingTime > N) {
    let step = await step.next(Action.INTERNAL_MONOLOGUE, {
      action: "pressure",
      description: "Detective feels the pressure from their boss to move on",
    });

    let surrender = await step.next(Action.DECISION, {
      description: "Detective considers giving up",
      choices: ["continue", "give up"],
    });

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
let initialMemory = [
  {
    role: "system",
    content: stripIndent`<Context>You are modeling the mind of a \
    protagonist who is deciding on actions in a quest</Context>`,
  },
];

let quest = new CortexStep("Protagonist");
quest = quest.withMemory(initialMemory);

// The protagonist considers the quests
let quest = await quest.next(Action.DECISION, {
  description: "Protagonist considers the quests",
  choices: ["slay dragon", "find artifact"],
});

if (quest.value === "slay dragon") {
  // Branch 1: Slay the dragon
  let quest = await quest.next(Action.DECISION, {
    description: "Protagonist decides how to prepare for the quest",
    choices: ["gather weapons", "train skills"],
  });

  if (quest.value === "gather weapons") {
    let quest = await quest.next(Action.ACTION, {
      action: "gathers",
      description: "Protagonist gathers weapons for the quest",
    });
  } else {
    let quest = await quest.next(Action.ACTION, {
      action: "trains",
      description: "Protagonist trains their skills for the quest",
    });
  }
} else {
  // Branch 2: Find the artifact
  let quest = await quest.next(Action.DECISION, {
    description: "Protagonist decides how to find the artifact",
    choices: ["search old records", "ask elders"],
  });

  if (quest.value === "search old records") {
    let quest = await quest.next(Action.ACTION, {
      action: "searches",
      description: "Protagonist searches old records for clues about the artifact",
    });
  } else {
    let quest = await quest.next(Action.ACTION, {
      action: "asks",
      description: "Protagonist asks the elders about the artifact",
    });
  }
}

console.log(quest.toString());
```

One could of course extend this model further with subsequent memories to provide additional context in which the decisions are made.

## Map-reduce ("Tree of thoughts")

Map reduce is a very common pattern for complex data processing. In the LLM world, map-reduce is now often known as "Tree of thoughts". Here is an example that models a complex decision making process that maps an evaluation across several different options before merging them and making a final decision. 

```javascript
async function withAdvisorDecision(crisisMemory: ChatMessage[]): CortexStep {
  let initialMemory = [
    {
      role: "system",
      content: stripIndent`<Context>You are modeling the mind of a \
      royal advisor who is weighing strategies to handle a crisis</Context>`,
    },
  ];

  let cortexStep = new CortexStep("Advisor");
  cortexStep = cortexStep.withMemory(initialMemory);
  cortexStep = cortexStep.withMemory(crisisMemory);

  let strategies = ["Diplomacy", "Military", "Trade sanctions"];

  let evaluations = await Promise.all(
    strategies.map(async (strategy) => {
      let evaluationStep = await cortexStep.next(Action.INTERNAL_MONOLOGUE, {
        action: "evaluates",
        description: `Advisor evaluates the ${strategy} strategy`,
      });

      let prosCons = await evaluationStep.next(Action.INTERNAL_MONOLOGUE, {
        action: "considers",
        description: `Advisor considers the pros and cons of the ${strategy} strategy`,
      });

      return prosCons;
    })
  );

  // Use the 'merge' function to combine all evaluations into a single CortexStep
  cortexStep = CortexStep.merge(evaluations);

  let recommendation = await cortexStep.next(Action.DECISION, {
    description: "Advisor makes a recommendation based on the evaluations",
    choices: strategies,
  });
  return recommendation
}
```





















