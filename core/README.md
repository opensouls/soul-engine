# 🤖+👱 SocialAGI

⚡ Simple, opinionated framework for creating AI souls ⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) ![Twitter](https://img.shields.io/twitter/url/https/twitter.com/socialagi.svg?style=social&label=Follow%20%40socialagi)](https://twitter.com/socialagi) [![](https://dcbadge.vercel.app/api/server/FCPcCUbw3p?compact=true&style=flat)](https://discord.gg/FCPcCUbw3p)

## Quick Install

```$ npm install socialagi```

then

```npm
import { Soul, Blueprints } from "socialagi";

const samantha = new Soul(Blueprints.SAMANTHA);

samantha.on("says", (text : String) => {
  console.log("\nSamantha says: ", text);
});

samantha.on("thinks", (text : String) => {
  console.log("\nSamantha thinks: ", text);
});

samantha.tell("Hi Samantha!)
```

## 🤔 What is this?

We aim to simplify the developer experience as much as possible in creating agentic chatbots called digital souls. Unlike traditional chatbots, digital souls have personality, drive, ego, and will. 

As you might imagine, there's a bunch of small complexities with developing digital souls, e.g. memory, internal dialog, conversational intricacies around multiple texting, etc. that shouldn't be the developer's focus. The developer should be free to think about the souls, their character, and what experiences interacting with them provides.

This library provides tools to easily sculpt digital souls.

## Features

- Flexible API for tuning the personality of digital souls
- Manages internal agentic thought processes
- Dialog intricacies like double texting automatically handled
- Automatic memory management

## Quick Start

The easiest way to get started developing with `socialagi` is to check out the [`/example-webapp`](https://github.com/opensouls/socialagi-ex-webapp)

# API

The core functionality in `socialagi` is to create a `new Soul()`. `Soul` is the primary class in the `socialagi` package, and is is designed to create unique, interactive, and engaging digital souls. This class helps you define your soul's personality and manage the interaction between your soul and other entities (like people).

## Soul class

The soul class takes a required soul `Blueprint`. Several example blueprints that work well are specified in `Blueprints`, and are recommended as templates.

```npm
const samantha = new Soul(Blueprints.SAMANTHA);
```

In this example, we created a new instance of a Soul with the personality "Samantha".

### Event Listeners

Outbound communication from the `Soul` occurs via events - this is the correct way to model human speach, where the `Soul` may in fact choose to speak on its own accord.  

Right now, there are two events exposed:

#### says

The `says` event is emitted whenever a soul has something to say. To listen for this event, add an event listener using the on method:

```npm
samantha.on("says", (text : String) => {
  console.log("\nSamantha says: ", text);
});
```

In this example, a callback function will be executed whenever the `says` event is emitted, displaying the souls's spoken text in the console.

#### thinks

In this example, a callback function will be executed whenever the `thinks` event is emitted, displaying the souls's internal monologue in the console. The entity's internal monologue is important to its cognitive functioning, however, is not critical to expose in an application.

```npm
samantha.on("thinks", (text : String) => {
  console.log("\nSamantha thinks: ", text);
});
```
In this example, a callback function will be executed whenever the thinks event is emitted, displaying the soul's thoughts in the console.


### Methods

#### tell
The tell method is used to send a message to the soul. It takes a string as input:

```npm
samantha.tell("Hi Samantha!");
```
In this example, we sent a message "Hi Samantha!" to the Soul instance with the Samantha personality. The instance will process the message and consider emitting corresponding says and/or thinks events, depending on the response.

#### reset
The reset method is used to clear the memory of the soul.

```npm
samantha.reset();
```

### Blueprint interface

Each soul requires a blueprint

```npm
const SAMANTHA: Blueprint = {
  name: string;
  essence: ShortStringDescription;
  personality?: LongStringDescription;
  initialPlan?: string;
  languageProcessor: LanguageProcessor;
}
```
definitely check out the examples for what quality descriptions of [blueprints](https://github.com/opensouls/SocialAGI/blob/main/core/src/blueprint.ts) look like. One important point to note is that the specific model is required to fix the personality.

#### Essence

Essence of the soul, e.g. "Samantha, An AI Kindred Spirit"

#### InitialPlan

Incept a first plan into the soul, e.g. "Say hello in a friendly manner"

#### LanguageProcessor

A `Blueprint` requires specification of a language processor. Currently, two are supported:

`LanguageProcess.gpt4` OpenAI GPT-4

`LanguageProcessor.GPT_3_5_turbo` OpenAI GPT-3.5-turbo

The api key is filled via environment variable `OPENAI_API_KEY`.

#### Thought Framework

SocialAGI supports an introspective thought framework. Thought frameworks markedly affect cognition and define a `Soul` processes their thoughts inbetween utterances.


The `Introspective` framework runs the following thought pattern

```
I feel ...
I want ...
<message formation>
[In retrospect,] I think ...
```

Introspection brings heavy focus on feelings and desire to drive agentic feeling dialog, and runs on both the GPT-3.5-turbo and GPT-4 language processors.

Note: the language processors interpret personality specifications totally differently.
