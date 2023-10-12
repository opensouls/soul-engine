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
- `id`: a unique identifier of this particular cortext step
- `parents`: used to keep track of previous cortext steps in a chain
- `tags`: keeps tags on a cortex step that are added to instrumentation calls.

```javascript
let step = new CortexStep("Assistant", {
  pastCortexStep: previousStep,
  processor: new OpenAILanguageProgramProcessor(),
  memories: [[{ role: "system", content: "You are a helpful assistant." }]],
  lastValue: "Solved a complex math problem",
});
```

## Other Methods

### toString()

`toString()` generates a string representation of the assistant's chat history, including system instructions, user queries, and assistant responses.

```javascript
let stringRepresentation = step.toString();
```

## Understanding and Utilizing The Value Property

`CortexStep` has a `value` property which represents the output generated from the last action. This `value` is strongly typed depending on the evaluated Cognitive Function.

This `value` can be very useful in chaining actions where the output of one action might influence or be used in the next action. To access this `value`, simply use:

```javascript
let value = step.value;
```

Remember, the `CortexStep` class is designed to be functional - that is, none of its methods alter the state of the existing instance. Instead, they return a new instance with the updated state. This design allows for easy chaining of actions and states while maintaining immutability.
