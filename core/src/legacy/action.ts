import { ConversationProcessor } from "./conversationProcessor";
import { Soul } from "./soul";

export interface Action {
  name: string;
  description: string;
  execute(input: string, soul: Soul, conversation: ConversationProcessor): void;
}
