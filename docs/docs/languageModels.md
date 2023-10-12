---
sidebar_position: 8
---

# Language Models

The SocialAGI library is written primarily to interface with GPT3.5 and GPT4 from OpenAI using the OpenAI chat interface. However, the library decouples the interfaces directly from the chat models with the `LanguageModelProgramExecutor` interface.

## Interfaces

So long as the following interfaces are implemented, there is no explicit OpenAI dependency.

```javascript
interface LanguageModelProgramExecutor {
  execute<FunctionCallReturnType = undefined>(
    records: ChatMessage[],
    chatCompletionParams?: LanguageModelProgramExecutorExecuteOptions,
    functions?: FunctionSpecification[],
    requestOptions?: RequestOptions,
  ): Promise<ExecutorResponse<FunctionCallReturnType>>;

  experimentalStreamingExecute?<FunctionCallReturnType = undefined>(
    messages: ChatMessage[],
    completionParams?: LanguageModelProgramExecutorExecuteOptions,
    functions?: FunctionSpecification[],
    requestOptions?: RequestOptions,
  ): Promise<{
    response: Promise<ExecutorResponse<FunctionCallReturnType>>,
    stream: AsyncIterable<string>,
  }>
}
```

## Alternative API calling

We also include a `FunctionlessLLM` `LanguageModelProgramExecutor` implementation that supports APIs with OpenAI chat API support (but does *not* require function calling support). This executor also supports calling APIs that do not allow more than one system message:

```typescript
  let step = new CortexStep("Jonathan", {
    processor: new FunctionlessLLM({
      baseURL: "http://localhost:1234/v1",
      compressSystemMessages: true,
    })
  });
```

### Example OpenAI completion engines

We provide methods to create an OpenAI version and specify the model:

```javascript
const executor = new OpenAILanguageProgramProcessor(
  {},
  {
    model: "gpt-3.5-turbo",
  },
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
