import { HocuspocusProviderWebsocket } from "@hocuspocus/provider";
export const websocketUrl = (organizationSlug, local, debug) => {
    const urlpath = debug ? "debug-chat" : "experience";
    return local ?
        `ws://127.0.0.1:4000/${organizationSlug}/${urlpath}` :
        `wss://soul-engine-servers.fly.dev/${organizationSlug}/${urlpath}`;
};
export const getConnectedWebsocket = (organizationSlug, local, debug, opts = {}) => new HocuspocusProviderWebsocket({
    url: websocketUrl(organizationSlug, local, debug),
    ...opts,
});
