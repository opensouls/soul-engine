// This is a TYPE ONLY file that has the types from the old socialagi version of the core functionality. This is here because MentalProcesses can still optionally include a CortexStep.

import { z } from "zod";
import { ChatMessageRoleEnum, FunctionCall, LanguageModelProgramExecutor, RequestOptions, ChatMessageContent, ChatMessage } from "./languageModels";
export interface NextOptions {
    model?: string;
    requestOptions?: RequestOptions;
    tags?: Record<string, string>;
    stream?: boolean;
}
interface NextOptionsNonStreaming extends NextOptions {
    stream?: false;
}
interface NextOptionsStreaming extends NextOptions {
    stream: true;
}
export type NextFunction<ParsedArgumentType, ProcessFunctionReturnType> = (step: CortexStep<any>) => Promise<BrainFunction<ParsedArgumentType, ProcessFunctionReturnType>> | BrainFunction<ParsedArgumentType, ProcessFunctionReturnType>;
export interface Memory<MetaDataType = Record<string, unknown>> {
    role: ChatMessageRoleEnum;
    content: ChatMessageContent;
    name?: string;
    function_call?: FunctionCall;
    metadata?: MetaDataType;
}
export declare const memoryToChatMessage: (memory: Memory) => ChatMessage;
interface BrainStepInit<LastValue = string, MetaDataType = Record<string, unknown>> {
    id?: string;
    parents?: string[];
    tags?: Record<string, string>;
    memories?: Memory<MetaDataType>[];
    lastValue?: LastValue;
    processor?: LanguageModelProgramExecutor;
}
interface FunctionOutput<ProcessFunctionReturnType> {
    value: ProcessFunctionReturnType;
    memories?: Memory[];
}
export type StepCommandFunction = (step: CortexStep<any>) => Promise<string> | string;
export type StepCommand = string | StepCommandFunction;
export type StreamProcessor = (step: CortexStep<any>, stream: AsyncIterable<string>) => AsyncIterable<string> | Promise<AsyncIterable<string>>;
interface BrainFunctionAsCommand<ParsedArgumentType = string, ProcessFunctionReturnType = string> {
    name?: string;
    description?: string;
    parameters?: z.ZodSchema<ParsedArgumentType>;
    process?: (step: CortexStep<any>, response: ParsedArgumentType) => Promise<FunctionOutput<ProcessFunctionReturnType>> | FunctionOutput<ProcessFunctionReturnType>;
    command: StepCommand;
    commandRole?: ChatMessageRoleEnum;
    streamProcessor?: StreamProcessor;
}
interface BrainFunctionWithFunction<ParsedArgumentType, ProcessFunctionReturnType> {
    name: string;
    description: string;
    parameters: z.ZodSchema<ParsedArgumentType>;
    process?: (step: CortexStep<any>, response: ParsedArgumentType) => Promise<FunctionOutput<ProcessFunctionReturnType>> | FunctionOutput<ProcessFunctionReturnType>;
    command?: StepCommand;
    commandRole?: ChatMessageRoleEnum;
    streamProcessor?: StreamProcessor;
}
export type BrainFunction<ParsedArgumentType, ProcessFunctionReturnType> = BrainFunctionAsCommand<ParsedArgumentType, ProcessFunctionReturnType> | BrainFunctionWithFunction<ParsedArgumentType, ProcessFunctionReturnType>;
export declare const memoryWithDefaultMetadata: (...memories: Memory[]) => {
    metadata: {
        timestamp: number;
    };
    role: ChatMessageRoleEnum;
    content: ChatMessageContent;
    name?: string | undefined;
    function_call?: FunctionCall | undefined;
}[];
export declare class CortexStep<LastValueType = undefined> {
    id: string;
    parents: string[];
    tags: Record<string, string>;
    nextOptions?: NextOptions;
    readonly entityName: string;
    readonly memories: Memory[];
    private lastValue;
    private processor;
    constructor(entityName: string, { memories, lastValue, processor, id, parents, tags }?: BrainStepInit<LastValueType>);
    get value(): LastValueType;
    /**
     * Adds the given memories to the step and returns a new step (does not modify existing step)
     * @param memory An array of Memory instances to add.
     * @returns A new CortexStep instance with the added memories.
     */
    withMemory(memory: Memory[], skipMetadata?: boolean): CortexStep<LastValueType>;
    /**
     * Returns a new step with the memories provided by the updateFn
     * @param updateFn A function that takes the existing memories and returns the new memories (or a promise of the new memories)
     * @returns A new CortexStep instance with the new memories.
     */
    withUpdatedMemory(updateFn: (existingMemories: Memory[]) => Memory[] | Promise<Memory[]>): Promise<CortexStep<LastValueType>>;
    /**
     * Adds the given thought to the step as a new memory and returns a new step (does not modify existing step)
     * @param narrative a narrative phrase like "Samantha thought: This is getting out of control, I need to leave."
     * @returns A new CortexStep instance with the added memories.
     */
    withMonologue(narrative: string): CortexStep<LastValueType>;
    toString(): string;
    private stepCommandToString;
    private memoriesWithCommandString;
    private executeNextCommand;
    private executeStreamingNext;
    private streamingNext;
    /**
     * compute is very similar to #next, but returns only a value, and NOT a new CortexStep with new memories.
     * Nothing is modified on this CortexStep.
     */
    compute<ParsedArgumentType, ProcessFunctionReturnType = undefined>(functionFactory: NextFunction<ParsedArgumentType, ProcessFunctionReturnType>, opts?: NextOptions): Promise<ProcessFunctionReturnType extends undefined ? ParsedArgumentType : ProcessFunctionReturnType>;
    /**
     * next is used to execute CognitiveFunctions on this CortexStep.
     * @param functionFactory - A factory function that returns a cognitive function.
     * @param opts - An optional parameter that can be used to pass per request options and tags
     * @returns - Returns a Promise that resolves to a CortexStep object.
     */
    next<ParsedArgumentType, ProcessFunctionReturnType = undefined>(functionFactory: NextFunction<ParsedArgumentType, ProcessFunctionReturnType>, opts?: NextOptionsNonStreaming): Promise<ProcessFunctionReturnType extends undefined ? CortexStep<ParsedArgumentType> : CortexStep<ProcessFunctionReturnType>>;
    next<ParsedArgumentType, ProcessFunctionReturnType = undefined>(functionFactory: NextFunction<ParsedArgumentType, ProcessFunctionReturnType>, opts?: NextOptionsStreaming): Promise<{
        nextStep: Promise<ProcessFunctionReturnType extends undefined ? CortexStep<ParsedArgumentType> : CortexStep<ProcessFunctionReturnType>>;
        stream: AsyncIterable<string>;
    }>;
    private nonStreamingNext;
}
export {};
