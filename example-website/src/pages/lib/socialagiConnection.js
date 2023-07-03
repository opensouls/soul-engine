import React, { useCallback, useEffect, useRef, useState } from "react";
import { Soul, Blueprints } from "socialagi";

const createChatCompletionStreamer = (baseUrl) => ({
  create: async ({ messages }) => {
    const controller = new AbortController();

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let dataBuffer = "";

    const stream = {
      async getNext() {
        while (true) {
          const { value, done } = await reader.read();

          if (done && !dataBuffer) {
            return { done };
          }

          dataBuffer += value ? decoder.decode(value, { stream: true }) : "";
          const eventIndex = dataBuffer.indexOf("\n\n");
          if (eventIndex === -1) {
            if (done) {
              if (!dataBuffer.startsWith("data: ")) {
                throw new Error(`Unexpected event format: "${dataBuffer}"`);
              }

              const data = JSON.parse(dataBuffer.slice(6));
              dataBuffer = "";
              return { value: data, done: false };
            }

            continue;
          }

          const event = dataBuffer.slice(0, eventIndex);
          dataBuffer = dataBuffer.slice(eventIndex + 2);

          if (!event.startsWith("data: ")) {
            throw new Error(`Unexpected event format: "${event}"`);
          }

          const data = JSON.parse(event.slice(6));
          return { value: data, done: false };
        }
      },
      [Symbol.asyncIterator]() {
        return {
          next: this.getNext.bind(this),
        };
      },
    };

    return { stream, abortController: controller };
  },
});

const createChatCompletionExecutor = (baseUrl) => ({
  execute: async (messages) => {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    if (response.ok) {
      const { data } = await response.json();
      return data;
    } else {
      const error = await response.text();
      throw new Error(error);
    }
  },
});

export function useSoul({
  optionalOnNewMessage = () => {},
  optionalOnNewThought = () => {},
  soulOptions = { disableSayDelay: true },
  soulStartsConversation = true,
} = {}) {
  const setupDone = React.useRef(false);
  const soul = React.useRef(
    new Soul(Blueprints.SAMANTHA, {
      ...{
        chatStreamer: createChatCompletionStreamer("/api/lmStreamer"),
        languageProgramExecutor:
          createChatCompletionExecutor("/api/lmExecutor"),
      },
      ...soulOptions,
    })
  );
  const conversation = React.useRef(soul.current.getConversation("web"));

  const [messages, setMessages] = useState([]);
  const [soulThoughts, setSoulThoughts] = useState([]);

  const messageHandler = useCallback((newMessage) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { text: newMessage, sender: "soul", timestamp: Date.now() },
    ]);
    setSoulThoughts((prevThoughts) => [
      ...prevThoughts,
      { thought: `I sent the message: ${newMessage}`, timestamp: Date.now() },
    ]);
    optionalOnNewMessage(newMessage);
  }, []);

  const thoughtHandler = useCallback((newThought) => {
    setSoulThoughts((prevThoughts) => [
      ...prevThoughts,
      { thought: newThought, timestamp: Date.now() },
    ]);
    optionalOnNewThought(newThought);
  }, []);

  React.useEffect(() => {
    if (!setupDone.current) {
      conversation.current.on("says", messageHandler);
      conversation.current.on("thinks", thoughtHandler);
      setupDone.current = true;
    }
  }, []);

  const tellSoul = (message) => {
    conversation.current.tell(message);
    setMessages([
      ...messages,
      { text: message, sender: "user", timestamp: Date.now() },
    ]);
  };

  const soulReads = (message) => {
    conversation.current.read(message);
    setMessages([
      ...messages,
      { text: message, sender: "user", timestamp: Date.now() },
    ]);
  };

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;

      if (soulStartsConversation) {
        setTimeout(() => conversation.current.tell(""), 200);
      }
    }
  }, []);

  return { tellSoul, soulReads, messages, soulThoughts };
}
