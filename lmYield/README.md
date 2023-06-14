# 🤖+👱 @socialagi/lmyield

⚡ Lightweight language for controlling OpenAI Chat API generations ⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) ![Twitter](https://img.shields.io/twitter/url/https/twitter.com/socialagi.svg?style=social&label=Follow%20%40socialagi)](https://twitter.com/socialagi) [![](https://dcbadge.vercel.app/api/server/FCPcCUbw3p?compact=true&style=flat)](https://discord.gg/FCPcCUbw3p)

## 🤔 What is this?

LMYield enables you to guide OpenAI's Chat API generations into arbitrary output patterns, and is specifically designed to enhance chain of thought prompting for agents.

Features:

 - [x] Simple, intuitive syntax, based on Handlebars templating.
 - [x] Rich output structure with speculative caching and multiple generations to ensure desired output structure.
 - [x] Designed specifically for agentic chain of thought.
 - [x] Typescript not python

## Quick Install

```$ npm install @socialagi/lmyield```

then

```npm
export OPENAI_API_KEY=...
```

example usage

```
import LMYield, { LMYieldEvents } from "@socialagi/lmyield";

const lmProgram = `npm
{{#context~}}
{{! this block compiles to system in oai}}

{{personality}}

...
{{~/context}

{{#entity~ name='xyz'}}
{{! this block compiles to user in oai}}
...
{{~/entity}

{{#generated~}}
{{! this block compiles to system in assistant in oai and must be last}}
...
{{~/generated}}

{{#instructions~}}
{{! this optional block currently compiles to system in assistant in oai and must before the generated block}}
...
{{~/instructions}}

{{#yield~}}
{{! the magic happens here - this block controls the shape of the output}}
<FEELS>I feel {{gen 'feeling' until '</FEELS>'}}
...
{{~/yield}}
`

const lmYield = LMYield(lmProgram, [{personality: "Bogus, the witch from Hansel & Gretel"}])

lmYield.on(LMYieldEvents.generation, (newYield) =>
  console.log("YIELD", newYield)
);

lmYield.generate()
```

## Language Features

### Message boundaries

Message boundaries in OpenAI are controlled through different context blocks: `{{#context~ /}}` etc.

### Variable templating

Variable templates adhere to handlebars, i.e. `{{varName}}`, and have their replacements passed into the `LMYield` constructor.

### Yield magic

The magic of `LMYield` occurs in the `{{#yield~ /}}` block and the `{{gen ...` instructions. This block instructs `LMYield` how the model generation must look - take a look at the following yield block: 

```
{{#yield~}}
<INTERNAL_DIALOG>
  <FELT>Bogus felt {{gen 'feeling' until '</FELT>'}}
  <THOUGHT>Bogus thought {{gen 'thought' until '</THOUGHT>'}}
  <SAID>Bogus said "{{gen 'saying' until '"</SAID>'}}
  <ANALYZED>Next, Bogus planned to {{gen 'analyzed' until '</ANALYZED>'}}
</INTERNAL_DIALOG>
<END />
{{~/yield}}
```

This block ensures that only effective generations are allowed that look like

```
<INTERNAL_DIALOG>
  <FELT>Bogus felt a thrill of excitement</FELT>
  <THOUGHT>Bogus thought perfect, a lost child is even easier to capture</THOUGHT>
  <SAID>Bogus said "Lost, you say? Oh dear, that's not good. But don't worry, I can help you find your way. Just follow me."</SAID>
  <ANALYZED>Next, Bogus planned to lead the child deeper into the woods, away from any chance of help.</ANALYZED>
</INTERNAL_DIALOG>
<END />
```

As `LMYield` generates tokens, they're either matched against the `{{#yield~ /}}` block, or filled into the variables specified by the language directive `{{gen 'YOUR_VAR' until 'STOPPING_SEQUENCE'}}`. Often, if you've written your program well, it should execute in a single generation or two, but `LMYield` almost ensures it will complete in the desired output format.

When a stopping sequence is completed, then the event `LMYieldEvents.generation` is emitted with the generation context. You can listen for these events via:

```npm
lmYield.on(LMYieldEvents.generation, (newYield) =>
  console.log("YIELD", newYield)
);
```

where the core pieces of a yielded generation are
```npm
type Yield {
  name: string   // the variable name e.g. 'feeling'
  value: string  // the generated value
  ...
}
```

### Roadmap

- Reimplement parser to support more complex nesting and informative error handling
- Testing for the parser
- Streaming for partial generations
- Max generations plus informative failure
- Stronger enforcement of output schema after N failed runs
- Generation block allows for discrete choices
- Surface generated yield variables throughout the program to allow for conditional thought chaining


## Class API

The `LMYield` class has a simple API

### constructor

The `LMYield` constructor takes in an `LMYield` program and an array of variables to be replaced inside the program. 

```npm
const lmYield = new LMYield(program, replacementVars)
```

Replacements are referenced via handlebars syntax `{{varName}}`.

Additionally, an option `LMYieldOptions` object can be passed with contains the OpenAI Model name to be used.

Here is the current enum of supported model names
```npm
export enum LMYieldModels {
  gpt_3_5_turbo = "gpt-3.5-turbo",
  gpt_3_5_turbo_0613 = "gpt-3.5-turbo-0613",
  gpt_3_5_turbo_16k = "gpt-3.5-turbo-16k",
  gpt_3_5_turbo_16k_0613 = "gpt-3.5-turbo-16k-0613",
  gpt_4 = "gpt-4",
  gpt_4_0613 = "gpt-4-0613",
  gpt_4_32k = "gpt-4-32k",
  gpt_4_32k_0613 = "gpt-4-32k-0613",
}
```

By default, `gpt_3_5_turbo_16k` is used.

### generate

A `LMYield` instance can be called to generate

```npm
lmYield.generate()
```
which causes emission of `LMYieldEvents.generation` and `LMYieldEvents.done`. Alternatively, generate can be awaited for

```npm
const generations = await lmYield.generate()
```

### events

`LMYield` currently emits two types of events: `generation` events:

```npm
lmYield.on(LMYieldEvents.generation, (generation: Yield) => console.log(generation))
```

and `done` events:

```npm
lmYield.on(LMYieldEvents.done, () => console.log("DONE")))
```

## Full example

Here's a full example `LMYield` program 

```
{{#context~}}
The following is a conversation between <Bogus>{{personality}}</Bogus>, and an unknown person.

Several thought patterns are references through the conversation:

Bogus uses the following <INTERNAL_DIALOG/> to think through what it says next.

<INTERNAL_DIALOG>
  <FELT>Bogus felt ...</FELT>
  <THOUGHT>Bogus thought ...</THOUGHT>
  <SAID>Bogus said "..."</SAID>
  <ANALYZED>Next, Bogus planned to ...</ANALYZED>
</INTERNAL_DIALOG>
<END />
{{~/context}}

{{#entity~ name='unknown'}}
<MEMORY for="unknown">
  <SAID>"Hi"</SAID>
</MEMORY>
{{~/entity}}

{{#generated~}}
<MEMORY for="Bogus">
  <FELT>Bogus felt excited and hungry</FELT>
  <THOUGHT>Bogus thought perhaps another victim for me to feast upon</THOUGHT>
  <SAID>Bogus said "Hello there, little one. What brings you to my neck of the woods?"</SAID>
  <ANALYZED>Next, Bogus planned to lull them into a false sense of security before pouncing.</ANALYZED>
</MEMORY>
{{~/generated}}

{{#entity~ name='unknown'}}
<MEMORY for="unknown">
  <SAYS>"I think I'm lost"</SAYS>
</MEMORY>
{{~/entity}}

{{#instructions~}}
Then, Bogus had the following <INTERNAL_DIALOG />
{{~/instructions}}

{{#yield~}}
<INTERNAL_DIALOG>
  <FELT>Bogus felt {{gen 'feeling' until '</FELT>'}}
  <THOUGHT>Bogus thought {{gen 'thought' until '</THOUGHT>'}}
  <SAID>Bogus said "{{gen 'saying' until '"</SAID>'}}
  <ANALYZED>Next, Bogus planned to {{gen 'analyzed' until '</ANALYZED>'}}
</INTERNAL_DIALOG>
<END />
{{~/yield}}
```

There's a few pieces in here to note for effective usage.

1. The number of API calls required by `LMYield` is minimized if the output structure is guessed correctly by the model, this means that it's often advantageous to provide the expected model output structure in the context. `LMYield` doesn't enforce this standard, however, to ensure a minimal API for the language itself, and ensure the features provided do not limit developer freedom.
1. The output structure should refer back to a single unique reference (not multiple in the history) - note how `<INTERNAL_DIALOG />` only references the context block. The historical generations are given a different `<MEMORY />` designation.

## FAQ

### Does this work with open source models?

Not currently, but certainly a more general compiler could be built. The OpenAI Chat API models (3.5 turbo and 4) are by far the most advanced and flexible currently, so the language was initially written to be compiled for those.

### Why not just use the OpenAI functions call API?

Great question! `LMYield` was invented with the express intent to control chain of thought programming with language models. The function call api is great, especially for actions, but it doesn't maintain the same degree of ordering and coherence in output generation as sequential chain of thought prompting. Instead, `LMYield` is a language designed for control flow of chain of thought prompting, especially for applications in modeling agentic theory of mind.

### Why not just use LMQL?

`LMYield` draws inspiration from LMQL - it's a very cool query language! However, its intent is to allow fine-grained control over the output decoding strategy. This has the following implications:

1. Steep learning curve due to choice of SQL syntax - it feels quite divorced from the way "prompting" _feels_
1. Constraints are not inline, so reading the code is a bit harder
1. The language doesn't mesh well or take full advantage of the OpenAI Chat API
1. It's in python not typescript
   
`LMYield` takes inspiration from the stopping constraint and speculative caching concepts from LMQL

### Why not just use MSFT Guidance?

Guidance is also awesome! However, guidance is primarily designed to work with open source models. This has the following implications:

1. Feature rich, but missing control flow for OpenAI Chat API - which is the most critical feature for improving chain of thought and agentic reasoning
1. It's in python not typescript

`LMYield` takes inspiration from the handlebars syntax of guidance

## Live example

If you checkout the library code, it contains an example that can be run with `npm run example`.
