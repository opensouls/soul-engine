import OpenAI from "openai";
import { RequestOptions } from "openai/core"
import { ChatCompletionMessage, ChatCompletionMessageParam, CompletionCreateParamsNonStreaming } from "openai/resources/chat/completions"
import { SpanStatusCode, trace } from '@opentelemetry/api';
import {
  ChatMessage,
  ChatMessageRoleEnum,
  ExecutorResponse,
  FunctionCall,
  FunctionSpecification,
  LanguageModelProgramExecutor,
  LanguageModelProgramExecutorExecuteOptions,
  RequestOptionsStreaming,
} from "./index";
import { zodToSchema } from "./zodToSchema";
import { html } from "common-tags";
import { ReusableStream } from "./reusableStream";
import { backOff } from "exponential-backoff";

const MAX_RETRIES = 3;

const tracer = trace.getTracer(
  'open-souls-openai',
  '0.0.1',
);

export enum Model {
  GPT_4 = "gpt-4",
  GPT_4_preview = "gpt-4-1106-preview",
  GPT_3_5_turbo = "gpt-3.5-turbo",
  GPT_3_5_turbo_0613 = "gpt-3.5-turbo-0613",
  GPT_3_5_turbo_16k = "gpt-3.5-turbo-16k",
  GPT_3_5_turbo_preview = "gpt-3.5-turbo-1106",
}

type Config = ConstructorParameters<typeof OpenAI>[0];

type ChatCompletionParams =
  Partial<CompletionCreateParamsNonStreaming>

type DefaultCompletionParams = ChatCompletionParams & {
  model: Model | string;
};

enum FunctionCallErrorType {
  NoFunctionCall = "No function call was returned",
  FunctionNotFound = "No function by that name",
  InvalidJSON = "Invalid JSON",
  SchemaMismatch = "Schema mismatch",
}

interface FunctionCallError {
  type: FunctionCallErrorType;
  description: string
}

type ValidateFunctionCallResult =
  | { error: FunctionCallError; parsed?: never }
  | { error?: never; parsed: any };


interface RetryInformation {
  functionCall?: FunctionCall
  error: FunctionCallError;
  retryCount: number
}


