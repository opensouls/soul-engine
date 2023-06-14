# 🤖+👱 @socialagi/lmyield

⚡ Lightweight language for controlling OpenAI Chat API generations ⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) ![Twitter](https://img.shields.io/twitter/url/https/twitter.com/socialagi.svg?style=social&label=Follow%20%40socialagi)](https://twitter.com/socialagi) [![](https://dcbadge.vercel.app/api/server/FCPcCUbw3p?compact=true&style=flat)](https://discord.gg/FCPcCUbw3p)

## 🤔 What is this?

LMYield enables you to control OpenAI's Chat API generations into arbitrary output schema.

Features:

 - [x] Simple, intuitive syntax, based on Handlebars templating.
 - [x] Rich output structure with speculative caching and multiple generations to ensure desired schema.
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

... todo

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

- Reimplement parser
- Testing for the parser
- Streaming for partial generations
- Max generations plus informative failure
- Stronger enforcement of output schema after N failed runs
- Generation block allows for discrete choices
- Surface generated yield variables throughout the program to allow for conditional thought chaining


## Class API

The `LMYield` class has a simple API

### constructor

The `LMYield` constructor takes in an `LMYield` program and an optional array of variables to be replaced inside the program. 

```npm
const lmYield = new LMYield(program)

-- or --

const lmYield = new LMYield(program, replacementVars)
```

Replacements are referenced via handlebars syntax `{{varName}}`.

### generate

A `LMYield` instance can be called to generate

```npm
lmYield.generate()
```
which causes emission of `LMYieldEvents.generation` and `LMYieldEvents.done`. Alternatively, generate can be awaited for

```npm
const generations = await lmYield.generate()
```

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