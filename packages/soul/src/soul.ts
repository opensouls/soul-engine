/* eslint-disable perfectionist/sort-object-types */

import { DeveloperDispatchedPerception, EventLogDoc, InteractionRequest, Json, SoulEnvironment, SoulEvent, SoulEventKinds, debugChatShape } from '@opensouls/core'
import { HocuspocusProvider, HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import { getYjsDoc, observeDeep, syncedStore } from "@syncedstore/core";
import { EventEmitter } from "eventemitter3";
import { v4 as uuidv4 } from 'uuid'

import { getConnectedWebsocket } from "./sockets/soul-engine-socket.js";
import { ContentStreamer } from "./content-streamer.js";
import { syncedEventStore } from "./event-log.js";
import { ToolHandler } from './tool-handler.js';
// syntactic sugar for listening to actions which tend to be in the past tense
// but allowing to listen to things like Action.SAYS
export enum Actions {
  SAYS = "says",
}

export type { InteractionRequest } from "@opensouls/core"

export enum Events {
  // this one is sent by the server
  newSoulEvent = "newSoulEvent",
  // this one is used by developers
  dispatchExternalPerception = "dispatchExternalPerception",
  compileError = "compileError",
  saveVersion = "saveVersion",
  revertDoc = "revertDoc",
  setEnvironment = "setEnvironment",

  // these two are not used on the server
  // @deprecated newPerception is deprecated, use newInteractionRequest
  newPerception = "newPerception",
  newInteractionRequest = "newInteractionRequest"
}

export interface SoulOpts {
  local?: boolean
  organization: string
  soulId?: string
  blueprint: string
  token?: string
  version?: string
  webSocket?: HocuspocusProviderWebsocket,
  environment?: SoulEnvironment,
  debug?: boolean
}

export function said(entity: string, content: string): DeveloperDispatchedPerception {
  return {
    action: "said",
    content,
    name: entity,
  }
}

/**
 * `ActionEvent` is designed to be isomorphic between streaming and non-streaming actions.
 * When an event is not streaming,
 * the `content` will be immediately available as a `Promise<string>`. The `stream`
 * will be an `AsyncIterable<string>` that yields a single value if the event
 * is not streaming, allowing for consistent handling of event data.
 * 
 * If the event *is* streaming then content will resolve when the stream is complete.
 */
export type ActionEvent = {
  content: () => Promise<string>
  isStreaming: boolean
  stream: () => AsyncIterable<string>
  action: string
  name?: string,
  _metadata: InteractionRequest['_metadata']
  _timestamp: InteractionRequest['_timestamp']

  // @deprecated perception is deprecated, use interactionRequest
  perception: InteractionRequest
  interactionRequest: InteractionRequest
}



export type SoulEvents = {
  [K in Actions]: (evt: ActionEvent) => void
} & {
  [key: string]: (evt: ActionEvent) => void
} & {
  // @deprecated newPerception is deprecated, use newInteractionRequest instead.
  newPerception: (evt: InteractionRequest) => void,
  newInteractionRequest: (evt: InteractionRequest) => void,
  newSoulEvent: (evt: SoulEvent) => void,
}

// polyfill the websocket for all versions of node, but not
// bun or the browser
function shouldPolyfillWebsocket() {
  // Check if the code is running in a browser environment
  const isBrowser = typeof window !== 'undefined';

  // If it's not in a browser environment and it's Node.js but not Bun, return true
  return !isBrowser && typeof process !== 'undefined' && process.versions && !process.versions.bun;
}

// eslint-disable-next-line unicorn/prefer-event-target
export class Soul extends EventEmitter<SoulEvents> {
  soulId

  private blueprint
  private connection?: Awaited<ReturnType<Soul["getProvider"]>>
  private debug
  private environment
  private errorHandler: (error: Error) => void
  private local: boolean
  private organizationSlug
  private selfCreatedWebsocket = false
  private token
  private version
  private toolHandler: ToolHandler
  
  private websocket?: HocuspocusProviderWebsocket

  constructor({
    debug,
    local,
    organization,
    soulId,
    blueprint,
    token,
    version,
    webSocket,
    environment
  }: SoulOpts) {
    super()
    if (debug && !token) {
      throw new Error("you must use a token to enable debug chat")
    }

    this.debug = debug
    this.environment = environment
    this.organizationSlug = organization
    this.blueprint = blueprint
    this.soulId = soulId || uuidv4()
    this.local = Boolean(local)
    this.token = token || "anonymous"
    this.version = version || "prod"
    if (webSocket) {
      this.websocket = webSocket
      this.connection = this.getProvider()
    }

    this.toolHandler = new ToolHandler(this)

    this.errorHandler = (error) => {
      console.warn("warning: error handler not registered. use onError() to catch errors.")
      throw error.message;
    }
  }

  get events() {
    if (!this.connection) {
      throw new Error("You must call start() before accessing events")
    }

    return this.connection.store.events
  }

  get store(): ReturnType<typeof syncedEventStore> {
    if (!this.connection) {
      throw new Error("You must call start() before accessing the store")
    }

    this.connection.store.pendingToolCalls ||= {}

    return this.connection.store
  }

  get connected() {
    return this.connection?.provider.isConnected
  }

  async connect(): Promise<string> {
    if (this.connection) {
      console.warn("connect() called twice on soul")
      return this.soulId
    }
    if (!this.websocket) {
      this.selfCreatedWebsocket = true
      const shouldPolyfill = shouldPolyfillWebsocket();
      // eslint-disable-next-line unicorn/no-typeof-undefined
      if (shouldPolyfill) {
        const { default: ws } = await import("ws");
        this.websocket = getConnectedWebsocket(this.organizationSlug, this.local, Boolean(this.debug), { WebSocketPolyfill: ws })
      } else {
        this.websocket = getConnectedWebsocket(this.organizationSlug, this.local, Boolean(this.debug))
      }
    }

    // we need to do this a 2nd time because of the await above in the this.websocket block
    if (this.connection) {
      console.warn("connect() called twice on soul")
      return this.soulId
    }

    this.connection = this.getProvider()
    if (this.debug) {
      console.log("CONNECTED TO SOUL. DEBUG HERE:", this.debugUrl())
    }

    this.toolHandler.start()

    return this.soulId
  }

  async disconnect() {
    if (!this.connection) {
      throw new Error("You must call start() before stopping")
    }

    this.toolHandler.stop()

    const { provider } = this.connection
    provider.destroy()
    // the provider does not destroy the websocket connection
    if (this.selfCreatedWebsocket) {
      provider.configuration.websocketProvider.destroy()
    }

    this.connection = undefined

    this.removeAllListeners()
  }

  async reset() {
    if (!this.connection) {
      throw new Error("You must call start() before stopping")
    }

    if (!this.debug) {
      throw new Error("You can only reset in debug mode")
    }

    const { provider } = this.connection
    provider.sendStateless(JSON.stringify({
      event: Events.revertDoc,
      data: {
        version: "initial",
      }
    }))
  }

  registerTool<Params = Json, Response = Json>(tool: string, handler: (params: Params) => Promise<Response>) {
    return this.toolHandler.registerTool(tool, handler)
  }

  async dispatch(perception: DeveloperDispatchedPerception) {
    if (!this.connection) {
      throw new Error("You must call start() before saying anything")
    }

    const { provider } = this.connection
    provider.sendStateless(JSON.stringify({
      event: Events.dispatchExternalPerception,
      data: {
        perception,
      }
    }))
  }

  onError(handler: (error: Error) => void) {
    this.errorHandler = handler
  }

  setEnvironment(environment: SoulEnvironment) {
    if (!this.connection) {
      throw new Error("You must call start() before setting environment")
    }

    this.environment = environment

    const { provider } = this.connection
    provider.sendStateless(JSON.stringify({
      event: Events.setEnvironment,
      data: {
        environment: this.environment,
      }
    }))
  }

  private actionEventFromInteractionRequest(interactionRequest: InteractionRequest): ActionEvent {
    const partialActionEvent = {
      name: interactionRequest.name,
      action: interactionRequest.action,
      _metadata: interactionRequest._metadata,
      _timestamp: interactionRequest._timestamp,

      // @perception is deprecated, use interactionRequest instead
      perception: interactionRequest,
      interactionRequest,
    }
    if (!interactionRequest._metadata?.streaming) {
      return {
        content: () => Promise.resolve(interactionRequest.content),
        async *stream() {
          yield interactionRequest.content
        },
        isStreaming: false,
        ...partialActionEvent,
      }
    }

    if (!this.connection) {
      throw new Error('received stateless event before connection was established')
    }

    if (!interactionRequest) {
      throw new Error("received a stateless message for an event that doesn't exist")
    }

    try {
      const streamer = new ContentStreamer()

      const streamCompletePromise = new Promise<void>((resolve) => {
        streamer.onComplete(resolve)
      })

      const disposer = observeDeep(interactionRequest, () => {
        streamer.updateContent(interactionRequest.content)
        if (interactionRequest._metadata?.streamComplete) {
          disposer()
          streamer.complete()
          return
        }
      })

      return {
        async content() {
          await streamCompletePromise
          return interactionRequest.content
        },
        stream() { return streamer.stream() },
        isStreaming: true,
        ...partialActionEvent,
      }
    } catch (error: any) {
      console.error("error setting up stream:", error)
      throw error
    }
  }

  private debugUrl() {
    const host = this.local ? "http://localhost:3000" : "https://souls.chat"
    return `${host}/chats/${this.organizationSlug}/${this.blueprint}/${this.soulId}`
  }

  private eventFromPayload(payload: string): { event: SoulEvent, eventType: string } {
    if (!this.connection) {
      throw new Error("You must call start() before handling messages")
    }

    const { data, event: eventType } = JSON.parse(payload) as { data: any, event: string }

    return {
      eventType,
      event: data,
    }
  }

  private getProvider() {
    if (!this.websocket) {
      throw new Error("you must specify a websocket before using getProvider. You can pass one, or start will handle it for you.")
    }

    const store = this.debug ? syncedStore(debugChatShape) :  syncedEventStore()

    const docName = this.debug ?
      `debug-chat.${this.organizationSlug}.${this.blueprint}.${this.soulId}` :
      `soul-session.${this.organizationSlug}.${this.blueprint}.${this.soulId}.${this.version}`

    const provider = new HocuspocusProvider({
      document: getYjsDoc(store),
      name: docName,
      async onAuthenticationFailed({ reason }) {
        console.error("authentication failed", reason)
      },
      onStateless: ({ payload }) => this.handleStatelessMessage(payload),
      token: this.token,
      websocketProvider: this.websocket,
    });

    provider.sendStateless(JSON.stringify({
      event: Events.setEnvironment,
      data: {
        environment: this.environment,
      }
    }))

    return {
      provider,
      store: this.debug ? (store as typeof debugChatShape).eventLog as EventLogDoc : (store as EventLogDoc),
    }
  }

  private async handleStatelessMessage(payload: string) {
    const { eventType, event: statelessEvent } = this.eventFromPayload(payload)
    if (eventType !== Events.newSoulEvent) {
      return // for now we only care about soul events
    }

    // first we will emit a SoulEvent so that the dev has full access to all the information
    // then we will emit a specific Perception that is more convenient for the dev to use
    // and also an action event which handles streaming for the developer.

    this.emit(Events.newSoulEvent, statelessEvent)

    if (statelessEvent._metadata?.type === "error") {
      const uncaughtError = new Error(statelessEvent.content);
      this.errorHandler(uncaughtError)
      return;
    }

    try {
      if (statelessEvent._kind !== SoulEventKinds.InteractionRequest) {
        return // we only want to emit events *from* the soul, not the user events.
      }

      const interactionRequest = statelessEvent as InteractionRequest

      if (!this.connection) {
        throw new Error("missing connection on handleStatelessMessage")
      }

      // now we want to get the auto-updating event from the actual document not the one broadcast stateless
      const event = this.connection.store.events.find((event) => event._id === statelessEvent._id)
      if (!event) {
        throw new Error("received stateless event without a corresponding event in the document")
      }

      this.emit(Events.newPerception, interactionRequest)
      // allow any custom actions to also have their content turned into a stream if desired by the developer.
      this.emit(event.action, this.actionEventFromInteractionRequest(event as InteractionRequest))

      return
    } catch (error) {
      console.error("error handling event:", error)
      throw error
    }
  }
}
