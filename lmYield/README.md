# 🤖+👱 @socialagi/lmyield

⚡ Lightweight  ⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) ![Twitter](https://img.shields.io/twitter/url/https/twitter.com/socialagi.svg?style=social&label=Follow%20%40socialagi)](https://twitter.com/socialagi) [![](https://dcbadge.vercel.app/api/server/FCPcCUbw3p?compact=true&style=flat)](https://discord.gg/FCPcCUbw3p)

## 🤔 What is this?

LMYield enables you to control OpenAI's Chat API generations into arbitrary output schema.

Features:

 - [x] Simple, intuitive syntax, based on Handlebars templating.
 - [x] Rich output structure with multiple generations.
 - [x] Javascript not python

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

## Features

- Flexible API for tuning the personality of digital souls
- Manages internal agentic thought processes
- Dialog intricacies like double texting automatically handled
- Automatic memory management

## Quick Start

We provide a simple way to create a server that hosts a `socialagi` digital soul like `samantha` - check out the [`create-socialagi-server` NPM package](https://www.npmjs.com/package/create-socialagi-server)

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
  thoughtFramework?: ThoughtFramework;
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

SocialAGI supports different thought frameworks. Thought frameworks markedly affect cognition and define a `Soul` processes their thoughts inbetween utterances. SocialAGI currently supports two frameworks.

(1) `ThoughtFramework.Introspective`

The `Introspective` framework runs the following thought pattern

```
I feel ...
I want ...
<message formation>
[In retrospect,] I think ...
```

Introspection brings heavy focus on feelings and desire to drive agentic feeling dialog, and runs on both the GPT-3.5-turbo and GPT-4 language processors.

Note: the language processors interpret personality specifications totally differently.

(2) `ThoughtFramework.ReflectiveLP`

The `ReflectiveLP` framework runs the following thought pattern

```
I feel ...
I recall ...
I think ...
<message formation>
In retropsect, ...
I plan ...
```

ReflectiveLP only works with the GPT-4 language processor (currently), with the recall stage recurrently recalling prior plans. This yields a high degree of ability to attribute mental states and theory of mind to the conversant. 

TODO: add paper link

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

/*

The lmYield parses an lmProgram, all its features are shown below.

const lmYield = lmYield(`
{{#context~}}
{{! this block compiles to system in oai}}

{{personality}}

...
{{~/context}

{{#human~ name='xyz'}}
{{! this block compiles to user in oai}}
...
{{~/human}}

{{#generated~}}
{{! this block compiles to system in assistant in oai and must be last}}
...
{{~/generated}}

{{#instructions~}}
{{! this optional block currently compiles to system in assistant in oai and must before the generated block}}
...
{{~/instructions}}

{{#yield~}}
{{! this block compiles to system in assistant in oai and must be last}}
<FEELS>I feel {{gen 'feeling' until '</FEELS>'}}
...
{{~/yield}}
`)

 */