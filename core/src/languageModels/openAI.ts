import OpenAI from "openai";
import { CompletionCreateParamsStreaming, CompletionCreateParamsNonStreaming, ChatCompletionMessageParam } from "openai/resources/chat/completions"
import {
  ChatCompletionStreamer,
  ChatMessage,
  ChatStream,
  CreateChatCompletionParams,
  ExecutorResponse,
  FunctionSpecification,
  LanguageModelProgramExecutor,
  LanguageModelProgramExecutorExecuteOptions,
} from ".";

export enum Model {
  GPT_4 = "gpt-4",
  GPT_3_5_turbo = "gpt-3.5-turbo",
  GPT_3_5_turbo_0613 = "gpt-3.5-turbo-0613",
  GPT_3_5_turbo_16k = "gpt-3.5-turbo-16k",
}

type Config = ConstructorParameters<typeof OpenAI>[0];

type StreamCompletionParams =
  Partial<CompletionCreateParamsStreaming>


type DefaultStreamParams = StreamCompletionParams & {
  model: Model | string;
  stream: true;
};

export class OpenAIStreamingChat implements ChatCompletionStreamer {
  client: OpenAI;
  defaultParams: DefaultStreamParams;

  constructor(
    openAIConfig: Config = {},
    defaultParams: StreamCompletionParams = {}
  ) {
    this.client = new OpenAI(openAIConfig);
    this.defaultParams = {
      model: Model.GPT_3_5_turbo,
      ...defaultParams,
      stream: true
    };
  }

  async create(opts: CreateChatCompletionParams): Promise<{stream: ChatStream, abortController: AbortController}> {
    const params: CompletionCreateParamsStreaming = 
    {
      ...this.defaultParams,
      ...opts,
      messages: opts.messages as ChatCompletionMessageParam[],
      stream: true,
    }
    const stream = await this.client.chat.completions.create(params);
    return {
      stream,
      abortController: stream.controller,
    };
  }
}

type ChatCompletionParams =
  Partial<CompletionCreateParamsNonStreaming>;

type DefaultCompletionParams = ChatCompletionParams & {
  model: Model | string;
};

export class OpenAILanguageProgramProcessor
  implements LanguageModelProgramExecutor
{
  client: OpenAI;
  defaultParams: DefaultCompletionParams;

  constructor(
    openAIConfig: Config = {},
    defaultParams: ChatCompletionParams = {}
  ) {
    this.client = new OpenAI(openAIConfig);
    this.defaultParams = {
      model: Model.GPT_3_5_turbo,
      ...defaultParams,
      stream: false,
    };
  }

  async execute(
    messages: ChatMessage[],
    requestParams: LanguageModelProgramExecutorExecuteOptions = {},
    functions: FunctionSpecification[] = [],
  ): Promise<ExecutorResponse> {
    const { functionCall, ...restRequestParams } = requestParams;

    const params = {
      ...this.defaultParams,
      ...restRequestParams,
      function_call: functionCall,
      messages: messages as ChatCompletionMessageParam[],
      functions: (functions.length > 0 ? functions : undefined),
      stream :false,
    }
    const res = await this.client.chat.completions.create({...params, stream: false});
    return {
      content: res?.choices[0]?.message?.content,
      functionCall: res?.choices[0]?.message?.function_call,
    };
  }
}
