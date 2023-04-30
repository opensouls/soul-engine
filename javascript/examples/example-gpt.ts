import * as readline from "readline";
import { OpenaiConfig, OpenaiModel, GPT, Tag, TagType, TagRole } from "../src/gpt";


const config = new OpenaiConfig({ model: OpenaiModel.gpt_3_5_turbo });
const gpt = new GPT(config)
const tags : Tag[] = []

gpt.on("tag", (tag: Tag) => {
  console.log("Tag: ", tag);
  tags.push(tag)
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('Type a message to send to Samantha or type "reset" to reset or type "exit" to quit');

rl.on("line", async (line) => {
    if (line.toLowerCase() === "exit") {
      gpt.stopGeneration();
        // rl.close();
    }
    else {
      const newTag = { role: TagRole.user, type: TagType.message, text: line }
      tags.push(newTag)
      await gpt.generate(tags)
    }
});
