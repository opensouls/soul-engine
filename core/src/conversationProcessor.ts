import { MRecord, NeuralEvents, ThoughtGenerator } from "./thoughtGenerator";
import { EventEmitter } from "events";
import { Blueprint, ThoughtFramework } from "./blueprint";
import { devLog } from "./utils";
import { Soul } from "./soul";
import { ChatMessageRoleEnum } from "./languageModels";
import { Memory, Thought } from "./languageModels/memory";
import { ParticipationStrategy, ParticipationStrategyClass } from "./programs";
import { ConversationalProgram } from "./programs";
import { ProgramOutput, mergePrograms } from "./linguisticProgramBuilder";

export type Message = {
  userName: string;
  text: string;
};

export interface ConversationOptions {
  participationStrategy?: ParticipationStrategyClass;
}

export class ConversationProcessor extends EventEmitter {
  private thoughtGenerator: ThoughtGenerator;
  public name: string;

  public soul: Soul;
  public blueprint: Blueprint;

  public thoughts: Thought[];

  private generatedThoughts: Thought[];
  private msgQueue: string[];
  private followupTimeout: NodeJS.Timeout | null = null;
  private participationStrategy?: ParticipationStrategy;

  private sayWaitDisabled? = false;

  public conversationalPrograms: ConversationalProgram[];

  public currentPrograms: Partial<ProgramOutput>[];

  constructor(soul: Soul, name: string, options: ConversationOptions) {
    super();
    this.name = name;
    this.msgQueue = [];
    this.thoughts = [];
    this.generatedThoughts = [];
    this.currentPrograms = [];
    this.soul = soul;
    this.blueprint = soul.blueprint;
    this.sayWaitDisabled = soul.options.disableSayDelay;
    if (options.participationStrategy) {
      this.participationStrategy = new options.participationStrategy(this);
    }

    this.conversationalPrograms = soul.conversationalPrograms;

    this.thoughtGenerator = new ThoughtGenerator(
      this.soul.chatStreamer,
      this.blueprint.name
    );
    this.thoughtGenerator.on(NeuralEvents.newThought, (thought: Thought) => {
      this.onNewThought(thought);
    });
    this.thoughtGenerator.on(NeuralEvents.noNewThoughts, () => {
      this.noNewThoughts();
    });
  }

  // TODO: let listeners get updated on this?
  addGeneratedThought(thought: Thought) {
    this.generatedThoughts.push(thought);
  }

  public reset() {
    this.thoughtGenerator.interrupt();
    this.thoughts = [];
    this.msgQueue = [];
    this.generatedThoughts = [];
  }

  private handleMessageThought(thought: Thought) {
    if (this.sayWaitDisabled) {
      return this.emit("says", thought.memory.content);
    }

    const questionRegex = /^(.*[.?!]) ([^.?!]+\?[^?]*)$/;
    const match = thought.memory.content.match(questionRegex);
    if (match) {
      const [_, message, followupQuestion] = match;
      this.emit("says", message);

      const minDelay = 3000;
      const maxDelay = 14000;
      const randomDelay =
        Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

      const sendFollowup = () => {
        this.emit("thinking");
        setTimeout(() => this.emit("says", followupQuestion), 3000);
      };
      this.followupTimeout = setTimeout(sendFollowup, randomDelay);
    } else {
      const punctuationRegex = /^(.*[.?!]) ([^.?!]+\?[^.!]*)$/;
      const match = thought.memory.content.match(punctuationRegex);
      if (match && Math.random() < 0.4) {
        const [_, message, followupStatement] = match;
        this.emit("says", message);

        const minDelay = 2000;
        const maxDelay = 4000;
        const randomDelay =
          Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

        const sendFollowup = () => {
          this.emit("thinking");
          setTimeout(() => this.emit("says", followupStatement), 3000);
        };
        setTimeout(sendFollowup, randomDelay);
      } else {
        this.emit("says", thought.memory.content);
      }
    }
  }

  private availableActions() {
    return this.currentPrograms.flatMap((p) => p.actions || []);
  }

