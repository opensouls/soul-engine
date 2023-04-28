import * as readline from "readline";
import { Samantha, Message, Thought, SamanthaConfig, Model } from "../src/index";


const config = new SamanthaConfig({ model: Model.GPT_3_5 });
const samantha = new Samantha(config);

samantha.on("says", (message: Message) => {
  console.log("Samantha says: ", message.text);
});

samantha.on("thinks", (thought: Thought) => {
  console.log("Samantha thinks: ", thought.text);
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
        const message = {text : line}
        await samantha.tell(message);
  }
});
