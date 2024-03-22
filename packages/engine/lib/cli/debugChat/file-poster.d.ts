import { EventEmitter } from "eventemitter3";
import { CodeFile } from "../fileSystem/file-watcher.js";
interface FilePosterOpts {
    apiKey: string;
    paths: string[];
    organizationSlug: string;
    blueprint: string;
    local?: boolean;
    root: string;
}
interface FilePosterEvents {
    fileUpdate: (files: CodeFile[]) => void;
    stateless: () => void;
}
export declare class FilePoster extends EventEmitter<FilePosterEvents> {
    private _connection?;
    private apiKey;
    private connectionOpts;
    private firstSync;
    private watcher;
    constructor({ apiKey, paths, root, organizationSlug, blueprint, local }: FilePosterOpts);
    start(): Promise<import("chokidar").FSWatcher>;
    stop(): void;
    private onFileUpdate;
    private setupProvider;
}
export {};
