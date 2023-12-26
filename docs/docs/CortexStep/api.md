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

   The `next()` method guides the AI to the subsequent cognitive step. This method requires a cognitive function. The library offers built in cognitive functions, or you can [build your own](actions).

   ```javascript
   step = await step.next(internalMonologue("thinks, understanding the user's message"));
   ```

4. **Get only values with `compute()`**

   The `compute()` method works just like `next()` but does not provide a new CortexStep and instead just returns the value from the CognitiveFunction

   ```javascript
   const yesOrNo = await step.compute(decision("Is Bogus cold?", ["yes", "no"]));
   ```

5. **Resetting Memory with `resetMemory()`**

   The `resetMemory()` method allows the AI to reset its memories based on a function that processes the existing memories. It returns a new `CortexStep` instance with the updated memories.

   ```javascript
   step = await step.resetMemory(memories => memories.filter(m => m.role !== "user"));
   ```


## Predefined CognitiveFunctions

While `CortexStep` allows for the creation of [custom cognitive functions](actions), it comes with several predefined cognitive functions:

1. `internalMonologue`: Simulates the AI's internal thought process.

   ```javascript
   step = await step.next(internalMonologue("Contemplate the users message"));
   ```

2. `externalDialog`: Creates an external dialogue or output from the AI.

   ```javascript
   step = await step.next(externalDialog("Give the user a greeting message"));
   ```

3. `decision`: Guides the AI through a decision-making process.

   ```javascript
   step = await step.next(decision(`Choose the next topic`, ["Weather", "News", "Sports"]));
   ```

4. `brainstorm`: Facilitates brainstorming of potential actions for the AI.

   ```javascript
   let spec = {
     actionsForIdea: "Next conversation topics",
   };
   step = await step.next(brainstorm("Brainstorm the next conversation topics"));
   ```

## Generated output

`value` retrieves the value generated from the last action.

```javascript
let lastValue = step.value;
```
