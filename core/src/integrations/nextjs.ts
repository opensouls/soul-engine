import {
  OpenAIStreamingChat,
  OpenAILanguageProgramProcessor,
  Model,
} from "../languageModels/openAI";
import { NextApiRequest, NextApiResponse } from "next";
import {
  ChatCompletionStreamer,
  LanguageModelProgramExecutor,
} from "../languageModels";

async function openAIStreamHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  model: Model
) {
  console.log("streamer call");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");

  const { messages } = req.body;

  const streamer = new OpenAIStreamingChat(
    {},
    {
      model,
    }
  );
  const { stream, abortController } = await streamer.create({
    messages,
  });

  for await (const data of stream) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
  res.on("close", () => {
    abortController.abort();
  });
  res.end();
}

export function createOpenAIStreamHandler(model: Model) {
  return (req: NextApiRequest, res: NextApiResponse) =>
    openAIStreamHandler(req, res, model);
}

async function openAIExecutorHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  model: Model
) {
  console.log("executor call");
  const { messages } = req.body;

  try {
    const executor = new OpenAILanguageProgramProcessor(
      {},
      {
        model,
      }
    );
    const result = await executor.execute(messages);

    res.status(200).json({ data: result });
  } catch (err) {
    if (err instanceof Error) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(500).json({ error: "An error occurred" });
    }
  }
}

export function createOpenAIExecutorHandler(model: Model) {
  return (req: NextApiRequest, res: NextApiResponse) =>
    openAIExecutorHandler(req, res, model);
}

export function createChatCompletionStreamer(
  baseUrl: string
): ChatCompletionStreamer {
  return {
    create: async ({ messages }) => {
      const controller = new AbortController();

      const response = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      let dataBuffer = "";

      const stream = {
        async getNext() {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            if (!reader) {
              return { done: true };
            }
            const { value, done } = await reader?.read();

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
  } as ChatCompletionStreamer;
}

export function createChatCompletionExecutor(
  baseUrl: string
): LanguageModelProgramExecutor {
  return {
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
  };
}
