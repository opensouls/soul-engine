---
id: examples
sidebar_position: 3
---

# Learn by Example

Let's review a simple example of using the **CortexScheduler** to help orchestrate calls to a discord bot. Here, we register the "SamanthaReplies" mental process with the scheduler, along with a memory initialization.

```javascript
import { CortexStep, CortexScheduler } from "socialagi/next";

const samanthaReplies = async (signal, newMemory, lastStep) => {
  let step = lastStep;
  step = step.withMemory([newMemory]);
  const shouts = await step.next(externalDialog("shouts in all caps"));
  console.log("Samantha says: ", shouts.value);
  return shouts;
};
const samanthaRepliesConfig = {
  name: "SamanthaReplies",
  process: samanthaReplies,
};

const abortQueuingStrategy = (currentJob:any, queue:any, newJob:any) => {
  currentJob?.abortController?.abort();
  return [newJob];
};

const initialMemories = [
  {
    role: "system",
    content: "You are modeling the mind of Samantha"
  },
];
let firstStep = new CortexStep("Samantha");
firstStep = firstStep.withMemory(initialMemories);
const cortex = new CortexScheduler(firstStep, {
  queuingStrategy: abortQueuingStrategy,
});
cortex.register(samanthaRepliesConfig);
```

Now, we have a scheduler that can dispatch events to the 'SamanthaReplies' mental process.

```javascript
// ...

discordClient.on("messageCreate", async (message) => {
  cortex.dispatch("SamanthaReplies", {
    role: "user",
    content: message.content,
    name: message.author.username,
  });
});
```

## "Double texting"

Mimicking human-like interaction in texting systems like Discord requires handling "double texting", where multiple texts are sent in quick succession to the AI entity. A default strategy of simply processing each one individually results in relatively dumb-sounding entities. Here's a way we can address this with a simple abort queuing strategy after receiving multiple texts.

```javascript
const SamanthaReplies = async (signal, newMemory, lastStep) => {
  let step = lastStep;
  step = step.withMemory([newMemory]);
  const shouts = await step.next(externalDialog("shouts in all caps"));
  if (signal.aborted) {
    return step;
  } else {
    console.log("Samantha says: ", shouts.value);
    return shouts;
  }
};
const abortQueuingStrategy = (currentJob, queue, newJob) => {
  currentJob?.abortController?.abort();
  return [newJob];
};
const cortex = new CortexScheduler(firstStep, {
  queuingStrategy: abortQueuingStrategy,
});
```

Now, this could be made further more realistic yet by modeling a random process (or even based on a LLM call) that decides to proceed or not.
