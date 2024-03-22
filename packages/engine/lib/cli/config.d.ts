export interface GlobalConfig {
    apiKey: string;
    organization: string;
    organizationId: string;
}
export declare const getConfig: (isLocal?: boolean) => Promise<import("conf").default<GlobalConfig>>;
