---
sidebar_position: 1
slug: /
---

# Welcome

> Practical Tools for Guiding LLM Cognition

SocialAGI offers developers straightforward, dependable tools for structuring and directing the cognitive processes of large language models (LLMs). Our focus is on simplifying interaction management and personality shaping, freeing you to create more effective and engaging AI experiences.

The library has two main value propositions:

1. *Streamlined Context Management with `new CortexStep(...)`*. [CortexStep](/Cortex/intro) facilitates the ordered construction of context with LLMs. It works on the principle of treating each interaction as a distinct step, offering a predictable and manageable way to guide the thought process of an LLM. This approach results in consistent, easier-to-follow interaction flows.
1. *Ego, will, and personality with `new Soul(...)`*. The Soul (TODO) class is your tool to instill personality traits into your LLMs. It's about more than just responses; Soul maps out a cognitive profile that can lead to more nuanced and engaging interactions. It's a practical approach to give your AI a touch of individuality while keeping things professional and focused.

## Getting Started with SocialAGI

You can start using SocialAGI's cognitive tools:

```bash
$ npm install socialagi
```

## Supported LLMs

Currently only OpenAI's language models are supported. As other language models become feasible to include in the `SocialAGI` library, we will add them.