---
sidebar_position: 8
---

# Language Models

The SocialAGI library is written primarily to interface with GPT3.5 and GPT4 from OpenAI using the OpenAI chat interface. However, the library decouples the interfaces directly from the chat models with the `LanguageModelProgramExecutor` and `ChatCompletionStreamer` interfaces. 

## Interfaces

So long as the following interfaces are implemented, there is no explicit OpenAI dependency.

### Streaming chat completion interface

```javascript
/**
 * Stream the results of a chat completion, returning a stream of deltas
 */
interface ChatCompletionStreamer {
  create: (opts: CreateChatCompletionParams) => Promise<{
    abortController: AbortController,
    stream: ChatStream
  }>,
}
```

### Executor chat completion interface

```javascript
/**
 * Execute a language model program and get the results as a string (non-streaming)
 */
interface LanguageModelProgramExecutor {
  execute(
    records: ChatMessage[],
    requestParams?: LanguageModelProgramExecutorExecuteOptions
  ): Promise<string>;
}
```

### Example OpenAI completion engines

We provide methods to create OpenAI versions of each:

```javascript
const streamer = new OpenAIStreamingChat(
  {},
  {
    model: "gpt-3.5-turbo",
  }
);
```
and
```javascript
const executor = new OpenAILanguageProgramProcessor(
  {},
  {
    model: "gpt-3.5-turbo",
  }
);
```

## Next.js edge functions

SocialAGI supports cognitive processing in the frontend through Next.js edge function support. In this paradigm, the executor and/or streamers are implemented via calls to Next.js edge functions. This requires a few pieces to setup:

`api/lmExecutor` endpoint, configured with

```javascript
module.exports = createOpenAIExecutorHandler(Model.GPT_3_5_turbo_16k);
```

and/or

`api/lmStreamer` endpoint, configured with

```javascript
module.exports = createOpenAIStreamHandler(Model.GPT_3_5_turbo_16k);
```

Then, the executor and streamer respectively are instantiated in the frontend via:

```javascript
const streamer = createChatCompletionStreamer("/api/lmStreamer");
const executor = createChatCompletionExecutor("/api/lmExecutor");
```

A complete running example using this paradigm can be found in this [example SocialAGI web project](https://github.com/opensouls/socialagi-ex-webapp/tree/ede679932649b8f1f6704ac70218826d03b69af7).

Similar paradigms could be extended to other frontend/web request frameworks than Next.js edge functions.