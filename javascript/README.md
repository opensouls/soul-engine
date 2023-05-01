## 🤖+👱 SocialAGI

⚡ Simple, opinionated framework for creating digital souls ⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) ![Twitter](https://img.shields.io/twitter/url/https/twitter.com/socialagi.svg?style=social&label=Follow%20%40socialagi)](https://twitter.com/socialagi) [![](https://dcbadge.vercel.app/api/server/Dx3FYccm?compact=true&style=flat)](https://discord.gg/Dx3FYccm)

### Quick Install

```$ yarn add socialagi```

then

```npm
import { Samantha } from "socialagi";


const samantha = new Samantha();

samantha.on("says", (text : String) => {
  console.log("\nSamantha says: ", text);
});

samantha.on("thinks", (text : String) => {
  console.log("\nSamantha thinks: ", text);
});

samantha.tell("Hi Samantha!)
```

### 🤔 What is this?

We aim to simplify the developer experience as much as possible in creating agentic chatbots called digital souls. Unlike traditional chatbots, digital souls have personality, drive, ego, and will. 

As you might imagine, there's a bunch of small complexities with developing digital souls, e.g. memory, internal dialog, conversational intricacies around multiple texting, etc. that shouldn't be the developer's focus. The developer should be free to think about the souls, their character, and what experiences interacting with them provides.

This library provides tools to easily sculpt digital souls.

### Features

- Flexible API for tuning the personality of digital souls
- Manages internal agentic thought processes
- Dialog intricacies like double texting automatically handled
- Automatic memory management

### Quick Start

TODO: The quickest way to get started with `socialagi` is to utilize the executable `create-socialagi-app`

### Documentation

TODO: lol