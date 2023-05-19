import * as readline from "readline";
import { LanguageProcessor, Soul } from "../src";
import { ThoughtFramework } from "../src/blueprint";

const blueprint = {
  name: "James",
  essence: "An emotionally focused therapist, always here to listen",
  initialPlan: "Ask how the patient is feeling",
  languageProcessor: LanguageProcessor.GPT_4,
  thoughtFramework: ThoughtFramework.ReflectiveLP,
};

const soul = new Soul(blueprint);

soul.on("says", (text: string) => {
  console.log("👱", blueprint.name, " says: ", text);
});

soul.on("thinks", (text: string) => {
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
    soul.reset();
  } else {
    const text: string = line;
    soul.tell(text);
  }
});
