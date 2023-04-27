import { EventEmitter } from "events";
import { Configuration, OpenAIApi } from "openai";
import { OpenAIExt } from "openai-ext";
import { formatMessages } from "./utils.js";

function proccessContent(content, isFinal) {
  if (isFinal) {
    let inputString = content;
    const openingTagRegex = /<([A-Z]+)[^>]*>/gi;
    let match, lastMatch;
    while ((match = openingTagRegex.exec(inputString)) !== null) {
      lastMatch = match;
    }
    if (lastMatch) {
      const tag = lastMatch[1];
      const startIndex = lastMatch.index + lastMatch[0].length;
      const endIndex = inputString.lastIndexOf(`</${tag}>`);
      const text = inputString.slice(startIndex, endIndex).trim();
      const x = { tag, text };
      return x;
    }
  } else {
    let inputString = content;
    const regex = /<\/([A-Z]+)>$/;
    const match = inputString.trimEnd().match(regex);
    if (match) {
      const tag = match[1];
      const openingTagRegex = new RegExp(`<${tag}>`, "i");
      const openingTagMatch = inputString.match(openingTagRegex);
      if (openingTagMatch) {
        const startIndex = openingTagMatch.index + openingTagMatch[0].length;
        const endIndex = match.index;
        const text = inputString.slice(startIndex, endIndex).trim();
        const x = { tag, text };
        return x;
      }
    }
  }
  return null;
}

class Samantha extends EventEmitter {
  constructor(apiKey, model) {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.messages = [];
  }

  async sendMessage(message) {
    this.messages.push({ role: "user", content: message });
    const formattedMessages = formatMessages(this.messages);

    const apiKey = this.apiKey;
    const configuration = new Configuration({ apiKey });
    const openai = new OpenAIApi(configuration);

    const streamConfig = {
    openai: openai,
    handler: {
      onContent: (content, isFinal, stream) => {
        const x = proccessContent(content, isFinal);
        if (x) {
          if (x["tag"] === "MESSAGE") {
            this.emit("message", x["text"]);
          } else {
            this.emit("thought", x["text"]);
          }
        }
      },
        onDone(stream) {
          // Triggered when stream ends.
        },
        onError(error, stream) {
          console.error(error);
        },
      },
    };

    await OpenAIExt.streamServerChatCompletion(
      {
        model: this.model,
        messages: formattedMessages,
      },
      streamConfig
    );
  }
}

export { Samantha };
