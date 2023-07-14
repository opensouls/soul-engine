---
id: intro
sidebar_position: 1
---

# Introduction

Welcome to the **CortexScheduler** class, a core component of the SocialAGI project. 

CortexScheduler's primary responsibility is to orchestrate the flow of asynchronous 'mental processes' in response to world events in a way that's easy to understand, test, and reason about. `CortexScheduler` tackles this challenge by converting the event-driven model into a synchronous one, allowing developers to work with a more straightforward and predictable system.

For example, a scheduler can be used to route Discord client message events to the "SamanthaReplies" mental process: 
```javascript
// initialize scheduler
// ...
// define SamanthaReplies MentalProcess
// ...

discordClient.on('messageCreate', async message => {
  cortexScheduler.dispatch("SamanthaReplies", {
    role: "user",
    content: message.content,
    name: message.author.username
  });
})
```

From a technical standpoint, each **MentalProcess** like "SamanthaReplies", represents a sequence of transformations on the "working memory" of the system or [CortexStep](/CortexStep/intro).

In this context, the CortexScheduler ensures that each mental process operates in an isolated and deterministic manner. Instead of handling events as they occur, each process takes in a CortexStep, performs its task, and produces a new CortexStep, creating a pipeline of transformations that can be easily followed and debugged. 

By reducing the complexity associated with event-driven programming and providing a structured way to manage and track mental processes, CortexScheduler offers a valuable tool for managing event-driven agents, entities, and AI souls.

In the following sections, we'll dive deeper into how to use CortexScheduler, explore its API, and go through some practical examples to illustrate how it can simplify your work.