export class OpenAILanguageProgramProcessor
  implements LanguageModelProgramExecutor {
  client: OpenAI;
  defaultCompletionParams: DefaultCompletionParams;
  defaultRequestOptions: RequestOptions;

  constructor(
    openAIConfig: Config = {},
    defaultCompletionParams: ChatCompletionParams = {},
    defaultRequestOptions: RequestOptions = {}
  ) {
    const defaultConfig = {
      dangerouslyAllowBrowser: !!process.env.DANGEROUSLY_ALLOW_OPENAI_BROWSER
    }
    this.client = new OpenAI({
      ...defaultConfig,
      ...openAIConfig,
    });
    this.defaultCompletionParams = {
      model: Model.GPT_3_5_turbo,
      ...defaultCompletionParams,
      stream: false,
    };
    this.defaultRequestOptions = {
      timeout: 10_000,
      ...defaultRequestOptions
    }
  }

  private validateFunctioncall(requestedFunction: LanguageModelProgramExecutorExecuteOptions["functionCall"], message: ChatCompletionMessage | undefined, functions: FunctionSpecification[]): ValidateFunctionCallResult {
    if (!requestedFunction) {
      return {
        parsed: message?.content
      }
    }
    const functionCall = message?.function_call;

    if (!functionCall) {
      return {
        error: {
          type: FunctionCallErrorType.NoFunctionCall,
          description: "No function was called",
        }
      }
    }

    const fn = functions.find((fn) => fn.name === functionCall.name);
    if (!fn) {
      return {
        error: {
          type: FunctionCallErrorType.FunctionNotFound,
          description: `No function by the name ${functionCall.name}. Valid function names are: ${functions.map((fn) => fn.name).join(", ")}`,
        }
      };
    }

    let jsonParsed = {};
    try {
      jsonParsed = JSON.parse(functionCall.arguments);
    } catch (err: any) {
      return {
        error: {
          type: FunctionCallErrorType.InvalidJSON,
          description: `Invalid JSON: ${err.message}`,
        }
      };
    }

    try {
      const zodParsed = fn.parameters.safeParse(jsonParsed);
      if (!zodParsed.success) {
        return {
          error: {
            type: FunctionCallErrorType.SchemaMismatch,
            description: `Schema mismatch: ${zodParsed.error.message}`,
          }
        };
      }

      return {
        parsed: zodParsed.data
      }
    } catch (err: any) {
      return {
        error: {
          type: FunctionCallErrorType.SchemaMismatch,
          description: `Schema mismatch: ${err.message}`,
        }
      };
    }
  }

  private streamingExecute<FunctionCallReturnType = undefined>(
    messages: ChatMessage[],
    completionParams: LanguageModelProgramExecutorExecuteOptions = {},
    functions: FunctionSpecification[] = [],
    requestOptions: RequestOptionsStreaming = { stream: true },
    retryError: RetryInformation | undefined = undefined
  ): Promise<{
    response: Promise<ExecutorResponse<FunctionCallReturnType>>,
    stream: AsyncIterable<string>,
  }> {
    return tracer.startActiveSpan('streamingExecute', async (span) => {
      try {
        const { functionCall, ...restRequestParams } = completionParams;

        const params = {
          ...this.defaultCompletionParams,
          ...restRequestParams,
          function_call: functionCall,
          messages: messages as ChatCompletionMessageParam[],
        }
        if (functions.length > 0) {
          params.functions = functions.map((fn) => {
            return {
              ...fn,
              parameters: zodToSchema(fn.parameters),
            };
          });
        }

        if (retryError) {
          if (retryError.retryCount >= MAX_RETRIES) {
            throw new Error(`Exceeded max retries of ${MAX_RETRIES} for error: ${JSON.stringify(retryError.error)}`);
          }
          span.setAttributes({
            "retry-attempt": retryError.retryCount + 1,
            "retry-error": JSON.stringify(retryError.error),
            "retry-function-call": JSON.stringify(retryError.functionCall),
          })

          params.messages = [
            ...params.messages,
            {
              role: ChatMessageRoleEnum.Assistant,
              content: "",
              function_call: retryError.functionCall,
            },
            {
              role: ChatMessageRoleEnum.User,
              content: html`
                Function call resulted in error: ${JSON.stringify(retryError.error)}
              `
            }
          ]
        }

        span.setAttributes({
          "params": JSON.stringify(params),
          "request-options": JSON.stringify(requestOptions || {}),
        });

        const stream = await backOff(() => {
          return this.client.chat.completions.create(
            { ...params, stream: true },
            {
              ...this.defaultRequestOptions,
              ...requestOptions,
            }
          )
        }, {
          maxDelay: 200,
          numOfAttempts: 3,
          retry: (e, attempt) => {
            console.error("error in open ai call", e, attempt)
            return true
          }
        })

        const _generateContent = async function* () {
          for await (const res of stream) {
            if (res.choices && res.choices.length > 0) {
              const message = res.choices[0].delta;
              if (message) {
                const data = {
                  content: message.content,
                  functionCall: message.function_call
                };
                yield data
              }
            }
          }
        }

        const reusableStream = new ReusableStream(_generateContent())

        const streamToText = async function* () {
          for await (const res of reusableStream.stream()) {
            yield res.content || res.functionCall?.arguments || "";
          }
        }

        const respFunction = async () => {
          let returnedFunctionallArguments = ""
          let content = ""
          for await (const res of reusableStream.stream()) {
            if (res.functionCall) {
              returnedFunctionallArguments += res.functionCall.arguments
            } else {
              content += res.content || ""
            }
          }

          let parsedFnCall: { name: string, arguments: string } | undefined = undefined

          if (functionCall && returnedFunctionallArguments) {
            if (typeof functionCall === "string") {
              console.error("string function call is unsupported")
              throw new Error('string function call is unsupported')
            }
            parsedFnCall = {
              ...functionCall,
              arguments: returnedFunctionallArguments
            }
          }

          span.setAttributes({
            "completion-content": content,
            "completion-function-call": JSON.stringify(returnedFunctionallArguments || "{}"),
          })

          const { error, parsed } = this.validateFunctioncall(functionCall, {
            content: content,
            function_call: parsedFnCall,
            role: ChatMessageRoleEnum.Assistant,
          }, functions);
          if (error) {
            console.error("error in execute", error)
            throw new Error('error in execute')
          }

          return {
            content: content,
            functionCall: parsedFnCall as (FunctionCall | undefined),
            parsedArguments: parsed as FunctionCallReturnType
          };
        }

        return {
          response: respFunction(),
          stream: streamToText(),
        };

      } catch (err: any) {
        span.recordException(err);
        console.error('error in execute', err);
        throw err;
      } finally {
        span.end();
      }
    })
  }

  async execute<FunctionCallReturnType = undefined>(
    messages: ChatMessage[],
    completionParams: LanguageModelProgramExecutorExecuteOptions = {},
    functions: FunctionSpecification[] = [],
    requestOptions: RequestOptions = {},
    retryError: RetryInformation | undefined = undefined
  ): Promise<any> {

    if (requestOptions.stream) {
      return this.streamingExecute<FunctionCallReturnType>(messages, completionParams, functions, { ...requestOptions, stream: true }, retryError)
    }

    return tracer.startActiveSpan('execute', async (span) => {
      try {
        const { functionCall, ...completionParamsWithoutFunctionCall } = completionParams;

        const params = {
          ...this.defaultCompletionParams,
          ...completionParamsWithoutFunctionCall,
          function_call: functionCall,
          messages: messages as ChatCompletionMessageParam[],
        }
        if (functions.length > 0) {
          params.functions = functions.map((fn) => {
            return {
              ...fn,
              parameters: zodToSchema(fn.parameters),
            };
          });
        }

        if (retryError) {
          if (retryError.retryCount >= MAX_RETRIES) {
            throw new Error(`Exceeded max retries of ${MAX_RETRIES} for error: ${JSON.stringify(retryError.error)}`);
          }
          span.setAttributes({
            "retry-attempt": retryError.retryCount + 1,
            "retry-error": JSON.stringify(retryError.error),
            "retry-function-call": JSON.stringify(retryError.functionCall),
          })

          params.messages = [
            ...params.messages,
            {
              role: ChatMessageRoleEnum.Assistant,
              content: "",
              function_call: retryError.functionCall,
            },
            {
              role: ChatMessageRoleEnum.User,
              content: html`
                Function call resulted in error: ${JSON.stringify(retryError.error)}
              `
            }
          ]
        }

        span.setAttributes({
          "params": JSON.stringify(params),
          "request-options": JSON.stringify(requestOptions || {}),
        });

        const res = await backOff(() => {
          return this.client.chat.completions.create(
            { ...params, stream: false },
            {
              ...this.defaultRequestOptions,
              ...requestOptions,
            }
          )
        }, {
          maxDelay: 200,
          numOfAttempts: 3,
          retry: (e, attempt) => {
            console.error("error in open ai call", e, attempt)
            return true
          }
        })

        span.setAttributes({
          "total-tokens": res.usage?.total_tokens || "?",
          "prompt-tokens": res.usage?.prompt_tokens || "?",
          "completion-tokens": res.usage?.completion_tokens || "?",
          "completion-content": res?.choices[0]?.message?.content || "?",
          "completion-function-call": JSON.stringify(res?.choices[0]?.message?.function_call || "{}"),
        })

        const { error, parsed } = this.validateFunctioncall(functionCall, res?.choices[0]?.message, functions);
        if (error) {
          if (retryError?.retryCount || 0 >= MAX_RETRIES) {
            throw new Error(`Exceeded max retries of ${MAX_RETRIES} for error: ${JSON.stringify(error)}`);
          }
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: JSON.stringify(error),
          });
          return this.execute(messages, completionParams, functions, requestOptions, {
            error: error,
            retryCount: retryError?.retryCount ?? 1,
            functionCall: res?.choices[0]?.message?.function_call,
          });
        }

        return {
          content: res?.choices[0]?.message?.content,
          functionCall: res?.choices[0]?.message?.function_call,
          parsedArguments: parsed as FunctionCallReturnType
        };
      } catch (err: any) {
        span.recordException(err);
        console.error('error in execute', err);
        throw err;
      } finally {
        span.end();
      }

    })

  }
}
