import * as readline from "readline";
import { Blueprints, ParticipationStrategy, Soul } from "../src";

const soul = new Soul(Blueprints.CONFIDANTE);

soul.on("says", (text: string) => {
  console.log(`👱 ${Blueprints.CONFIDANTE.name} says: \x1b[34m${text}\x1b[0m`);
});

soul.on("thinks", (text: string) => {
  console.log("👱", Blueprints.CONFIDANTE.name, " thinks: ", text);
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
    soul.read(
      { userName: "kafisch", text },
      ParticipationStrategy.ALWAYS_REPLY
    );
  }
});
