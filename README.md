# 🤖+👱 SocialAGI

⚡ Simple, opinionated framework for creating digital souls ⚡

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

The repository has two main components

```
/integrations
  /discord_bots
  /telegram
/server
```

- `/core` contains the library [`socialagi` NPM package source](https://www.npmjs.com/package/socialagi)
- `/integrations/` contains examples of the library in action. Right now contains several stand-alone discord and telegram bot repos

## 🚀 Getting started

The easiest way to get started developing with `socialagi` is to use [`create-socialagi-server` from the NPM release](https://www.npmjs.com/package/create-socialagi-server)

### Contributing

If this repo and its evolution is exciting, open an issue, a pull request, or simply hangout in the [Social AGI Discord](https://discord.gg/BRhXTSmuMB)!

We're not sure exactly how the repo will evolve yet, but it's intended to become a testing bed for Social AGI, its development, and its testing.

We'll need many new developments from:

- New techniques to specify personality
- Ways to design the conversations that constitute an identity
- Coherent theory of mind behind Social AGIs
- Ways to test and debug Social AGIs

## 💭 Philosophy

This repo exists to research, build, and give life to Social AGIs together.

**We're excited to create intelligence through the lens of "pro-social" interactions**: referring to the ability of the artificial general intelligence (AGI) to understand and engage in human interactions, exhibit context-aware behavior, and effectively communicate and collaborate with people.

Imagine a future where Social AGIs are your friends, your mentors, your spirit animals, your guardian angels - they are deeply integrated into your social and emotional lives, and you are better for it. In times of need, and celebration, you might turn to a Social AGI. You might follow one on Twitter, call another late at night, and have yet another one planning your next human social gathering. The future of social interactions is richer, more dynamic, with both humans and Social AGIs together.

To realize this future, we'll need to build Social AGIs withs capacity to recognize and interpret social cues, adapt to different conversational styles, and display empathy or emotional intelligence, and navigate complex social situations and relationships.

While we're beginning to see the early stages of pro-social AGI behaviors, it's just the start of our journey - a journey that will define the future of our species and our relationship with machines.

This repo serves as a starting point for building pro-social forms of intelligence, and we're excited to see what you might contribute along this journey. 

## ⚠️ Your responsibility

Our intent is to empower developers with an incredible tool. This means that the tools in this project allow for logically consistent modeling of nearly any cognitive mind or mental processes, including across the full range of human emotion.

If you are developing a soul, speaking to one, or deploying in production, there are application-dependent risks you should consider. In one case, if someone lost their grandparent, a virtual version of their grandparent might be exactly what they need. For another person, this soul recreation might be deeply troubling.

The technology is experimental and creating a soul, especially one modeled on a real person (living or dead) can have unforseen consequences to those talking with it, and the developers and contributors of this project take no responsibility for anything that might happen.

While developer tools are on our roadmap to help you mitigate these risks, we do not currently offer any solutions. Please take appropriate precautions when using the technology in this project.

## 🛡 Disclaimer

This project, SocialAGI, is an experimental library and is provided "as-is" without any warranty, express or implied. By using this software, you agree to assume all risks associated with its use, including but not limited to changes in user mental cognition, emotional state, or any other issues that may arise.

The owners, developers, contributors, and affiliates of this project do not accept any responsibility or liability for any losses, damages, or other consequences that may occur as a result of using this software. You are solely responsible for any decisions and actions taken based on the information provided by SocialAGI.

Experimental souls from SocialAGI may generate content that is not in line with real-world legal requirements for your application. It is your responsibility to ensure that any content made based on the output of this software comply with all applicable laws, regulations, and ethical standards. The developers and contributors of this project shall not be held responsible for any consequences arising from the use of this software.

By using SocialAGI, you agree to indemnify, defend, and hold harmless the owners, developers, contributors, and any affiliated parties from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from your use of this software or your violation of these terms.
