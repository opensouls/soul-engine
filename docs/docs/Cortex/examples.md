---
id: examples
---

# Learn by Example

Welcome to the examples, designed to highlight how `CortexStep` integrates the principles of functional programming and append-only context management to simplify the way we write LLM programs. In effect, `CortexStep` makes it possible to approach these programs as if we were dealing with more straightforward, imperative JavaScript code, reducing the complexity typically involved.

Let's dive right in!

## Simple call and response

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

## Decisions

Moving beyond a simple dialog agent, the `CortexStep` paradigm easily supports decision making.  

In this example, we tell an agentic detective to think through a set of case memories before making a decision on what action to take.

```javascript
async function newStepWithCaseAnalysis(caseMemories: OpenAIChatMessage[]): CortexStep {
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

## Brainstorming chef

Similar to decision making which narrows effective context scope, `CortexStep` supports brainstorming actions that expand scope. As opposed to choosing from a list of options, a new list of options is generated. 

In this example, we ask a chef to consider a basket of ingredients, then brainstorm what dishes could be made.

```javascript
async function newStepWithDishSuggestions(ingredientsMemories: OpenAIChatMessage[]): CortexStep {
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
  
  return mealIdeas;
}
```