---
id: api
sidebar_position: 2
---

# Core API

`CortexScheduler` is a key class within the SocialAGI library. It operates as a task or **MentalProcess** manager for an AI, overseeing a collection of mental processes or "jobs", and determining their order of execution.

Adhering to the principles of concurrency control, `CortexScheduler` ensures that no two jobs interfere with each other, providing a seamless and safe task management mechanism.

## Key Concepts and Methods

1. **Initialization of `CortexScheduler`**

   Initialize `CortexScheduler` by providing an initial `CortexStep`. If you want to customize job ordering, you can optionally supply a `QueuingStrategy`.

   ```javascript
   const cortexScheduler = new CortexScheduler(firstStep);
   // Or with a custom QueuingStrategy
   const cortexScheduler = new CortexScheduler(firstStep, {
     queuingStrategy: customQueuingStrategy,
   });
   ```

2. **Registration of Mental Processes with `register()`**

   Use the `register()` method to add a new mental process. It requires a `ProcessConfig` object that includes the process `name` and the `process` function.

   ```javascript
   cortexScheduler.register({
     name: "ProcessName",
     process: async (signal, newMemory, lastStep) => {
       // Implement your process here
     },
   });
   ```

3. **Execution of a Mental Process via `dispatch()`**

   The `dispatch()` method schedules a registered mental process to be executed when resources are next available. It takes the process `name` and a `newMemory` object as parameters. The `newMemory` object is a `ChatMessage` type, representing the current user message or a system-generated message. The method returns a `Promise` that resolves when the job is complete.

   ```javascript
   // newMemory is of type ChatMessage
   const newMemory = { role: "user", content: "Hello, AI!" };
   cortexScheduler
     .dispatch("ProcessName", newMemory)
     .then(() => {
       // Actions to perform after the job is done
     })
     .catch((error) => {
       // Error handling
     });
   ```

## Queuing Strategy

`CortexScheduler` uses a default queuing strategy that adds new jobs to the end of the job queue. To employ a custom strategy, supply a `QueuingStrategy` function during initialization. This function dictates the placement of a new job in the queue, taking into account the current job and the existing queue.

```javascript
const customQueuingStrategy = (currentJob, queue, newJob) => {
  // Define your custom queuing strategy
};

const cortexScheduler = new CortexScheduler(firstStep, {
  queuingStrategy: customQueuingStrategy,
});
```

## Managing Jobs

In the `CortexScheduler` context, each mental process is a job. The scheduler manages these jobs according to the queuing strategy, ensuring their orderly execution. This offers an efficient way to control multiple mental processes in AI applications.
