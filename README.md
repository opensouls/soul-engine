# 🤖+👱 SocialAGI

> Subroutines for AI Souls

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) ![Twitter](https://img.shields.io/twitter/url/https/twitter.com/socialagi.svg?style=social&label=Follow%20%40socialagi)](https://twitter.com/socialagi) [![](https://dcbadge.vercel.app/api/server/FCPcCUbw3p?compact=true&style=flat)](https://discord.gg/FCPcCUbw3p)

## 🤔 What is this?

**SocialAGI** offers developers clean, simple, and extensible abstractions for directing the cognitive processes of large language models (LLMs), critical for the creation of AI Souls. AI Souls will comprise thousands of linguistic instructions (formerly known as 'prompts'): our focus is on streamlining the management this complexity, freeing you to create more effective and engaging AI experiences.

## 💡 Hosted example

Check out [Meet Samantha](http://meetsamantha.ai)

Running off SocialAGI

```javascript
import { Soul, Blueprints } from "socialagi";

const samantha = new Soul(Blueprints.SAMANTHA);

samantha.on("says", (text) => {
  console.log("Samantha says: ", text);
});

samantha.on("thinks", (text) => {
  console.log("Samantha thinks: ", text);
});

samantha.tell("Hi Samantha!")
```

<img width="500" alt="image" src="https://user-images.githubusercontent.com/8204988/236294504-a41af71f-bccf-44e5-b02a-60ab51982ccd.png">

## 💫 AI Souls

SocialAGI aims to simplify the developer experience as much as possible in creating agentic and embodied chatbots called AI Souls. Unlike traditional chatbots, digital souls have personality, drive, ego, and will.

We are solving problems all the way across the AI souls stack, including:
- How do I create the most lifelike AI entity?
- How do I quickly host an AI soul?
- How do I manage dialog and cognitive memory?
- How do I get away from boring technical details and instead sculpt personalities?

## 📖 Repo structure

The repository has three main components

```
/example-webapp
/core
/integrations
  /discord_bots
  /telegram
/docs
```

- [`/example-webapp`](https://github.com/opensouls/socialagi-ex-webapp) contains an example integration of the socialagi library in a chat website 
- [`/core`](./core) contains the library [`socialagi` NPM package source](https://www.npmjs.com/package/socialagi)
- [`/integrations`](./integrations) contains examples of the library in action. Right now contains several stand-alone discord and telegram bot repos
- [`/docs`](./docs) contains the documentation website for the project, running at [socialagi.dev](http://socialagi.dev)

## 🚀 Getting started

The easiest way to get started developing with `socialagi` is to check out the [`/example-webapp`](https://github.com/opensouls/socialagi-ex-webapp) or explore the [documentation](http://socialagi.dev).

## 🧠 Documentation

Check out the full documentation at [socialagi.dev](http://socialagi.dev)!

## 👏 Contributing

If this project is exciting to you, check out the issues, open a pull request, or simply hangout in the [Social AGI Discord](https://discord.gg/BRhXTSmuMB)!

On the roadmap at a high level are:

- Minimal API surfaces for designing AI cognition
- New techniques to specify personality
- Ways to design the conversations that constitute an identity
- Coherent theory of mind behind AI cognition
- Ways to test and debug AI souls
