import { ConversationProcessor } from "../conversationProcessor";
import { ChatMessage } from "../languageModels";
import { Memory } from "../languageModels/memory";
import { ConversationalProgram } from "./index";

const memoryToOutput = (memory: Memory) => {
  return `<${memory.memory.action}>${memory.memory.content}</${memory.memory.action}>`;
};

export class ConversationCompressor implements ConversationalProgram {
  private conversations: Record<string, ChatMessage[]>;

  constructor() {
    this.conversations = {};
  }

  async toOutput(conversation: ConversationProcessor) {
    const initialMessages = this.conversations[conversation.name] || [];

    let truncatedMessages = initialMessages;
    if (initialMessages.length > 10) {
      if (initialMessages.length === 11) {
        truncatedMessages = initialMessages
          .slice(0, 1)
          .concat(initialMessages.slice(2));
      } else if (initialMessages.length === 12) {
        truncatedMessages = initialMessages
          .slice(0, 2)
          .concat(initialMessages.slice(3));
      } else if (initialMessages.length === 13) {
        truncatedMessages = initialMessages
          .slice(0, 3)
          .concat(initialMessages.slice(4));
      } else {
        truncatedMessages = initialMessages
          .slice(0, 3)
          .concat(initialMessages.slice(-10));
      }
    }

    return {
      trailingMessages: truncatedMessages,
    };
  }

  update(memories: Memory[], conversation: ConversationProcessor) {
    this.conversations[conversation.name] ||= [];
    memories.forEach((memory) => {
      const lastMessage = this.conversations[conversation.name].slice(-1)[0];
      if (lastMessage && lastMessage.name === memory.memory.entity) {
        lastMessage.content += `${memoryToOutput(memory)}\n`;
        return;
      }

      const newMessage: ChatMessage = {
        role: memory.memory.role,
        content: `${memoryToOutput(memory)}\n`,
        name: memory.memory.entity,
      };

      this.conversations[conversation.name].push(newMessage);
    });
  }
}
