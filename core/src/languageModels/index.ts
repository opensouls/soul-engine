import { ZodSchema } from "zod";

export { OpenAILanguageProgramProcessor } from "./openAI";
export { FunctionlessLLM } from "./old_FunctionlessLLM";

export interface LanguageModelProgramExecutorExecuteOptions {
  stop?: string;
  functionCall?: "none" | "auto" | { name: string };
  model?: string;
}

export interface ExecutorResponse<FunctionCallArgumentsType = any> {
  content?: string | null;
  functionCall?: FunctionCall;
  parsedArguments?: FunctionCallArgumentsType;
}

export type Headers = Record<string, string | null | undefined>;

export interface RequestOptions {
  signal?: AbortSignal | null;
  headers?: Headers;
  stream?: boolean;
  timeout?: number;
}
  
export interface RequestOptionsStreaming extends RequestOptions {
  stream: true;
}

export interface RequestOptionsNonStreaming extends RequestOptions {
  stream?: false;
}

export type NonStreamingExecuteResponse<FunctionCallReturnType = undefined> = ExecutorResponse<FunctionCallReturnType>
export type StreamingExecuteResponse<FunctionCallReturnType = undefined> =  {
  response: Promise<ExecutorResponse<FunctionCallReturnType>>,
  stream: AsyncIterable<string>,
}

/**
 * Execute a language model program and get the results as a string (non-streaming)
 */
export interface LanguageModelProgramExecutor {
  execute<FunctionCallReturnType = undefined>(
    records: ChatMessage[],
    chatCompletionParams?: LanguageModelProgramExecutorExecuteOptions,
    functions?: FunctionSpecification[],
    requestOptions?: RequestOptionsNonStreaming,
  ): Promise<NonStreamingExecuteResponse<FunctionCallReturnType>>;
  
  execute<FunctionCallReturnType = undefined>(
    records: ChatMessage[],
    chatCompletionParams?: LanguageModelProgramExecutorExecuteOptions,
    functions?: FunctionSpecification[],
    requestOptions?: RequestOptionsStreaming,
  ): Promise<StreamingExecuteResponse<FunctionCallReturnType>>;
}

/**
 * The below is mostly taken directly from the OpenAI types, but the idea is to keep these
 * stable between different LLMs and between different OpenAI versions.
 */
export enum ChatMessageRoleEnum {
  System = "system",
  User = "user",
  Assistant = "assistant",
  Function = "function",
}

export interface ChatMessage {
  role: ChatMessageRoleEnum;
  content: string;
  name?: string;
  function_call?: FunctionCall;
}

export interface FunctionSpecification<ArgumentType = any> {
  /**
   * The name of the function to be called. Must be a-z, A-Z, 0-9, or contain
   * underscores and dashes, with a maximum length of 64.
   */
  name: string;

  /**
   * The description of what the function does.
   */
  description?: string;

  /**
.  * The parameters the function takes, these are specified in zod format so that the output can be validated by the language program executor.
   */
  parameters: ZodSchema<ArgumentType>;
}

export interface FunctionCall {
  /**
   * The arguments to call the function with, as generated by the model in JSON
   * format. Note that the model does not always generate valid JSON, and may
   * hallucinate parameters not defined by your function schema. Validate the
   * arguments in your code before calling your function.
   */
  arguments: string;

  /**
   * The name of the function to call.
   */
  name: string;
}
