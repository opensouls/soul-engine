import { EventEmitter } from "events";
import { Configuration, OpenAIApi } from "openai";
import { OpenAIExt } from "openai-ext";
import { formatMessages, processTag } from "./utils";

export interface Message {
  text: string;
}

export interface Thought {
  text: string;
}

export enum Model {
  GPT_4 = "gpt-4",
  GPT_3_5_TURBO = "gpt-3.5-turbo",
}

class Samantha extends EventEmitter {
  private apiKey: string;
  private model: string;
  private messages: { role: string; content: string }[];
  private stream: any;

  constructor(config? : SamanthaConfig) {
    super();
    this.apiKey = config?.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = config?.model || Model.GPT_3_5;
    this.messages = [];
    if (!this.apiKey) {
      throw new Error('API key not provided and not found in environment variables.');
    }
  }

  async tell(message: Message): Promise<void> {
    this.messages.push({ role: "user", content: message.text });
    const formattedMessages = formatMessages(this.messages);

    const apiKey = this.apiKey;
    const model = this.model;

    const configuration = new Configuration({ apiKey });
    const openai = new OpenAIApi(configuration);

    const streamConfig = {
      openai: openai,
      handler: {
        onContent: (content: string, isFinal: boolean, stream: any) => {
          const x = processTag(content, isFinal);
          if (x) {
            if (x.tag === "MESSAGE") {
              this.emit("says", { text: x.text });
            } else {
              this.emit("thinks", { text: x.text });
            }
          }
        },
        onDone: (stream: any) => {
          // Triggered when stream ends.
        },
        onError: (error: Error, stream: any) => {
          console.error(error);
        },
      },
    };

    const openAiStream = await OpenAIExt.streamServerChatCompletion(
      {
        model: model,
        messages: formattedMessages,
      },
      streamConfig
    );

    this.stream = openAiStream.data;
  }

  reset() : void {
    this.stream.destroy()
    this.messages = [];
  }
}

class SamanthaConfig {
  apiKey?: string;
  model?: Model;

  constructor(config?: Partial<SamanthaConfig>) {
    Object.assign(this, config);
  }
}

export { Samantha, SamanthaConfig };
