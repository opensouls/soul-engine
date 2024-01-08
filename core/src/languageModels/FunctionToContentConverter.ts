import { ChatMessage, ChatMessageRoleEnum, FunctionSpecification, LanguageModelProgramExecutor, LanguageModelProgramExecutorExecuteOptions } from ".";
import { RequestOptions } from "openai/core";
import { html } from "common-tags";
import zodToJsonSchema from "zod-to-json-schema";
import { backOff } from "exponential-backoff";
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer(
  'open-souls-function-to-content-converter',
  '0.0.1',
);

function extractJSON(str?: string | null) {
  if (!str) return null;

  const jsonStart = str.indexOf('{');
  if (jsonStart === -1) return null;
  
  for (let i = jsonStart; i < str.length; i++) {
      if (str[i] === '}') {
          const potentialJson = str.slice(jsonStart, i + 1);
          try {
              JSON.parse(potentialJson);
              return potentialJson;
          } catch (e) {
              // Not valid JSON
          }
      }
  }

  return null;
}

/**
 * Given a Langague Executor that takes an execute (but cannot handle OpeanAI function calls, use the generic language model chat to execute function calls).
 */
export class FunctionToContentConverter {
  constructor(private executor: LanguageModelProgramExecutor) {

  }

  async executeWithFunctionCall(
    messages: ChatMessage[],
    completionParams: LanguageModelProgramExecutorExecuteOptions,
    functions: FunctionSpecification[],
    requestOptions: RequestOptions,
  ): Promise<{
    content: string,
    functionCall: { name: string, arguments: string },
    parsedArguments: any,
  }> {
    return backOff(async () => {
      return tracer.startActiveSpan("executeWithFunctionCall", async (span) => {
        try {
          const { functionCall, ...completionParamsWithoutFunctionCall } = completionParams;
          if (!functionCall || functionCall === "auto" || functionCall === "none") {
            throw new Error("Function call must be specified on this code path")
          }
      
          const fn = functions.find((f) => f.name === functionCall.name)
          if (!fn) {
            throw new Error(`Function ${functionCall.name} not found`)
          }
      
          const newMessages = this.messagesWithJsonCommand(
            this.messagesWithFunctionCallInstruction(messages, fn)
          )

          span.setAttributes({
            "messages": JSON.stringify(newMessages),
          });
      
          const { response: responsePromise } = await this.executor.execute(newMessages, completionParamsWithoutFunctionCall, [], { ...requestOptions, stream: true })
      
          const response = await responsePromise

          span.setAttributes({
            "response": JSON.stringify(response),
          });
      
          const fnArg = extractJSON(response.content)
          if (!fnArg) {
            throw new Error(`Function argument not found in response ${response.content}`)
          }
      
          const parsed = fn.parameters.parse(JSON.parse(fnArg))

          span.setAttributes({
            "parsed": JSON.stringify(parsed),
            "function-args": fnArg,
          });
      
          span.end()
          
          return {
            content: "",
            functionCall: { name: functionCall.name, arguments: fnArg },
            parsedArguments: parsed,
          }
        } catch(err: any) {
          span.recordException(err);
          console.error("error in function call", err)
          span.end()
          throw err
        }
      })
    }, {
      numOfAttempts: 3,
      maxDelay: 200,
      retry(e, attemptNumber) {
        console.error("error in llm call", e, attemptNumber)
        return true
      },
    })
  }

  private messagesWithFunctionCallInstruction(
    messages: ChatMessage[],
    fn: FunctionSpecification
  ): ChatMessage[] {
     // construct a message out of the function call instead
     const userMessageFromFunctionCall: ChatMessage = {
      role: ChatMessageRoleEnum.User,
      content: html`  
        I want to call a function called "${fn.name}". The function is described as: "${fn.description}". The function takes a single JSON argument.

        Please think carefully about the argument I should call the function with and answer using only JSON that matches the following JSON Schema:

        ${JSON.stringify(zodToJsonSchema(fn.parameters), null, 2)}

        Remember, the above is a *schema* for the answer, not the answer itself.

        Only return properly conforming JSON and no other example code or commentary. You only speak JSON.
      `
    }

    return messages.concat([userMessageFromFunctionCall])
  }

  private messagesWithJsonCommand(messages: ChatMessage[]) {
    return messages.map((message, i) => {
      if (i === 0) {
        return {
          ...message,
          content: message.content + "\n\nIMPORTANT: You accept input in any format, but you only return properly formatted JSON in the specified JSON Schema. "
        }
      }
      return { ...message }
    })
  }

}