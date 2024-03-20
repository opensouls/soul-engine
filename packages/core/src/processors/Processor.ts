import { ZodSchema } from "zod"
import { ChatMessageContent, ChatMessageRoleEnum, ContentText, WorkingMemory } from "../WorkingMemory.js"
import { codeBlock } from "common-tags"

export interface UsageNumbers {
  model: string,
  input: number,
  output: number
}

export interface ProcessResponse<SchemaType = string> {
  rawCompletion: Promise<string>
  parsed: Promise<SchemaType>
  stream: AsyncIterable<string>
  usage: Promise<UsageNumbers>
}

export type Headers = Record<string, string | null | undefined>;

export interface RequestOptions {
  model?: string
  maxTokens?: number

  signal?: AbortSignal
  tags?: Record<string, string>
  timeout?: number;
  headers?: Headers;
  additionalRequestOptions?: Record<string, any>
}

export interface ProcessOpts<SchemaType = string> extends RequestOptions {
  memory: WorkingMemory,
  schema?: ZodSchema<SchemaType>
}

export interface Processor {
  process<SchemaType = string>(opts: ProcessOpts<SchemaType>): Promise<ProcessResponse<SchemaType>>
}

export interface ProcessorCreationOpts {
  //todo
}
export type ProcessorFactory = (opts?: ProcessorCreationOpts) => Processor


const textFromContent = (content: ChatMessageContent) => {
  if (typeof content === "string") {
    return content
  }
  const textContent = content.find((c) => c.type === "text") as ContentText | undefined
  if (!textContent) {
    return ""
  }
  return textContent.text
}

const JSON_MESSAGE = "You only speak JSON. Respond only with JSON properly conforming to the provided schema, with no other content."

export const prepareMemoryForJSON = (workingMemory: WorkingMemory, jsonMessage = JSON_MESSAGE) => {
  // get the system memory
  const systemMem = workingMemory.find((memory) => memory.role === ChatMessageRoleEnum.System)
  if (systemMem && textFromContent(systemMem.content).includes("JSON")) {
    return workingMemory
  }

  if (systemMem) {
    return workingMemory.map((memory) => {
      if (memory._id === systemMem._id) {
        return {
          ...memory,
          content: systemMem.content + " \n\n " + jsonMessage,
        }
      }
      return memory 
    })
  }

  // no system message, prepend
  return workingMemory.prepend([{
    role: ChatMessageRoleEnum.System,
    content: jsonMessage
  }])
}


export function extractJSON(str?: string | null) {
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
