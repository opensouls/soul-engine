import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function process(lmProgram) {
  const res = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: lmProgram }],
  });
  return res.data.choices[0].message.content;
}

async function continueSpeaking({ name, essence, messages }) {
  const lmProgram = `<BACKGROUND>
You are modeling the mind of ${name}: ${essence}. You will be shown a conversation, and the last message of ${name}. Then, you will model if they want to continue speaking.
</BACKGROUND>


  const output = await process(lmProgram);
  const newName = getTag({ tag: "NEW_NAME", input: output });
  const newEssence = getTag({ tag: "NEW_ESSENCE", input: output });
  const newPersonality = getTag({ tag: "NEW_PERSONALITY", input: output });
  return { newName, newEssence, newPersonality };
}

module.exports = {
  refineSoul,
};
