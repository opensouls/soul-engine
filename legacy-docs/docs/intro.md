---
sidebar_position: 1
slug: /
title: Welcome
---

# Welcome to SocialAGI

> Cognitive Functions for AI Souls

:::info

`socialagi` is deprecated in favor of the the `@opensouls/core` package. The [Soul Engine](https://docs.souls.chat) is the best way to start building AI souls, and is now in alpha, [join our discord](https://discord.gg/opensouls) for access!

:::


**SocialAGI** offers developers clean, simple, and extensible abstractions for directing the cognitive processes of large language models (LLMs), steamlining the creation of more effective and engaging AI souls.

The library provides _Streamlined Context Management with `new CortexStep(...)`_. [CortexStep](/CortexStep/intro) facilitates the ordered construction of context with LLMs. It works on the principle of treating each interaction as a single step or functional transformation on working memory, offering a predictable and manageable way to guide the thought process of an LLM. This approach results in consistent, easier-to-follow interaction flows.

## Getting Started with SocialAGI

You can start using SocialAGI's cognitive tools:

```bash
$ npm install socialagi
```

## Supported LLMs

SocialAGI is primarily intended to work with OpenAI, however, it is possible to substitute in any language model through our [language model executor interface](/languageModels).
