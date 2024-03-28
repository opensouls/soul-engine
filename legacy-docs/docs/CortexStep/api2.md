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

## Vision

SocialAGI supports vision via the GPT4 vision API. Here is a simple example illustrating usageL

```javascript
const step = new CortexStep("Samantha", {
  processor: new OpenAILanguageProgramProcessor({}, {
    model: "gpt-4-vision-preview",
    max_tokens: 500,
  })
}).withMemory([
  {
    role: ChatMessageRoleEnum.System,
    content: "You are modeling the mind of Samantha, a gen-z physicist who loves cat pics.",
  },
  {
    role: ChatMessageRoleEnum.User,
    content: [
      { type: "text", text: "I just found this on the internet."},
      { type: "image_url", image_url: "https://www.socialagi.dev/img/socialagi-social-card.jpg" },
    ]
  }
])
const result = await step.next(externalDialog("Samantha describes what is in the photo."))
console.log("vision result: ", result.value)
```

## Other Methods

### withMonologue(narrative)

`withMonologue(narrative: string)` is syntactic sugar for adding a memory to the step, intended of the form:

```javascript
step = step.withMonologue(html`
  Samantha thought: This is getting out of control, I need to leave.
`)
```

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
