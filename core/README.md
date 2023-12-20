# 🤖+👱 SocialAGI

> Subroutines for AI Souls

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) ![Twitter](https://img.shields.io/twitter/url/https/twitter.com/socialagi.svg?style=social&label=Follow%20%40socialagi)](https://twitter.com/socialagi) [![](https://dcbadge.vercel.app/api/server/FCPcCUbw3p?compact=true&style=flat)](https://discord.gg/FCPcCUbw3p)

## ⚡ Quick Install
```$ npm install socialagi```


## 🤔 What is this?

**SocialAGI** offers developers clean, simple, and extensible abstractions for directing the cognitive processes of large language models (LLMs), steamlining the creation of more effective and engaging AI souls.

## 🏃 Quick Start

The easiest way to get started developing with `socialagi` is to check out the [`metacognition example`](./examples/metacognition.ts) or explore the [documentation](http://socialagi.dev).

## 🧠  Documentation

Check out the full documentation at [socialagi.dev](http://socialagi.dev)!

## 💫 AI Souls

SocialAGI aims to simplify the developer experience as much as possible in creating agentic and embodied Open Souls. Unlike traditional chatbots, Open Souls have personality, drive, ego, and will.

We are solving problems all the way across the AI souls stack, including:
- How do I create the most lifelike AI entity?
- How do I quickly host an AI soul?
- How do I manage dialog and cognitive memory?
- How do I get away from boring technical details and instead sculpt personalities?

## Key Concepts

### CortexStep

The CortexStep class is the core. It represents a step in the thought process of the entity. It has a next method which takes a cognitive function and generates the next step.

```typescript
const step = new CortexStep("EntityName");
const nextStep = await step.next(cognitiveFunction);
```

Streaming is fully supported:

```typescript
const step = new CortexStep("EntityName");
const { stream, nextStep } = await step.next(externalDialog("Say hello to the user!"), { stream: true });

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

Process functions from cognitive functions (see below) run _after_ the stream is complete.

### Cognitive Functions

Cognitive functions are used to generate responses. They are based on OpenAI's function calling model and use Zod to provide strongly typed output and text formatting. The project includes several built in cognitive functions:

```typescript

enum ConversationalAction {
   none = "none",
   rambles = "rambles",
}
decision("Should Bogus ramble or stop talking?", ConversationalAction)

brainstorm("Given the context, what are three lunches Samantha could make with those ingredients?")
```

You can easily build your own cognitive functions and get strongly typed output from the Open Soul like this:

```typescript
// note that importing z from here is important as if you import it from "zod" then you will get type errors
import { z } from "socialagi"

export const queryMemory = (query:string) => {
  return () => {
    return {
      name: "queryMemory",
      description: query,
      parameters: z.object({
        answer: z.string().describe(`The answer to: ${query}`)
      })
    };
  }
}

let step = new CortexStep("Jonathan");
step = step.withMemory([{
  role: ChatMessageRoleEnum.System,
  content: "The name you are looking for is Jonathan"
}])

const resp = await step.next(queryMemory("What is the name I'm looking for? Answer in a single word"))
// resp.answer === "Jonathan"

```

If you only need the *value* of a CognitiveFunction and not a new step to continue thinking than you can use the `#compute` function on CortexStep which will only return the value.

```typescript
  const val = await step.compute(decision("Is the sky blue?", ["yes", "no"]))
  // val will equal "yes" or "now"
```

### Other Language Models

CortexSteps can handle other language processors that implement `LanguageModelProgramExecutor` interface. The package also includes a `FuncionlessLLM` executor that lets you call any OpenAI API compatible API even if does not support function calls or multiple system messages.

```typescript
import { FunctionlessLLM } from "socialagi/next";

const queryMemory = (query: string) => {
  return () => {
    return {
      name: "queryMemory",
      description: query,
      parameters: z.object({
        answer: z.string().describe(`The answer to: ${query}`)
      })
    };
  }
}
let step = new CortexStep("Jonathan", {
  processor: new FunctionlessLLM({
    baseURL: "http://localhost:1234/v1",
    // optionally, if your API only supports one single system call, you can set this to true
    // and it will concatenate all system messages into a single message.
    compressSystemMessages: false
  })
});
step = step.withMemory([{
  role: ChatMessageRoleEnum.System,
  content: "The name you are looking for is Jonathan"
}])
const resp = await step.next(queryMemory("What is the name I'm looking for? Answer in a single word"))

```

### Instrumentation

Instrumentation is a powerful feature that allows you to monitor and debug your steps in a detailed fashion.

To turn on instrumentation, you need to call the `startInstrumentation` function. This function accepts some extra configuration.

`startInstrumentation` should be called as the *first* file of any code you import... for example:

```typescript
import { startInstrumentation } from "@opensouls/cortexstep"
startInstrumentation()
//... rest of your app
```

The most commonly used option there is the `spanProcessorType`. By default, spans are processed in batches and so during short test runs, etc you might drop spans. If you want to make sure you capture every span turn on the Simple type:

```typescript
  startInstrumentation({
    spanProcessorType: SpanProcessorType.Simple
  })
```


To run a local Jaeger instance with telemetry UI run the following docker command:

```bash
exec docker run --rm --name jaeger \
  -e COLLECTOR_ZIPKIN_HOST_PORT=:9411 \
  -p 6831:6831/udp \
  -p 6832:6832/udp \
  -p 5778:5778 \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 14250:14250 \
  -p 14268:14268 \
  -p 14269:14269 \
  -p 9411:9411 \
  jaegertracing/all-in-one:1.48
```

Jaeger will be available here: http://localhost:16686/

You can assign tags to a cortex step and these will be sent to open telemetry. You can do this in two ways:

```typescript
new CortexStep("Bogus", {
  tags: {
    "conversation-id": "123",
  }
})
```

All child steps will persist the "conversation-id" (so calling withMemory or next will keep that tag around).

You can also add them per next call:

```typescript
  new CortexStep("Bogus").next(someNextFunction(), { tags: { oneOff: true }})
```
