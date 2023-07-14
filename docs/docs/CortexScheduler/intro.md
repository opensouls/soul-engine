---
id: intro
sidebar_position: 1
---

# Introduction

Welcome to the **CortexScheduler** class, a core component of the SocialAGI project. 

CortexScheduler's primary responsibility is to orchestrate the flow of asynchronous 'mental processes' in a way that's easy to understand, test, and reason about. If you're familiar with event-driven programming, you'll know that handling asynchronous events can lead to complex code paths that are difficult to debug and maintain. `CortexScheduler` tackles this challenge by converting the event-driven model into a synchronous one, allowing developers to work with a more straightforward and predictable system.

In the context of the SocialAGI project, each mental process is represented as a sequence of transformations on a [CortexStep](/CortexStep/intro). A CortexStep encapsulates the current state of an agentic monologue, storing memories (represented as chat messages) and other relevant information. Each mental process takes in a CortexStep and is expected to perform a series of transformations and return a new CortexStep. This flow is managed and coordinated by `CortexScheduler`.

By doing so, CortexScheduler ensures that each mental process operates in an isolated and deterministic manner. Instead of handling events as they occur, each process takes in a CortexStep, performs its task, and produces a new CortexStep, creating a pipeline of transformations that can be easily followed and debugged. 

By reducing the complexity associated with event-driven programming and providing a structured way to manage and track mental processes, CortexScheduler offers a valuable tool for developers working on the SocialAGI project or any project that could benefit from a more orderly handling of asynchronous tasks.

In the following sections, we'll dive deeper into how to use CortexScheduler, explore its API, and go through some practical examples to illustrate how it can simplify your work.
