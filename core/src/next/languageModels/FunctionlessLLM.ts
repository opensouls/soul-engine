import OpenAI from "openai";
import { RequestOptions } from "openai/core"
import { ChatCompletionMessage, CompletionCreateParamsNonStreaming } from "openai/resources/chat/completions"
import { SpanStatusCode, trace } from '@opentelemetry/api';
import {
  ChatMessage,
  ChatMessageRoleEnum,
  ExecutorResponse,
  FunctionCall,
  FunctionSpecification,
  LanguageModelProgramExecutor,
  LanguageModelProgramExecutorExecuteOptions,
} from "./index";
import { html } from "common-tags";
import zodToJsonSchema from "zod-to-json-schema";
import { Model } from "./openAI";

const MAX_RETRIES = 6;

const tracer = trace.getTracer(
  'open-souls-openai',
  '0.0.1',
);

type Config = ConstructorParameters<typeof OpenAI>[0] & { compressSystemMessages?: boolean };

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


export class FunctionlessLLM
  implements LanguageModelProgramExecutor {
  client: OpenAI;
  defaultCompletionParams: DefaultCompletionParams;
  defaultRequestOptions: RequestOptions;

  private compressSystemMessages = false

  constructor(
    openAIConfig: Config = {},
    defaultCompletionParams: ChatCompletionParams = {},
    defaultRequestOptions: RequestOptions = {}
  ) {
    const { compressSystemMessages, ...restConfig } = openAIConfig;
    this.compressSystemMessages = !!compressSystemMessages
    this.client = new OpenAI(restConfig);
    this.defaultCompletionParams = {
      model: Model.GPT_3_5_turbo,
      ...defaultCompletionParams,
      stream: false,
    };
    this.defaultRequestOptions = defaultRequestOptions || {}
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

  experimentalStreamingExecute<FunctionCallReturnType = undefined>(
    _messages: ChatMessage[],
    _completionParams: LanguageModelProgramExecutorExecuteOptions = {},
    _functions: FunctionSpecification[] = [],
    _requestOptions: RequestOptions = {},
    _retryError: RetryInformation | undefined = undefined
  ): Promise<{
    response: Promise<ExecutorResponse<FunctionCallReturnType>>,
    stream: AsyncIterable<string>,
  }> {
    return tracer.startActiveSpan('experimentalStreamingExecute', async (span) => {
      try {
        throw new Error("at this time, streaming is not supported in the OSS models")
      } catch (err: any) {
        span.recordException(err);
        console.error('error in execute', err);
        throw err;
      } finally {
        span.end();
      }
    })
  }

  async executeAlternativeFunctionPath<FunctionCallReturnType = undefined>(
    messages: ChatMessage[],
    completionParams: LanguageModelProgramExecutorExecuteOptions = {},
    functions: FunctionSpecification[] = [],
    requestOptions: RequestOptions = {},
    retryError: RetryInformation | undefined = undefined
  ): Promise<ExecutorResponse> {
    return tracer.startActiveSpan('alternative-function-path', async (span) => {
      const { functionCall, ...restRequestParams } = completionParams;
      if (!functionCall || functionCall === "auto" || functionCall === "none") {
        throw new Error("this path is only for actual function calls")
      }
  
      const params = {
        ...this.defaultCompletionParams,
        ...restRequestParams,
        messages: messages,
      }
  
      const fn = functions.find((fn) => fn.name === functionCall.name)
      if (!fn) {
        throw new Error("missing function")
      }
  
      // construct a message out of the function call instead
      const userMessageFromFunctionCall: ChatMessage = {
        role: ChatMessageRoleEnum.User,
        content: html`  
          I want to call a function called ${functionCall.name}. The function is described as ${fn.description}. The function takes a single JSON argument.

          Please think carefully about the argument I should call the function with and answer using only JSON that matches the following JSON Schema:
  
          ${JSON.stringify(zodToJsonSchema(fn.parameters), null, 2)}
  
          Remember, the above is a *schema* for the answer, not the answer itself.
  
          Only return properly conforming JSON and no other example code or commentary. You only speak JSON.
        `
      }
  
      params.messages = this.compressSystemMessagesIfNeeded([
        ...params.messages, 
        {
          role: ChatMessageRoleEnum.System,
          content: "You accept input in any format, but you only respond in JSON. Please conform your JSON responses to the provided schema."
        },
        userMessageFromFunctionCall
      ])

      span.setAttributes({
        "params": JSON.stringify(params),
        "request-options": JSON.stringify(requestOptions || {}),
      });

  
      const res = await this.client.chat.completions.create(
        { ...params, stream: false },
        {
          ...this.defaultRequestOptions,
          ...requestOptions,
        }
      );
  
      const content = res.choices[0].message.content
      const retMessage:ChatCompletionMessage = {
        role: ChatMessageRoleEnum.Assistant,
        content: "",
        function_call: {
          name: functionCall.name,
          arguments: content || ""
        }
      }
  
      const { error, parsed } = this.validateFunctioncall(functionCall, retMessage, functions);
      if (error) {
        console.warn("LLM returned invalid JSON, will retry")
        if (retryError?.retryCount || 0 >= MAX_RETRIES) {
          throw new Error(`Exceeded max retries of ${MAX_RETRIES} for error: ${JSON.stringify(error)}`);
        }
        return this.execute(messages, completionParams, functions, requestOptions, {
          error: error,
          retryCount: retryError?.retryCount ? retryError.retryCount + 1 : 1,
          functionCall: res?.choices[0]?.message?.function_call,
        });
      }
  
      return {
        content: res?.choices[0]?.message?.content,
        functionCall: retMessage.function_call,
        parsedArguments: parsed as FunctionCallReturnType
      };
    })
  
  }

  async execute<FunctionCallReturnType = undefined>(
    messages: ChatMessage[],
    completionParams: LanguageModelProgramExecutorExecuteOptions = {},
    functions: FunctionSpecification[] = [],
    requestOptions: RequestOptions = {},
    retryError: RetryInformation | undefined = undefined
  ): Promise<ExecutorResponse> {
    return tracer.startActiveSpan('execute', async (span) => {
      try {
        const { functionCall, ...restRequestParams } = completionParams;

        const params = {
          ...this.defaultCompletionParams,
          ...restRequestParams,
          function_call: functionCall,
          messages: messages,
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
              role: ChatMessageRoleEnum.User,
              content: html`
                The JSON you returned did not conform to the schema. The error was:
                ${JSON.stringify(retryError.error, null, 2)}

                Could you please correct the JSON you returned and conform to the schema? Remember you only answer in correctly formated JSON.
              `
            }
          ]
        }

        if (functions.length > 0) {
          return this.executeAlternativeFunctionPath(messages, completionParams, functions, requestOptions)
        }

        span.setAttributes({
          "params": JSON.stringify(params),
          "request-options": JSON.stringify(requestOptions || {}),
        });

        const res = await this.client.chat.completions.create(
          { ...params, messages: this.compressSystemMessagesIfNeeded(params.messages), stream: false },
          {
            ...this.defaultRequestOptions,
            ...requestOptions,
          }
        );

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

  private compressSystemMessagesIfNeeded(messages: ChatMessage[]): ChatMessage[] {
    if (!this.compressSystemMessages) {
      return messages
    }
    let systemMessage = ""
    const returnedMessages:ChatMessage[] = []
    messages.forEach((message) => {
      if (message.role === ChatMessageRoleEnum.System) {
        systemMessage += message.content
        return
      }
      returnedMessages.push(message)
    })
    return [
      {
        role: ChatMessageRoleEnum.System,
        content: systemMessage
      },
      ...returnedMessages
    ]
  }
}
