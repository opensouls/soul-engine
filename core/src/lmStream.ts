import { EventEmitter } from "events";
import { Configuration, OpenAIApi } from "openai";
import { OpenAIExt } from "openai-ext";

import { devLog } from "./utils";

export class Thought {
  role: string;
  type: string;
  text: string;

  constructor(role: string, type: string, text: string) {
    this.role = role;
    this.type = type;
    this.text = text;
    this.format();
  }

  format() {
    this.role = this.role.toUpperCase();
    this.type = this.type.toUpperCase();
  }

  setRole(role: string) {
    this.role = role;
    this.format();
  }
  setType(type: string) {
    this.type = type;
    this.format();
  }
  setText(text: string) {
    this.text = text;
    this.format();
  }

  isRoleAssistant(): boolean {
    return this.role === "ASSISTANT";
  }

  isTypeMessage(): boolean {
    return this.type === "MESSAGE";
  }
}

export enum LanguageProcessor {
  GPT_4 = "gpt-4",
  GPT_3_5_turbo = "gpt-3.5-turbo",
}

interface Message {
  role: string;
  content: string;
}

export class LMStream extends EventEmitter {
  private stream: any = null;
  private languageProcessor: LanguageProcessor;

  constructor(languageProcessor: LanguageProcessor) {
    super();
    this.languageProcessor = languageProcessor;
  }

  private emitThoughtEvent(tag: Thought) {
    this.emit("tag", tag);
  }
  private emitGeneratedEvent() {
    this.emit("generated");
  }

  public stopGenerate(): void {
    if (this.stream) {
      try {
        this.stream.destroy();
      } catch (error) {
        console.error("Failed to destroy the stream:", error);
      } finally {
        this.stream = null;
      }
    }
  }

  public isGenerating(): boolean {
    if (this.stream) {
      return true;
    } else {
      return false;
    }
  }

  private oldThoughts: Thought[] = [];
  public async generate(
    thoughts: Thought[],
    systemProgram: string,
    remembranceProgram?: string
  ) {
    const apiKey = process.env.OPENAI_API_KEY;

    const configuration = new Configuration({ apiKey });
    const openaiApi = new OpenAIApi(configuration);

    const openaiStreamConfig = {
      openai: openaiApi,
      handler: {
        onContent: (content: string) => {
          function extractThoughts(content: string): Thought[] {
            const regex = /<([A-Za-z0-9\s_]+)>(.*?)<\/\1>/g;
            const matches = content.matchAll(regex);
            const extractedThoughts = [];

            for (const match of matches) {
              const [_, tag, content] = match;
              //<${tag}>${content}</${tag}>
              const extractedThought = new Thought("assistant", tag, content);
              extractedThoughts.push(extractedThought);
            }

            return extractedThoughts;
          }
          const newThoughts = extractThoughts(
            content.replace(/(\r\n|\n|\r)/gm, "")
          );
          const diffThoughts = this.getUniqueThoughts(
            newThoughts,
            this.oldThoughts
          );
          this.oldThoughts = newThoughts;
          diffThoughts.forEach((diffThought) => {
            this.emitThoughtEvent(diffThought);
          });
        },
        onDone: () => {
          this.emitGeneratedEvent();
          this.stopGenerate();
        },
      },
    };

    const messages = this.thoughtsToMessages(
      thoughts,
      systemProgram,
      remembranceProgram
    );
    devLog("\n💬\n" + messages + "\n💬\n");

    // TODO: upstream lib parses stream chunks correctly but sometimes emits a spurious error
    //   open PR to silence non-fatal errors in https://github.com/justinmahar/openai-ext
    const openaiStreamResponse = await OpenAIExt.streamServerChatCompletion(
      {
        model: this.languageProcessor,
        messages: messages,
      },
      openaiStreamConfig
    );

    this.stream = openaiStreamResponse.data;
  }

  private getUniqueThoughts(
    newArray: Thought[],
    oldArray: Thought[]
  ): Thought[] {
    return newArray.filter(
      (newThought) =>
        !oldArray.some(
          (oldThought) =>
            newThought.role === oldThought.role &&
            newThought.type === oldThought.type &&
            newThought.text === oldThought.text
        )
    );
  }

  private thoughtsToMessages(
    thoughts: Thought[],
    systemProgram: string,
    remembranceProgram?: string
  ): Message[] {
    const initialMessages = thoughts.map((tag) => {
      let content = tag.text;
      if (tag.isRoleAssistant()) {
        content = `<${tag.type}>${tag.text}</${tag.type}>\n`;
      }
      return {
        role: tag.role.toLowerCase(),
        content: content,
      } as Message;
    });

    // Reduce the array of Messages, merging consecutive messages with the same role
    const reducedMessages = initialMessages.reduce(
      (messages: Message[], currentMessage) => {
        const previousMessage = messages[messages.length - 1];
        if (previousMessage && previousMessage.role === currentMessage.role) {
          previousMessage.content += currentMessage.content;
        } else {
          messages.push(currentMessage);
        }
        return messages;
      },
      []
    );

    let truncatedMessages = reducedMessages;
    if (reducedMessages.length > 10) {
      if (reducedMessages.length === 11) {
        truncatedMessages = reducedMessages
          .slice(0, 1)
          .concat(reducedMessages.slice(2));
      } else if (reducedMessages.length === 12) {
        truncatedMessages = reducedMessages
          .slice(0, 2)
          .concat(reducedMessages.slice(3));
      } else if (reducedMessages.length === 13) {
        truncatedMessages = reducedMessages
          .slice(0, 3)
          .concat(reducedMessages.slice(4));
      } else {
        truncatedMessages = reducedMessages
          .slice(0, 3)
          .concat(reducedMessages.slice(-10));
      }
    }

    let finalMessages = truncatedMessages;
    finalMessages = [
      {
        role: "system",
        content: systemProgram,
      },
    ].concat(finalMessages);
    if (truncatedMessages.length > 0 && remembranceProgram !== undefined) {
      finalMessages = finalMessages.concat({
        role: "system",
        content: remembranceProgram,
      });
    }
    return finalMessages;
  }
}
