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

usage features

```
import LMYield, { LMYieldEvents } from "@socialagi/lmyield";

const lmYield = LMYield(`
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
`)

lmYield.on(LMYieldEvents.generation, (newYield) =>
  console.log("YIELD", newYield)
);
lmYield.generate()
```

## Language Features

### Message boundaries

Message boundaries in OpenAI are controlled through different context blocks: `{{#context~ /}}` etc.

### Yield magic

The magic of lmyield occurs in the `{{#yield~ /}}` block and the `{{gen ...` instructions. Take a look at the following yield block. This block instructs `lmYield` how the model output generation must look  

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

### Roadmap

- Reimplement parser
- Testing for the parser
- Control blocks

## FAQ

### Does this work with open source models?

Not currently, but certainly a more general compiler could be built. The OpenAI Chat API models (3.5 turbo and 4) are by far the most advanced and flexible currently, so the language was initially written to be compiled for those.

### Why not just use the OpenAI functions call API?

Great question! `lmYield` was invented with the express intent to control chain of thought programming with language models. The function call api is great, especially for actions, but it doesn't maintain the same degree of ordering and coherence in output generation as sequential chain of thought prompting. `lmYield` is a language designed for control flow of chain of thought prompting, especially for applications in modeling agentic theory of mind.

### Why not just use LMQL?

`lmYield` draws inspiration from LMQL - it's a very cool query language! However, its intent is to allow fine-grained control over the output decoding strategy. This has the following implications:

1. Steep learning curve due to choice of SQL syntax - it feels quite divorced from the way "prompting" _feels_
1. Constraints are not inline, so reading the code is a bit harder
1. The language doesn't mesh well or take full advantage of the OpenAI Chat API
1. It's in python not typescript
   
However, `lmYield` takes inspiration from the stopping constraint and speculative caching concepts from LMQL

### Why not just use MSFT Guidance?

Guidance is also awesome! However, guidance is primarily designed to work with open source models. This has the following implications:

1. Feature rich, but missing control flow for OpenAI Chat API - which is the most critical feature for improving chain of thought and agentic reasoning
1. It's in python not typescript

## Live example