---
sidebar_position: 1
slug: /
title: Welcome
---

# Welcome to SocialAGI

> Subroutines for AI Souls

**SocialAGI** offers developers clean, simple, and extensible abstractions for directing the cognitive processes of large language models (LLMs), critical for the creation of AI Souls. AI Souls will comprise thousands of _linguistic instructions_ (formerly known as 'prompts'): our focus is on streamlining the management of this complexity, freeing you to create more effective and engaging AI experiences.

The library has three main value propositions:

1. _Streamlined Context Management with `new CortexStep(...)`_. [CortexStep](/CortexStep/intro) facilitates the ordered construction of context with LLMs. It works on the principle of treating each interaction as a single step or functional transformation on working memory, offering a predictable and manageable way to guide the thought process of an LLM. This approach results in consistent, easier-to-follow interaction flows.
1. _Efficient Scheduling of Mental Processes with `new CortexScheduler(...)`_. [CortexScheduler](/CortexScheduler/intro) orchestrates the scheduling and dispatching of mental processes, ensuring a synchronous flow of memory transformations from one event to the next. By turning the event-driven world into a synchronous system, CortexScheduler allows for straightforward debugging, testing, and reasoning, making the cognitive structure of your AI more understandable and predictable.

## Getting Started with SocialAGI

You can start using SocialAGI's cognitive tools:

```bash
$ npm install socialagi
```

:::info

These docs describe importing the "socialagi/next" export which is a recent addition to our codebase
```typescript
import { CortexStep } from "socialagi/next"
```

:::

## Supported LLMs

SocialAGI is primarily intended to work with OpenAI, however, it is possible to substitute in any language model through our [executor and streaming interfaces](/languageModels).
