import readline from "readline";
import { Samantha } from "socialagi";

const samantha = new Samantha(
  "sk-123456789",
  "gpt-3.5-turbo"
);

samantha.on("message", (message) => {
  console.log("MESSAGE: ", message);
});

samantha.on("thought", (thought) => {
  console.log("THOUGHT: ", thought);
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('Type a message to send to Samantha or type "exit" to quit.');

rl.on("line", async (line) => {
  if (line.toLowerCase() === "exit") {
    rl.close();
  } else {
    await samantha.sendMessage(line);
  }
});