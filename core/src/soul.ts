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
import { ChatCompletionRequestMessage } from "openai";
import { PeopleMemory } from "./memory";

type Message = {
  userName: string;
  text: string;
};

export enum ParticipationStrategy {
  ALWAYS_REPLY,
  CONSUME_ONLY,
}

export class Soul extends EventEmitter {
  private thoughtGenerator: ThoughtGenerator;

  public blueprint: Blueprint;

  private thoughts: Thought[] = [];
  private peopleMemory: PeopleMemory;

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

    this.peopleMemory = new PeopleMemory(this.blueprint);
    this.thoughtGenerator = new ThoughtGenerator(
      this.blueprint.languageProcessor,
      this.blueprint.name
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
        this.emit("thinking");
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

    const request = Soul.concatThoughts(this.generatedThoughts);
    this.peopleMemory.update(request as ChatCompletionRequestMessage);
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

  static concatThoughts(grouping: Thought[]): MRecord {
    return {
      role: grouping[0].memory.role,
      content: grouping.map((m) => m.toString()).join("\n"),
      name: grouping[0].memory.entity,
    };
  }

  static thoughtsToRecords(
    thoughts: Thought[],
    systemProgram: string,
    remembranceProgram?: string
  ): MRecord[] {
    function groupMemoriesByRole(memories: Memory[]): Memory[][] {
      const grouped = memories.reduce((result, memory, index, array) => {
        if (
          index > 0 &&
          array[index - 1].memory.role === memory.memory.role &&
          memory.memory.role === "assistant"
        ) {
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
      initialMessages.push(Soul.concatThoughts(grouping) as any);
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
        name: "systemBrain",
      },
    ].concat(finalMessages);
    if (truncatedMessages.length > 0 && remembranceProgram !== undefined) {
      finalMessages = finalMessages.concat({
        role: "system",
        content: remembranceProgram,
        name: "systemBrain",
      });
    }
    return finalMessages;
  }

  private think() {
    this.emit("thinking");
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

    this.peopleMemory.update({ role: "user", content: text, name: "user" });

    this.thoughts.push(memory);
    this.think();
  }

  public reads(
    msg: Message,
    participationStrategy: ParticipationStrategy
  ): void {
    const memory = new Memory({
      role: "user",
      entity: msg.userName,
      action: "MESSAGES",
      content: msg.text,
    });

    this.peopleMemory.update({
      role: "user",
      content: msg.text,
      name: msg.userName,
    });

    this.thoughts.push(memory);
    if (participationStrategy === ParticipationStrategy.ALWAYS_REPLY) {
      this.think();
    }
  }

  public inspectPeopleMemory(userName: string): string {
    return this.peopleMemory.inspect(userName);
  }
}
