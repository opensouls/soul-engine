import { HocuspocusProviderWebsocket, HocuspocusProviderWebsocketConfiguration } from "@hocuspocus/provider"

export const websocketUrl = (organizationSlug: string, local: boolean, debug: boolean) => {
  const urlpath = debug ? "debug-chat" : "experience"

  return local ?
    `ws://localhost:4000/${organizationSlug}/${urlpath}` :
    `wss://servers.souls.chat/${organizationSlug}/${urlpath}`
}

export const getConnectedWebsocket = (
  organizationSlug: string,
  local: boolean,
  debug: boolean, 
  opts: Partial<HocuspocusProviderWebsocketConfiguration> = {}
) => new HocuspocusProviderWebsocket({
    url: websocketUrl(organizationSlug, local, debug),
    ...opts,
  })
