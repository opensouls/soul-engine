import { OpenAILanguageProgramProcessor, Model } from "socialagi";

async function openAIExecute(req, res) {
  console.log("executor call");
  const { messages } = req.body;

  try {
    const executor = new OpenAILanguageProgramProcessor(
      {},
      {
        model: Model.GPT_3_5_turbo_16k,
      }
    );
    const result = await executor.execute(messages);

    res.status(200).json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export default async function handler(req, res) {
  await openAIExecute(req, res);
}