  private handleInternalCognitionThought(thought: Thought) {
    const actionThought = this.generatedThoughts.find(
      (t) => t.memory.action.toLowerCase() === "action"
    );
    devLog(`\x1b[31m${actionThought} ${thought}\x1b[0m`);

    if (
      thought.memory.action.toLowerCase() === "action_input" &&
      actionThought !== undefined
    ) {
      devLog(`\x1b[31m${actionThought} ${thought}\x1b[0m`);
      if (!thought.memory.content) {
        return;
      }
      const action = this.availableActions().find((a) => {
        return (
          a.name.toLowerCase() === actionThought.memory.content.toLowerCase()
        );
      });
      if (action) {
        action.execute(thought.memory.content, this.soul, this);
      }

      return;
    }
    this.emit("thinks", thought.memory.content);
  }

  private onNewThought(thought: Thought) {
    this.generatedThoughts.push(thought);

    if (thought.isMessage()) {
      return this.handleMessageThought(thought);
    }

    return this.handleInternalCognitionThought(thought);
  }

  continueThinking() {
    this.thoughtGenerator.interrupt();
    this.thoughts = this.thoughts.concat(this.generatedThoughts);
    this.think();
  }

  private noNewThoughts() {
    devLog("🧠 SOUL finished thinking");

    this.thoughts = this.thoughts.concat(this.generatedThoughts);
    this.conversationalPrograms.forEach((m) =>
      m.update(this.generatedThoughts, this)
    );

    this.generatedThoughts = [];

    if (this.msgQueue.length === 0) {
      this.emit("break");
      return;
    }

    const msgThoughts = this.msgQueue.map(
      (text) =>
        new Memory({
          role: ChatMessageRoleEnum.User,
          entity: "user",
          action: "MESSAGES",
          content: text,
        })
    );
    this.thoughts = this.thoughts.concat(msgThoughts);
    this.msgQueue = [];

    this.think();
  }

  static concatThoughts(grouping: Thought[]): MRecord {
    return {
      role: grouping[0].memory.role,
      content: grouping.map((m) => m.toString()).join("\n"),
      name: grouping[0].memory.entity,
    };
  }

  static thoughtsToRecords(thoughts: Thought[]): MRecord[] {
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
      initialMessages.push(ConversationProcessor.concatThoughts(grouping));
    }

    return initialMessages;
  }

  private async think() {
    if (this.followupTimeout !== null) {
      clearTimeout(this.followupTimeout as NodeJS.Timeout);
      this.followupTimeout = null;
    }
    this.emit("thinking");
    devLog("🧠 SOUL is starting thinking...");

    this.currentPrograms = await Promise.all(
      this.conversationalPrograms.map((m) => m.toOutput(this))
    );

    // let systemProgram, remembranceProgram, vars;
    switch (this.blueprint.thoughtFramework) {
      case ThoughtFramework.Introspective:
        return this.thoughtGenerator.generate(
          mergePrograms(this.soul, this.currentPrograms)
        );
      default:
        throw Error("unknown thought framework");
    }
  }

  public tell(text: string, asUser?: string): void {
    const memory = new Memory({
      role: ChatMessageRoleEnum.User,
      entity: asUser || "user",
      action: "MESSAGES",
      content: text,
    });

    this.conversationalPrograms.forEach((m) => m.update([memory], this));

    this.thoughts.push(memory);
    this.think();
  }

  public seesTyping() {
    if (Math.random() < 0.7) {
      this.thoughtGenerator.interrupt();
    }
    if (this.followupTimeout !== null) {
      clearTimeout(this.followupTimeout as NodeJS.Timeout);
      this.followupTimeout = null;
    }
  }

  public async read(msg: Message) {
    const memory = new Memory({
      role: ChatMessageRoleEnum.User,
      entity: msg.userName,
      action: "MESSAGES",
      content: msg.text,
    });

    this.conversationalPrograms.forEach((m) => m.update([memory], this));
    this.thoughts.push(memory);

    if (!this.participationStrategy) {
      return;
    }

    if (this.followupTimeout !== null) {
      clearTimeout(this.followupTimeout as NodeJS.Timeout);
      this.followupTimeout = null;
    }

    const participate = await this.participationStrategy.decideToParticipate();
    if (participate) {
      this.think();
    }
  }
}
