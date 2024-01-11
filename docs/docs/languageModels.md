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

Many Mistral and Together AI models work with this same interface, though we recommend only using their most intelligent models, e.g.
```typescript
const monologue = new CortexStep("Jonathan", {
  processor: new FunctionlessLLM({
  baseURL: "https://api.mistral.ai/v1/",
  singleSystemMessage: true,
  apiKey: "your_xyz_MISTRAL_API_KEY",
}, {
  model: "mistral-medium",
  temperature: 0.8,
  max_tokens: 300,
})
```
or
```typescript
processor: new FunctionlessLLM({
  baseURL: "https://api.together.xyz/v1",
  singleSystemMessage: true,
  apiKey: "your_xyz_TOGETHER_API_KEY",
}, {
  model: "NousResearch/Nous-Hermes-2-Yi-34B",
  temperature: 0.7,
  max_tokens: 300,
})
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
