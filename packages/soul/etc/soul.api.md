## API Report File for "@opensouls/soul"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import { DeveloperDispatchedPerception } from '@opensouls/core';
import { EventEmitter } from 'eventemitter3';
import { EventLogDoc } from '@opensouls/core';
import { HocuspocusProviderWebsocket } from '@hocuspocus/provider';
import { InteractionRequest } from '@opensouls/core';
import { SoulEnvironment } from '@opensouls/core';
import { SoulEvent } from '@opensouls/core';
import { syncedStore } from '@syncedstore/core';

// @public
export type ActionEvent = {
    content: () => Promise<string>;
    isStreaming: boolean;
    stream: () => AsyncIterable<string>;
    action: string;
    name?: string;
    _metadata: InteractionRequest['_metadata'];
    _timestamp: InteractionRequest['_timestamp'];
    perception: InteractionRequest;
    interactionRequest: InteractionRequest;
};

// @public (undocumented)
export enum Actions {
    // (undocumented)
    SAYS = "says"
}

// @public (undocumented)
export enum Events {
    // (undocumented)
    compileError = "compileError",
    // (undocumented)
    dispatchExternalPerception = "dispatchExternalPerception",
    // (undocumented)
    newInteractionRequest = "newInteractionRequest",
    // (undocumented)
    newPerception = "newPerception",
    // (undocumented)
    newSoulEvent = "newSoulEvent",
    // (undocumented)
    revertDoc = "revertDoc",
    // (undocumented)
    saveVersion = "saveVersion",
    // (undocumented)
    setEnvironment = "setEnvironment"
}

// @public (undocumented)
export function said(entity: string, content: string): DeveloperDispatchedPerception;

// @public (undocumented)
export class Soul extends EventEmitter<SoulEvents> {
    // Warning: (ae-forgotten-export) The symbol "SoulOpts" needs to be exported by the entry point index.d.ts
    constructor({ debug, local, organization, soulId, blueprint, token, version, webSocket, environment }: SoulOpts);
    // (undocumented)
    connect(): Promise<string>;
    // (undocumented)
    disconnect(): Promise<void>;
    // (undocumented)
    dispatch(perception: DeveloperDispatchedPerception): Promise<void>;
    // (undocumented)
    get events(): SoulEvent[];
    // (undocumented)
    onError(handler: (error: Error) => void): void;
    // (undocumented)
    setEnvironment(environment: SoulEnvironment): void;
    // (undocumented)
    soulId: string;
    // (undocumented)
    get store(): ReturnType<typeof syncedEventStore>;
}

// @public (undocumented)
export type SoulEvents = {
    [K in Actions]: (evt: ActionEvent) => void;
} & {
    [key: string]: (evt: ActionEvent) => void;
} & {
    newPerception: (evt: InteractionRequest) => void;
    newInteractionRequest: (evt: InteractionRequest) => void;
    newSoulEvent: (evt: SoulEvent) => void;
};

// @public (undocumented)
export const syncedEventStore: () => ReturnType<typeof syncedStore<EventLogDoc>>;

// (No @packageDocumentation comment for this package)

```
