import * as readline from "readline";
import { OpenAIConfig, OpenAIModel, Personalities, Soul } from "../src";

const config = new OpenAIConfig({
  apiKey: "...",
  model: OpenAIModel.gpt_3_5_turbo,
});

let personality = Personalities.Samantha;
personality = Personalities.Dustin;
personality = Personalities.Page;
personality = Personalities.Reggie;
personality = Personalities.Eileen;

personality = {
  name: "...",
  shortPersonality: "...",
  longPersonality: "...",
  initialPlan: "...",
};

personality = Personalities.Samantha;

const soul = new Soul(personality);

soul.on("says", (text: string) => {
  console.log("👱", personality.name, " says: ", text);
});

soul.on("thinks", (text: string) => {
  console.log("👱", personality.name, " thinks: ", text);
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log(
  '- Type a message to send to Soul\n- Type "reset" to reset\n- Type "exit" to quit\n'
);

rl.on("line", async (line) => {
  if (line.toLowerCase() === "exit") {
    rl.close();
  } else if (line.toLowerCase() === "reset") {
    soul.reset();
  } else {
    const text: string = line;
    soul.tell(text);
  }
});
