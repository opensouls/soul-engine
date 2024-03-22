export interface CodeFile {
    content: string;
    relativePath: string;
    removed: boolean;
}
export interface FileWatcherOpts {
    paths: string[];
    root: string;
    allowedExtensions?: string[];
}
export declare class FileWatcher {
    private options;
    onFileUpdate?: (files: CodeFile[]) => void;
    private paths;
    private root;
    constructor(options: FileWatcherOpts);
    start(): Promise<import("chokidar").FSWatcher>;
    private callOnUpdate;
    private watch;
}
