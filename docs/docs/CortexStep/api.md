---
id: api
sidebar_position: 2
---

# Core API

The `CortexStep` class is a critical component of the SocialAGI library, designed to provide a structured way to model the cognitive process of an AI during a conversational interaction. This is particularly focused on simulating an AI's internal monologue or thought process, capturing how an AI interprets input, makes decisions, and crafts responses.

The class adheres to the principles of functional programming. Each method in `CortexStep` generates a new instance, preserving immutability and enabling a more predictable behavior.

## Key Concepts and Methods

1. **`CortexStep` Initialization**

   To initialize `CortexStep`, you provide an `entityName`. This refers to the AI's identity.

   ```javascript
   let step = new CortexStep("Assistant");
   ```

2. **Building Memory with `withMemory()`**

   Memories are built using `ChatMessage` objects, each representing a discrete cognitive event or "step". `withMemory()` adds a memory to the AI's existing set.

   ```javascript
   step = step.withMemory([{ role: "user", content: "Hello, Assistant!" }]);
   ```

3. **Next Cognitive Step with `next()`**

   The `next()` method guides the AI to the subsequent cognitive step. This method requires an action type and a `spec` object that describes the details of this step.

   ```javascript
   let spec = {
     action: "thinking",
     description: "Understanding the user's message",
   };
   step = await step.next(Action.INTERNAL_MONOLOGUE, spec);
   ```

## Predefined Actions

While `CortexStep` allows for the creation of [custom actions](actions), it comes with several predefined actions:

1. `INTERNAL_MONOLOGUE`: Simulates the AI's internal thought process.

   ```javascript
   let spec = {
     action: "thinking",
     description: "Contemplating the user's message",
   };
   step = await step.next(Action.INTERNAL_MONOLOGUE, spec);
   ```

2. `EXTERNAL_DIALOG`: Creates an external dialogue or output from the AI.

   ```javascript
   let spec = {
     action: "greeting",
     description: "AI generates a greeting message",
   };
   step = await step.next(Action.EXTERNAL_DIALOG, spec);
   ```

3. `DECISION`: Guides the AI through a decision-making process.

   ```javascript
   let spec = {
     description: "Choosing the next topic",
     choices: ["Weather", "News", "Sports"],
   };
   step = await step.next(Action.DECISION, spec);
   ```

4. `BRAINSTORM_ACTIONS`: Facilitates brainstorming of potential actions for the AI.

   ```javascript
   let spec = {
     actionsForIdea: "Next conversation topics",
   };
   step = await step.next(Action.BRAINSTORM_ACTIONS, spec);
   ```

## Generated output

`value` retrieves the value generated from the last action.

```javascript
let lastValue = step.value;
```
