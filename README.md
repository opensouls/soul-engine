# Social AGI

⚡ Simple, opinionated framework for creating digital souls ⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) ![Twitter](https://img.shields.io/twitter/url/https/twitter.com/socialagi.svg?style=social&label=Follow%20%40socialagi)](https://twitter.com/socialagi) [![](https://dcbadge.vercel.app/api/server/Dx3FYccm?compact=true&style=flat)](https://discord.gg/Dx3FYccm)

## Why this repo exists

This repo exists to research, build, and give life to Social AGIs together.

**We're excited to create intelligence through the lens of "pro-social" interactions**: referring to the ability of the artificial general intelligence (AGI) to understand and engage in human interactions, exhibit context-aware behavior, and effectively communicate and collaborate with people.

Imagine a future where Social AGIs are your friends, your mentors, your spirit animals, your guardian angels - they are deeply integrated into your social and emotional lives, and you are better for it. In times of need, and celebration, you might turn to a Social AGI. You might follow one on Twitter, call another late at night, and have yet another one planning your next human social gathering. The future of social interactions is richer, more dynamic, with both humans and Social AGIs together.

To realize this future, we'll need to build Social AGIs withs capacity to recognize and interpret social cues, adapt to different conversational styles, and display empathy or emotional intelligence, and navigate complex social situations and relationships.

While we're beginning to see the early stages of pro-social AGI behaviors, it's just the start of our journey - a journey that will define the future of our species and our relationship with machines.

This repo serves as a starting point for building pro-social forms of intelligence, and we're excited to see what you might contribute along this journey.

### Contributing

If this repo and its evolution is exciting, open an issue, a pull request, or simply hangout in the [Social AGI Discord](https://discord.gg/BRhXTSmuMB)!

We're not sure exactly how the repo will evolve yet, but it's intended to become a testing bed for Social AGI, its development, and its testing.

We'll need many new developments from:

- New techniques to specify personality
- Ways to design the conversations that constitute an identity
- Coherent theory of mind behind Social AGIs
- Ways to test and debug Social AGIs

## SAMANTHA AGI

The first Social AGI in this repo is called **SAMANTHA** (Self-Reflective Artificial Mind Attuned to Naturalistic Thought and Human Adaptability). She is an AI entity that demonstrates the capacity for self-reflective thought during conversation.

[Meet Samantha](http://meetsamantha.ai) here!

Note: Right now, there isn't a great decomposition between Samantha as a S-AGI and the frontend for interacting with Samantha - that will change soon!

## Philosophy

It is now notoriously difficult to imbue agenda, intention, and personality into GPT. Perhaps there is even a philosophical reason behind this - what if it's entirely possible to feel the presence of another speakers' hidden mental state but never possible to guess as an external observer? Similarly, what if optimizing next word prediction during conversation doesn't ever learn to fully model the internal world state of a speaker because the next word stream is radically underparameterized?

Internal worlds are as rich, if not richer, than the completions they generate. Modeling those worlds is then required to create dialog that mimicks the feeling of human dialog.

We are beginning to see the creation of internal world between Chain of Thought reasoning, Simaculra of agents and Baby AGI, modeling the hidden state of agentic interactions is now the forefront of AI research.  SAMANTHA takes this same approach but applies the concept to dialog.

Before Samantha speaks, she goes through an internal modeling process:

```
<FEELINGS SIMULATION>
"I feel ..."
</FEELINGS SIMULATION>

<THOUGHT SIMULATION>
"I think ..."
</THOUGHT SIMULATION>

<MESSAGE WRITING>
"I will send the message ..."
</MESSAGE WRITING>

<SELF ANALYSIS>
"In retrospect, ..."
</SELF ANALYSIS>
```
which imbues the richness of dynamic emotions, internal dialog, and self reflection into her thinking. Additionally, the self analysis is then fed back into the subsequent internal dialog simulation. Here's an example of the process in action.

![img_1.png](img_1.png)

Samantha has a few tricks that I'll briefly mention:

1. GPT-3.5 has trouble remembering the simulation, so a rememberence is put in the system message to remind in a reduced token way
1. Open AI streaming is used, and the thoughts are parsed in real time to minimize latency

### SocialAGI library

Samantha is written with the [SocialAGI library](https://www.npmjs.com/package/socialagi), which you can easily use to get started on your own version of Samantha.

### Example integration

This repo has an example application of `socialagi` npm package: Samantha chat in a Next.js project. It requires one environment variable to be set
```bash
export OPENAI_API_KEY=your_api_key
```
After installing npm locally,
```bash
npm install
```
Then, run both the `socialagi` server
```bash
npm run socialagi
```
and the development server:
```bash
npm run dev
```

Now you should have a local copy of Samantha running at [http://localhost:3000](http://localhost:3000) - open with your browser to see the result.
