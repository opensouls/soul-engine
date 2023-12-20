import { ConversationProcessor } from "../conversationProcessor";
import { Thought } from "../languageModels/memory";
import { ProgramOutput } from "../linguisticProgramBuilder";

export * from "./participationStrategies";
export * from "./PeopleMemory/PeopleMemory";
export * from "./ConversationCompressor";
export * from "./Personality";
export * from "./Ramble";

/**
 * Mental models are processors on a stream from a group of conversation messages (or none) that
 * end up being compiled to a prompt for the LLM.
 * They can manipulate the message history being sent to the LLM, and build up a context for the system message prompt.
 */
export interface ConversationalProgram {
  update: (thoughts: Thought[], conversation: ConversationProcessor) => void;
  toOutput: (
    conversation: ConversationProcessor
  ) => Promise<Partial<ProgramOutput>>;
}
