import OpenAI from "openai";
import { CompletionCreateParams } from "openai/dist/cjs/resources/chat";
import {
  ChatCompletionStreamer,
  ChatMessage,
  CreateChatCompletionParams,
  LanguageModelProgramExecutor,
} from ".";

export enum Model {
  GPT_4 = "gpt-4",
  GPT_3_5_turbo = "gpt-3.5-turbo",
  GPT_3_5_turbo_0613 = "gpt-3.5-turbo-0613",
  GPT_3_5_turbo_16k = "gpt-3.5-turbo-16k",
}

type Config = ConstructorParameters<typeof OpenAI>[0];

type StreamCompletionParams =
  Partial<CompletionCreateParams.CreateChatCompletionRequestStreaming>;

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
      model: Model.GPT_3_5_turbo_16k,
      stream: true,
      ...defaultParams,
    };
  }

  async create(opts: CreateChatCompletionParams) {
    const stream = await this.client.chat.completions.create({
      ...this.defaultParams,
      ...opts,
    });
    return {
      stream,
      abortController: stream.controller,
    };
  }
}

type ChatCompletionParams =
  Partial<CompletionCreateParams.CreateChatCompletionRequestNonStreaming>;

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
      model: Model.GPT_3_5_turbo_16k,
      ...defaultParams,
      stream: false,
    };
  }

  async execute(messages: ChatMessage[]): Promise<string> {
    const res = await this.client.chat.completions.create({
      ...this.defaultParams,
      messages: messages,
    });
    return res?.choices[0]?.message?.content || "";
  }
}
