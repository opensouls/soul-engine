interface RagPosterOpts {
    apiKey?: string;
    path: string;
    url: string;
}
interface CreateWithDefaultConfigOpts {
    path: string;
    organization: string;
    local: boolean;
    apiKey: string;
}
export declare const ALLOWED_RAG_FILE_EXTENSIONS: string[];
export declare class RagPoster {
    private apiKey;
    private path;
    private url;
    private watcher?;
    constructor({ apiKey, path, url }: RagPosterOpts);
    static createWithDefaultConfig({ path, organization, local, apiKey }: CreateWithDefaultConfigOpts): RagPoster;
    push(): Promise<void>;
    pushFiles(...paths: string[]): Promise<void>;
    watch(): void;
}
export {};
