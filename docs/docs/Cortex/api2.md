---
id: general_api
sidebar_position: 6
---

# Advanced API

In addition to the fundamental methods `new CortexStep(name)`, `withMemory`, and `next`, the `CortexStep` class offers a set of advanced capabilities to gain more control over the behavior of the AI's internal monologue. This page explains how to use these advanced features.

## Full Constructor Signature

The `CortexStep` class accepts an optional `CortexStepOptions` object in the constructor. This allows you to provide past steps, a processor, initial memories, or a last generated value.

```javascript
constructor(entityName: string, options?: CortexStepOptions)
```

The `CortexStepOptions` object includes:

- `pastCortexStep`: A `CortexStep` instance representing the previous step.
- `processor`: A `LanguageModelProgramExecutor` instance handling the execution of language model instructions.
- `memories`: An array of `WorkingMemory` instances representing initial memories.
- `lastValue`: The last generated value.

```javascript
let step = new CortexStep("Assistant", {
  pastCortexStep: previousStep,
  processor: new OpenAILanguageProgramProcessor(),
  memories: [[{role: "system", content: "You are a helpful assistant."}]],
  lastValue: "Solved a complex math problem",
});
```

## Other Methods

### toString()

`toString()` generates a string representation of the assistant's chat history, including system instructions, user queries, and assistant responses.

```javascript
let stringRepresentation = step.toString();
```

### is(condition: string)

`is(condition: string)` checks whether the last generated value satisfies the given condition. This method can be used for more complex checks involving the AI's current state.

```javascript
let isPositive = await step.is("positive");
```

### queryMemory(query: string)

`queryMemory(query: string)` allows you to directly ask the AI about its memories.

```javascript
let answer = await step.queryMemory("What was the last user query?");
```

### updateMemory(matchFunction, updateFunction)

`updateMemory(matchFunction, updateFunction)` updates the AI's memory. The `matchFunction` finds the memories to update, and the `updateFunction` applies the update.

```javascript
step = step.updateMemory(
  memory => memory[0].role === "user",
  memory => [...memory, { role: "assistant", content: "I remember this!" }]
);
```

## Understanding and Utilizing The Value Property

`CortexStep` has a `value` property which represents the output generated from the last action. This `value` could be of three possible types: `null`, `string`, or `string[]`.

This `value` can be very useful in chaining actions where the output of one action might influence or be used in the next action. To access this `value`, simply use:

```javascript
let value = step.value;
```
  
Remember, the `CortexStep` class is designed to be functional - that is, none of its methods alter the state of the existing instance. Instead, they return a new instance with the updated state. This design allows for easy chaining of actions and states while maintaining immutability.