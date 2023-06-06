import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export async function processLMProgram(
  records: ChatCompletionRequestMessage[]
): Promise<string> {
  const res = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: records,
  });
  return res?.data?.choices[0]?.message?.content || "";
}

type TagRecord = {
  tag: string;
  input: string;
};

export function getTag({ tag, input }: TagRecord) {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, "is");
  const match = input.match(regex);
  return match ? match[1] : "";
}
