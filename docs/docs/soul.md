---
id: Soul
sidebar_position: 6
---

# Soul

Welcome to the documentation for the **Soul** class, a core component of the SocialAGI project. The `Soul` class is designed to create unique, interactive, and engaging digital entities, referred to as "souls". These souls are designed to easily encapsulate personality, drive, ego, and will 'Out of the box', making it easy to create an incredibly engaging AI entity.

> Note: This class specifically is designed with the intention of being easier to create an engaging AI entity. Currently, the class is not compatible with [CortexStep](/CortexStep/intro) or [CortexScheduler](/CortexScheduler/intro), but these will be integrated in the future, so one can get started with the Soul class and continue to add functionality in an extensible way. 

## Overview

The `Soul` class is an event-driven interface for creating, managing, and interacting with digital souls.

Here is a basic example of how to use the `Soul` class:

```typescript
import { Soul } from 'socialagi';

// Define the options for the soul
let blueprint = {
  name: "Sam",
  essence: "A friendly AI",
  personality: "A super friendly AI!",
  initialPlan: "Say hello",
  languageProcessor: LanguageProcessor.GPT_3_5_turbo,
};

// Create a new soul
const sam = new Soul(blueprint);

// Whenever the soul has something to say in response, console log it
const printSoulMessage = (text) => console.log(text)
sam.on("says", printSoulMessage)

// Tell a message to the soul
sam.tell("Hi!");
```

## Web (Next.js) integration

We make it incredibly easy to get started adding a soul to a web-app through Next.js integration through Next.js integration. First, simply use the React hook
```javascript
import { useSoul, Blueprints } from "socialagi";

...

const { tellSoul, messages, soulThoughts } = useSoul({
  blueprint: Blueprints.SAMANTHA,
});
```
which runs the Soul in browser. The `tellSoul(text)` method sends a new message to the soul, which is added to the messages React state as `{sender: "user", text, timestamp}`. When the Soul responds, then new messages are added with `sender='soul'`.

Behind the scenes, the `tellSoul` hook creates a soul which requires the existence of two api endpoints: `api/lmExecutor` and `api/lmStreamer`. Details on these endpoints can be found [here](/languageModels#nextjs-edge-functions).

## 'Out of the box'

Out of the box, the `Soul` class takes a personality and then provides:

1. Basic cognitive modeling, imparting intentionality to dialog through an introspective thought sequence that models feelings, thoughts, and reflections
1. Possibility to ramble on each message, with the decision defered to the Soul itself
1. Management of multiple inbound texting in a human-like way
1. Outbound message splitting for more human-like interactions
1. Management of multiple conversations
1. Distilled memory per user across multiple conversations, even in a group context