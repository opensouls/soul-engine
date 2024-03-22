import { HocuspocusProviderWebsocket, HocuspocusProviderWebsocketConfiguration } from "@hocuspocus/provider";
export declare const websocketUrl: (organizationSlug: string, local: boolean, debug: boolean) => string;
export declare const getConnectedWebsocket: (organizationSlug: string, local: boolean, debug: boolean, opts?: Partial<HocuspocusProviderWebsocketConfiguration>) => HocuspocusProviderWebsocket;
