---
id: intro
sidebar_position: 1
---

# Introduction

**CortexStep** is a dedicated class designed for orchestrating advanced interactions with large language models (LLMs). Inspired by human cognitive processes, the core philosophy of CortexStep is based on the concept of append-only context building.

CortexStep provides a structured approach to guide language models sequentially, similar to the way we assemble building blocks. Each instruction and its resulting output are encapsulated within discrete 'steps'. This means you can build complex cognitive sequences without needing to manually handle the context directly.

As a very simple example, consider this code snippet that has a Wizard asking 5 why questions before responding:

```javascript
import { CortexStep, internalMonologue } from "socialagi";

let cortex = new CortexStep("Wizard");

// ...

async function withDeepAnswer(cortex: CortexStep) {
  let count = 0;
  while (count < 5) {
    cortex = await cortex.next(internalMonolouge("Wizard wonders, asking themselves the deeper questions"));
    count++;
  }
  cortex = await cortex.next(internalMonologue("Answering the last question I asked myself"));
}

// ...
```

As this example illustrates, CortexStep operates on the principles of functional programming. All methods within the class are 'pure' - they don't mutate the original class but return a new instance reflecting the changes. This paradigm comes with several benefits:

1. **Predictability:** The behavior of methods remains consistent and predictable due to the absence of hidden states or side effects.
2. **Append-Only Context Management:** The context grows progressively with each new piece of information, never deleting or modifying existing information. This leads to a robust, traceable, and more manageable context.
3. **Modularity:** Each 'step' is a self-contained unit that can be developed, tested, and reasoned about independently. These steps can then be seamlessly integrated to form comprehensive units of thought.

Compared to other tools like LangChain, which offer broader flexibility but also bring in complexity, CortexStep provides a more opinionated approach. It boasts a minimalistic API that ensures a clean abstraction layer over the language model, making the development process more straightforward.

CortexStep excels at managing context, a crucial aspect when dealing with LLMs. It streamlines the creation of sophisticated behaviors with language models, making it easier to develop AI-powered conversations and tasks while avoiding common pitfalls.

## Streaming

Streaming is fully supported:

```typescript
const step = new CortexStep("EntityName");
const { stream, nextStep } = await step.next(cognitiveFunction, { stream: true });

let streamed = ""

// stream is an AsyncIterable<string>
for await (const chunk of stream) {
  expect(chunk).to.be.a("string")
  expect(chunk).to.exist
  streamed += chunk
}
// nextStep is a Promise<CortexStep> that resolves when the stream is complete.
const resp = await nextStep
```

Process functions from cogntivie functions (see below) run _after_ the stream is complete.