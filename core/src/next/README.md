# 🤖+👱 CortexStep

> Subroutines for OpenSouls

## 🤔 What is this?

**CortexStep** offers developers clean, simple, and extensible abstractions for directing the cognitive processes of large language models (LLMs), critical for the creation of OpenSouls. Open Souls will comprise thousands of linguistic instructions (formerly known as 'prompts'): our focus is on streamlining the management this complexity, freeing you to create more effective and engaging AI experiences.

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

### Cognitive Functions

Cognitive functions are used to generate responses. They are based on OpenAI's function calling model and use Zod to provide strongly typed output and text formatting. The project includes several built in cognitive functions:

```typescript

internalMonologue("feels", "Bogus notes how it feels to themself in one sentence")

enum ConversationalAction {
   none = "none",
   rambles = "rambles",
}
decision("decision", ConversationalAction)

externalDialog("shouts", "Bogus shouts incredibly loudly with all caps")

brainstorm("Given the context, what are three lunches Samantha could make with those ingredients?")
```

You can easily build your own cognitive functions and get strongly typed output from the Open Soul like this:

```typescript
import { z } from "zod"

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

### Private Repo

Since this repository is private, you'll need to authorize npm to pull from github packages for the @opensouls scope.
To authorize npm, you need to login with the following command:

```bash
npm login --scope=@opensouls --auth-type=legacy --registry=https://npm.pkg.github.com`
```

When prompted, your username is your github username and your password is your personal access token (classic) with with the following scopes: `read:packages`
You can create a personal access token here: https://github.com/settings/tokens

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
