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

const o1 = new ThinkingObject("FEELING", "I feel ");
const o2 = new ThinkingObject("THOUGHT", "I want ");
const arr = [o1, o2];
samantha.thinkBeforeMessage(arr);

const o11 = new ThinkingObject("THOUGHT", "In retrospect, ", Complete);
const arr2 = [o11];
samantha.thinkAfterMessage(arr2);

const p = samantha.getPersonalityObject();
p.name = "Jack"
p.simpleGoal = "to sell the user to purchase a $10 membership to me."
samantha.setPersonalityObject(p);

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



