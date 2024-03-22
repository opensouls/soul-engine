/* eslint-disable arrow-body-style */
export { ALLOWED_RAG_FILE_EXTENSIONS } from './cli/rag/rag-file-poster.js';
import * as core from "@opensouls/core";
export { core };
/**
 * @deprecated Use `mentalQuery` from "socialagi" instead.
 */
export { mentalQuery } from "socialagi";
export const defaultRagBucketName = (blueprint) => {
    return `__blueprint-rag-${blueprint}`;
};
// The ENGINE passes in these global hooks to the soul.
const getHooks = () => {
    if (!globalThis.soul) {
        console.error("oops, no hooks", globalThis.soul);
    }
    return globalThis.soul.__hooks;
};
export const useActions = () => {
    const hooks = getHooks();
    if (!hooks)
        throw new Error("useActions called when no hooks are available. Are you executing this code on the SOUL ENGINE?");
    return hooks.useActions();
};
export const useProcessManager = () => {
    const hooks = getHooks();
    if (!hooks)
        throw new Error("useActions called when no hooks are available. Are you executing this code on the SOUL ENGINE?");
    return hooks.useProcessManager();
};
export const usePerceptions = () => {
    const hooks = getHooks();
    if (!hooks)
        throw new Error("usePerceptions called when no hooks are available. Are you executing this code on the SOUL ENGINE?");
    return hooks.usePerceptions();
};
export const useProcessMemory = (initialValue) => {
    const hooks = getHooks();
    if (!hooks)
        throw new Error("useProcessMemory called when no hooks are available. Are you executing this code on the SOUL ENGINE?");
    return hooks.useProcessMemory(initialValue);
};
export const useSoulStore = () => {
    const hooks = getHooks();
    if (!hooks)
        throw new Error("useSoulStore called when no hooks are available. Are you executing this code on the SOUL ENGINE?");
    return hooks.useSoulStore();
};
export const useSoulMemory = (name, initialValue) => {
    const hooks = getHooks();
    if (!hooks)
        throw new Error("useSoulMemory called when no hooks are available. Are you executing this code on the SOUL ENGINE?");
    return hooks.useSoulMemory(name, initialValue);
};
export const useRag = (bucketName) => {
    const hooks = getHooks();
    if (!hooks)
        throw new Error("useRag called when no hooks are available. Are you executing this code on the SOUL ENGINE?");
    return hooks.useRag(bucketName);
};
