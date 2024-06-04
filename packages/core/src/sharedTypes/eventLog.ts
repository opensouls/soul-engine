export enum SoulEventKinds {
  Perception = "perception",
  InteractionRequest = "interactionRequest",
  System = "system",
}

export type Json =
  | { [key: string]: Json | undefined }
  | Json[]
  | boolean
  | null
  | number
  | string
  | undefined

export interface SoulEvent {
  _id: string
  _kind: SoulEventKinds
  _timestamp: number // miliseconds since epoch
  _metadata?: Record<string, Json>
  _pending?: boolean
  internal?: boolean
  _mentalProcess?: {
    name: string
    params: Json
  }

  action: string
  content: string
  name?: string,
}

export interface PerceptionBase extends SoulEvent {
  _kind: SoulEventKinds.Perception
}

export interface ExternalPerception extends PerceptionBase {
  internal?: false,
}

export interface InternalPerception extends PerceptionBase {
  internal: true,
  /**
   * @deprecated - premonition is deprecated, adjust your perception instead.
   */
  premonition?: string,
}

export type Perception = ExternalPerception | InternalPerception

export type DeveloperDispatchedPerception = Omit<ExternalPerception, "_id" | "_kind" | "_timestamp">

export interface InteractionRequest extends SoulEvent {
  _kind: SoulEventKinds.InteractionRequest
}

// this is what the developer is actually sending, the missing fields get filled in by the system.
export type DeveloperInteractionRequest = Omit<InteractionRequest, "_id" | "_kind" | "_timestamp" | "content" | "internal"> & {
  content: AsyncIterable<string> | string
}

export interface SystemEvent extends SoulEvent {
  _kind: SoulEventKinds.System
}

export type SoulEnvironment = Record<string, Json> | undefined


export interface JsonRPCCall {
  id: string
  method: string
  params: any
}

export interface SuccessfulJsonRPCResponse {
  id: string
  result: Json
}

export interface ErroredJsonRPCResponse {
  id: string
  error: {
    code: number
    message: string
    data?: Json
  }
}

export type JsonRPCResponse = SuccessfulJsonRPCResponse | ErroredJsonRPCResponse

export interface JsonRPCPair {
  request: JsonRPCCall
  response?: JsonRPCResponse
}

export interface EventLogMetadata {
  id: string,
  blueprint?: string,
  environment?: SoulEnvironment,
}

export const eventLogShape = {
  events: [] as SoulEvent[],
  metadata: {} as EventLogMetadata,
  pendingToolCalls: {} as Record<string, JsonRPCPair>
}

export type EventLogDoc = typeof eventLogShape

export const debugChatShape = {
  metadata: {},
  state: {},
  eventLog: {} as EventLogDoc,
}
