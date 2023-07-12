# 🤖+👱 SocialAGI

⚡ Practical Tools for Guiding LLM Cognition ⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) ![Twitter](https://img.shields.io/twitter/url/https/twitter.com/socialagi.svg?style=social&label=Follow%20%40socialagi)](https://twitter.com/socialagi) [![](https://dcbadge.vercel.app/api/server/FCPcCUbw3p?compact=true&style=flat)](https://discord.gg/FCPcCUbw3p)


### 🤔 What is this?

SocialAGI aims to simplify the developer experience as much as possible in creating agentic chatbots called digital souls. Unlike traditional chatbots, digital souls have personality, drive, ego, and will.

This repo exists to solve problems all the way across the stack, including:
- How do I create the most lifelike AI entity?
- How do I quickly host a digital soul?
- How do I manage dialog and cognitive memory?
- How do I get away from boring technical details and instead sculpt personalities?

## Hosted example

Check out [Meet Samantha](http://meetsamantha.ai)

Running off SocialAGI

```
import { Soul, Blueprints } from "socialagi";

const samantha = new Soul(Blueprints.SAMANTHA);

samantha.on("says", (text : String) => {
  console.log("\nSamantha says: ", text);
});

samantha.on("thinks", (text : String) => {
  console.log("\nSamantha thinks: ", text);
});

samantha.tell("Hi Samantha!")
```

<img width="500" alt="image" src="https://user-images.githubusercontent.com/8204988/236294504-a41af71f-bccf-44e5-b02a-60ab51982ccd.png">

## 📖 Repo structure

The repository has three main components

```
/example-webapp
/core
/integrations
  /discord_bots
  /telegram
```

- [`/example-webapp`](https://github.com/opensouls/socialagi-ex-webapp) contains an example integration of the socialagi library in a chat website 
- [`/core`](./core) contains the library [`socialagi` NPM package source](https://www.npmjs.com/package/socialagi)
- [`/integrations`](./integrations) contains examples of the library in action. Right now contains several stand-alone discord and telegram bot repos

## 🚀 Getting started

The easiest way to get started developing with `socialagi` is to check out the [`/example-webapp`](https://github.com/opensouls/socialagi-ex-webapp)

### Contributing

If this project evolution is exciting to you, check out the issues, open a pull request, or simply hangout in the [Social AGI Discord](https://discord.gg/BRhXTSmuMB)!

On the roadmap at a high level are:

- Minimal API surfaces for designing AI cognition
- New techniques to specify personality
- Ways to design the conversations that constitute an identity
- Coherent theory of mind behind Social AGIs
- Ways to test and debug Social AGIs
