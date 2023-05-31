import {
  LanguageProcessor,
  Memory,
  NeuralEvents,
  MRecord,
  Thought,
  ThoughtGenerator,
} from "./lmStream";
import { EventEmitter } from "events";
import { Blueprint, ThoughtFramework } from "./blueprint";
import { devLog } from "./utils";
import {
  getIntrospectiveRemembranceProgram,
  getIntrospectiveSystemProgram,
  getReflectiveLPSystemProgram,
} from "./TEMPLATES";

export class Soul extends EventEmitter {
  private thoughtGenerator: ThoughtGenerator;

  public blueprint: Blueprint;

  private thoughts: Thought[] = [];
  private generatedThoughts: Thought[] = [];
  private msgQueue: string[] = [];

  constructor(blueprint: Blueprint) {
    super();

    this.blueprint = blueprint;
    // soul blueprint validation
    if (this.blueprint?.thoughtFramework === undefined) {
      this.blueprint.thoughtFramework = ThoughtFramework.Introspective;
    }
    if (
      this.blueprint.thoughtFramework === ThoughtFramework.ReflectiveLP &&
      this.blueprint.languageProcessor !== LanguageProcessor.GPT_4
    ) {
      throw new Error(
        "ReflectiveLP ThoughtFramework requires the GPT4 language processor"
      );
    }

    this.thoughtGenerator = new ThoughtGenerator(
      this.blueprint.languageProcessor
    );
    this.thoughtGenerator.on(NeuralEvents.newThought, (thought: Thought) => {
      this.onNewThought(thought);
    });
    this.thoughtGenerator.on(NeuralEvents.noNewThoughts, () => {
      this.noNewThoughts();
    });
  }

  public reset() {
    this.thoughtGenerator.interrupt();
    this.thoughts = [];
    this.msgQueue = [];
    this.generatedThoughts = [];
  }

  private onNewThought(thought: Thought) {
    this.generatedThoughts.push(thought);

    if (thought.isMessage()) {
      const questionRegex = /^(.*[.?!]) ([^.?!]+\?[^?]*)$/;
      const match = thought.memory.content.match(questionRegex);
      if (match) {
        const [_, message, followupQuestion] = match;
        this.emit("says", message);

        const minDelay = 2000;
        const maxDelay = 4000;
        const randomDelay =
          Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

        const sendFollowup = () => this.emit("says", followupQuestion);
        setTimeout(sendFollowup, randomDelay);
      } else {
        this.emit("says", thought.memory.content);
      }
    } else {
      this.emit("thinks", thought.memory.content);
      if (
        thought.memory.action === "WANTS_TO_RAMBLE" &&
        thought.memory.content.toLowerCase() === "yes"
      ) {
        this.generatedThoughts.push(
          new Thought({
            role: "assistant",
            entity: this.blueprint.name,
            action: "RAMBLE",
            content: "I want to ramble before they respond",
          })
        );
        this.continueThinking();
      }
    }
  }

  private continueThinking() {
    this.thoughtGenerator.interrupt();
    this.thoughts = this.thoughts.concat(this.generatedThoughts);
    this.think();
  }

  private noNewThoughts() {
    devLog("🧠 SOUL finished thinking");

    this.thoughts = this.thoughts.concat(this.generatedThoughts);

    this.generatedThoughts = [];

    if (this.msgQueue.length > 0) {
      const msgThoughts = this.msgQueue.map(
        (text) =>
          new Memory({
            role: "user",
            entity: "user",
            action: "MESSAGES",
            content: text,
          })
      );
      this.thoughts = this.thoughts.concat(msgThoughts);
      this.msgQueue = [];

      this.think();
    }
  }

  static thoughtsToRecords(
    thoughts: Thought[],
    systemProgram: string,
    remembranceProgram?: string
  ): MRecord[] {
    function groupMemoriesByRole(memories: Memory[]): Memory[][] {
      const grouped = memories.reduce((result, memory, index, array) => {
        if (index > 0 && array[index - 1].memory.role === memory.memory.role) {
          result[result.length - 1].push(memory);
        } else {
          result.push([memory]);
        }
        return result;
      }, [] as Memory[][]);

      return grouped;
    }

    const groupedThoughts = groupMemoriesByRole(thoughts);
    const initialMessages = [];
    for (const grouping of groupedThoughts) {
      initialMessages.push({
        role: grouping[0].memory.role,
        content: grouping.map((g) => g.toString()).join("\n"),
      });
    }

    let truncatedMessages = initialMessages;
    if (initialMessages.length > 10) {
      if (initialMessages.length === 11) {
        truncatedMessages = initialMessages
          .slice(0, 1)
          .concat(initialMessages.slice(2));
      } else if (initialMessages.length === 12) {
        truncatedMessages = initialMessages
          .slice(0, 2)
          .concat(initialMessages.slice(3));
      } else if (initialMessages.length === 13) {
        truncatedMessages = initialMessages
          .slice(0, 3)
          .concat(initialMessages.slice(4));
      } else {
        truncatedMessages = initialMessages
          .slice(0, 3)
          .concat(initialMessages.slice(-10));
      }
    }

    let finalMessages = truncatedMessages;
    finalMessages = [
      {
        role: "system",
        content: systemProgram,
      },
    ].concat(finalMessages);
    if (truncatedMessages.length > 0 && remembranceProgram !== undefined) {
      finalMessages = finalMessages.concat({
        role: "system",
        content: remembranceProgram,
      });
    }
    return finalMessages;
  }

  private think() {
    devLog("🧠 SOUL is starting thinking...");

    let systemProgram, remembranceProgram, vars;
    switch (this.blueprint.thoughtFramework) {
      case ThoughtFramework.Introspective:
        vars = {
          name: this.blueprint.name,
          initialPlan: this.blueprint.initialPlan,
          essence: this.blueprint.essence,
          personality: this.blueprint.personality || "",
          languageProcessor: this.blueprint.languageProcessor,
        };
        systemProgram = getIntrospectiveSystemProgram(vars);
        remembranceProgram = getIntrospectiveRemembranceProgram(vars);
        break;
      case ThoughtFramework.ReflectiveLP:
        vars = {
          name: this.blueprint.name,
          initialPlan: this.blueprint.initialPlan,
          essence: this.blueprint.essence,
          personality: this.blueprint.personality || "",
        };
        systemProgram = getReflectiveLPSystemProgram(vars);
        break;
      default:
        throw Error("");
    }

    const messages = Soul.thoughtsToRecords(
      this.thoughts,
      systemProgram,
      remembranceProgram
    );
    devLog("\n💬\n" + messages + "\n💬\n");
    this.thoughtGenerator.generate(messages);
  }

  public tell(text: string): void {
    const memory = new Memory({
      role: "user",
      entity: "user",
      action: "MESSAGES",
      content: text,
    });

    if (this.thoughtGenerator.isThinking()) {
      devLog("🧠 SOUL is thinking...");

      const isThinkingBeforeSpeaking = !this.generatedThoughts.some((thought) =>
        thought?.isMessage()
      );

      if (isThinkingBeforeSpeaking) {
        devLog("🧠 SOUL is thinking before speaking...");
        this.msgQueue.push(text);
      } else {
        devLog("🧠 SOUL is thinking after speaking...");

        this.thoughtGenerator.interrupt();
        this.generatedThoughts = [];
        this.thoughts.push(memory);
        this.think();
      }
    } else {
      devLog("🧠 SOUL is not thinking.");

      this.thoughts.push(memory);
      this.think();
    }
  }
}
