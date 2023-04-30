import * as readline from "readline";
import { Samantha, Message, Thought, OpenaiConfig, OpenaiModel } from "../src/index";


const config = new OpenaiConfig({ model: OpenaiModel.gpt_3_5_turbo });
const samantha = new Samantha(config);

samantha.on("says", (text : String) => {
  console.log("\nSamantha says: ", text);
});

samantha.on("thinks", (text : String) => {
  console.log("\nSamantha thinks: ", text);
});

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
        const text : String = line;
        samantha.tell(text);
  }
});



