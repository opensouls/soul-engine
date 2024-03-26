import { HocuspocusProviderWebsocket, HocuspocusProviderWebsocketConfiguration } from "@hocuspocus/provider"

export const websocketUrl = (organizationSlug: string, local: boolean, debug: boolean) => {
  const urlpath = debug ? "debug-chat" : "experience"

  return local ?
    `ws://127.0.0.1:4000/${organizationSlug}/${urlpath}` :
    `wss://soul-engine-servers.fly.dev/${organizationSlug}/${urlpath}`
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
