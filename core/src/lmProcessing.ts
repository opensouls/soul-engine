import OpenAI from "openai";
import { ChatMessage } from "./languageModels";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function processLMProgram(
  records: ChatMessage[]
): Promise<string> {
  const res = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-16k",
    messages: records,
  });
  return res?.choices[0]?.message?.content || "";
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
