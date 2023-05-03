import * as readline from "readline";
import { Soul, OpenaiConfig, OpenaiModel, Complete, ThoughtPattern, ThoughtTiming } from "../src/index";


const config = new OpenaiConfig({ model: OpenaiModel.gpt_3_5_turbo });
const samantha = new Soul(config);

//TO DO: Implement Enum
samantha.from("SAMANTHA")

samantha.on("says", (text : String) => {
  console.log("\nSamantha says: ", text);
});

samantha.on("thinks", (text : String) => {
  console.log("\nSamantha thinks: ", text);
});

const o1 = new ThoughtPattern("FEELING", "I feel", Complete);
const o2 = new ThoughtPattern("THOUGHT", "I want", Complete);
const arr = [o1, o2];
samantha.updateThoughts(ThoughtTiming.THOUGHTS_BEFORE_SPEAKING, arr);

const o3 = new ThoughtPattern("SELF ANALYSIS", "In Retrospect, I was", Complete);
const arr2 = [o3];
samantha.updateThoughts(ThoughtTiming.THOUGHTS_AFTER_SPEAKING, arr2);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('Type a message to send to Samantha or type "reset" to reset or type "exit" to quit');

rl.on("line", async (line) => {
    if (line.toLowerCase() === "exit") {
        rl.close();
    }
    else if (line.toLowerCase() === "reset") {
        samantha.reset();
    }
    else {
        const text : string = line;
        samantha.tell(text);
  }
});



