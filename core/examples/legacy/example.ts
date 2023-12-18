import * as readline from "readline";
import { Blueprints, Soul } from "../../src/legacy";
import dotenv from "dotenv";

dotenv.config();

const blueprint = Blueprints.SAMANTHA;

const soul = new Soul(Blueprints.SAMANTHA);

const conversation = soul.getConversation("example");

conversation.on("says", (text: string) => {
  console.log(`👱 ${blueprint.name} says: \x1b[34m${text}\x1b[0m`);
});

conversation.on("thinks", (text: string) => {
  console.log("👱", blueprint.name, " thinks: ", text);
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
    conversation.reset();
  } else {
    const text: string = line;
    conversation.tell(text);
  }
});
