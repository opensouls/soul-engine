import * as readline from "readline";
import { Samantha, OpenaiConfig, OpenaiModel, ThinkingObject, Complete } from "../src/index";


const config = new OpenaiConfig({ model: OpenaiModel.gpt_3_5_turbo });
const samantha = new Samantha(config);

samantha.on("says", (text : String) => {
  console.log("\nSamantha says: ", text);
});

samantha.on("thinks", (text : String) => {
  console.log("\nSamantha thinks: ", text);
});

const o1 = new ThinkingObject("FEELING", "I FEEL EXCITED TO", Complete);
const o2 = new ThinkingObject("THOUGHT", "I WANT TO IMAGINE A FUTURE WHERE", Complete);
const arr = [o1, o2];
samantha.thinkBeforeMessage(arr);

const o3 = new ThinkingObject("THOUGHT", "I FEEL GREATFUL THAT", Complete);
const arr2 = [o3];
samantha.thinkAfterMessage(arr2);

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



