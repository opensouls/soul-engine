import { OpenAIStreamingChat, Model } from "socialagi";

async function openAIStream(req, res) {
  console.log("streamer call");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");

  const { messages } = req.body;

  const streamer = new OpenAIStreamingChat(
    {},
    {
      model: Model.GPT_3_5_turbo_16k,
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

export default async function handler(req, res) {
  return await openAIStream(req, res);
}
