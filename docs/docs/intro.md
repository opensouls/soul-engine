---
sidebar_position: 1
slug: /
---

# Welcome

> Practical Tools for Guiding LLM Cognition

**SocialAGI** offers developers clean, simple, and extensible abstractions for directing the cognitive processes of large language models (LLMs). Advanced AI agents, entities, and souls will comprise thousands of *linguistic instructions* (formerly known as 'prompts'): our focus is on streamlining the management this complexity, freeing you to create more effective and engaging AI experiences.

The library has three main value propositions:

1. *Streamlined Context Management with `new CortexStep(...)`*. [CortexStep](/CortexStep/intro) facilitates the ordered construction of context with LLMs. It works on the principle of treating each interaction as a single step or functional transformation on working memory, offering a predictable and manageable way to guide the thought process of an LLM. This approach results in consistent, easier-to-follow interaction flows.
1. *Efficient Scheduling of Mental Processes with `new CortexScheduler(...)`*. [CortexScheduler](/CortexScheduler/intro) orchestrates the scheduling and dispatching of mental processes, ensuring a synchronous flow of memory transformations from one event to the next. By turning the event-driven world into a synchronous system, CortexScheduler allows for straightforward debugging, testing, and reasoning, making the cognitive structure of your AI more understandable and predictable.
1. *Ego, will, and personality 'out of the box' with `new Soul(...)`*. The [Soul](/Soul) class is your tool to instill personality traits into your LLMs with just a few lines of code. Soul provides sensible defaults for empathetic and agentic social interactions 'out of the box', leading to more nuanced and engaging interactions.

## Getting Started with SocialAGI

You can start using SocialAGI's cognitive tools:

```bash
$ npm install socialagi
```

## Supported LLMs

SocialAGI is primarily intended to work with OpenAI, however, it is possible to substitute in any language model through our [executor and streaming interfaces](/languageModels).