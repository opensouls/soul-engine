import {
  Memory,
  MRecord,
  NeuralEvents,
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
import { getTag, processLMProgram } from "./lmProcessing";
import { Soul } from "./soul";
import { Action } from "./action";

export type Message = {
  userName: string;
  text: string;
};

export interface ConversationalContext {
  toString(): string;
}

export enum ParticipationStrategy {
  ALWAYS_REPLY,
  CONSUME_ONLY,
  GROUP_CHAT,
}

export class ConversationProcessor extends EventEmitter {
  private thoughtGenerator: ThoughtGenerator;

  public soul: Soul;
  public blueprint: Blueprint;

  private thoughts: Thought[] = [];
  private peopleMemory: PeopleMemory;

  private generatedThoughts: Thought[] = [];
  private msgQueue: string[] = [];
  private followupTimeout: NodeJS.Timeout | null = null;
  private context: ConversationalContext;

  private sayWaitDisabled? = false;

  constructor(soul: Soul, context: ConversationalContext) {
    super();

    this.soul = soul;
    this.context = context;
    this.blueprint = soul.blueprint;
    this.sayWaitDisabled = soul.options.disableSayDelay;

    this.peopleMemory = new PeopleMemory(this.blueprint);
    this.thoughtGenerator = new ThoughtGenerator(
      this.blueprint.languageProcessor,
      this.blueprint.name,
    );
    this.thoughtGenerator.on(NeuralEvents.newThought, (thought: Thought) => {
      this.onNewThought(thought);
    });
    this.thoughtGenerator.on(NeuralEvents.noNewThoughts, () => {
      this.noNewThoughts();
    });
  }

  private availableActions(): Action[] {
    const rambleAction: Action = {
      name: "rambleAfterResponding",
      description:
        "If you want to continue talking, without waiting for a response. Use YES or NO as input.",
      execute: (input, _soul, conversation) => {
        devLog(`executing ramble action with input: ${input}`);
        if (input.toLowerCase() === "no") {
          return;
        }
        conversation.generatedThoughts.push(
          new Thought({
            role: "assistant",
            entity: this.blueprint.name,
            action: "RAMBLE",
            content: "I want to ramble before they respond",
          }),
        );
        conversation.continueThinking();
      },
    };
    return [rambleAction].concat(this.soul.actions);
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

  private continueThinking() {
    this.thoughtGenerator.interrupt();
    this.thoughts = this.thoughts.concat(this.generatedThoughts);
    this.think();
  }

  private noNewThoughts() {
    devLog("🧠 SOUL finished thinking");

    const request = ConversationProcessor.concatThoughts(
      this.generatedThoughts,
    );
    this.peopleMemory.update(request as ChatCompletionRequestMessage);
    this.thoughts = this.thoughts.concat(this.generatedThoughts);

    this.generatedThoughts = [];

    if (this.msgQueue.length === 0) {
      this.emit("break");
      return;
    }

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
    remembranceProgram?: string,
    memory?: MRecord,
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
      initialMessages.push(ConversationProcessor.concatThoughts(grouping));
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
    const preamble = [
      {
        role: "system",
        content: systemProgram,
        name: "systemBrain",
      },
    ] as MRecord[];
    if (memory !== undefined) {
      preamble.push(memory as MRecord);
    }
    finalMessages = preamble.concat(finalMessages);
    if (truncatedMessages.length > 0 && remembranceProgram !== undefined) {
      finalMessages = finalMessages.concat({
        role: "system",
        content: remembranceProgram,
        name: "systemBrain",
      });
    }
    return finalMessages;
  }

  private async decideToParticipate(): Promise<boolean> {
    const k = 7;
    const latestThoughts = this.thoughts
      .filter((thought) => thought.memory.action === "MESSAGES")
      .slice(-k);
    const instructions = [
      {
        role: "system",
        content: `
<BACKGROUND>
Below is a conversation with ${this.blueprint.name}, ${this.blueprint.essence}

${this.blueprint.personality}
</BACKGROUND>

<CONTEXT>The following contains a group conversation</CONTEXT>

<CONVERSATION>
${latestThoughts.map((t) => `${t.memory.entity}: ${t.toString()}`).join("\n")}
</CONVERSATION>
`.trim(),
      },
      {
        role: "user",
        content: `
<QUESTION>Please think through whether ${this.blueprint.name} speaks next or not using the following notes and output format</QUESTION>

<NOTES>
-Doesn't speak if someone else is referenced or mentioned
-If referenced or mentioned, including by a nickname then jumps in!
-If already continuing a conversation, continues speaking
</NOTES>

Use the following output format:

<LAST_MESSAGE>[[repeat the last message]]</LAST_MESSAGE>
<REASON>[[explain if ${this.blueprint.name} speaks next or not]]</REASON>
<ANSWER>[[use the reason to decide if ${this.blueprint.name} speaks next: answer yes or no]]</ANSWER>
`.trim(),
      },
    ];
    const res = await processLMProgram(
      instructions as ChatCompletionRequestMessage[],
    );
    const answer = getTag({ tag: "ANSWER", input: res }).toLowerCase();
    devLog(res);
    return answer === "yes";
  }

  private async think() {
    if (this.followupTimeout !== null) {
      clearTimeout(this.followupTimeout as NodeJS.Timeout);
      this.followupTimeout = null;
    }
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
          context: this.context.toString(),
          actions: this.availableActions(),
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
          context: this.context.toString(),
          actions: this.availableActions(),
        };
        systemProgram = getReflectiveLPSystemProgram(vars);
        break;
      default:
        throw Error("");
    }

    const userNames = this.thoughts
      .filter((t) => t.memory.role === "user")
      .map((t) => t.memory.entity);
    const lastUserName = userNames.slice(-1)[0];
    let memory;
    if (lastUserName !== undefined) {
      try {
        memory = {
          role: "assistant",
          content: this.peopleMemory.retrieve(lastUserName),
          name: this.blueprint.name,
        } as MRecord;
      } catch (err: any) {
        devLog(`Error creating memory: ${err.toString()}`);
      }
    }

    const messages = ConversationProcessor.thoughtsToRecords(
      this.thoughts,
      systemProgram,
      remembranceProgram,
      memory,
    );
    // devLog("\n💬\n" + messages.map((m) => m.content).join(", ") + "\n💬\n");
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

  public seesTyping() {
    if (Math.random() < 0.7) {
      this.thoughtGenerator.interrupt();
    }
    if (this.followupTimeout !== null) {
      clearTimeout(this.followupTimeout as NodeJS.Timeout);
      this.followupTimeout = null;
    }
  }

  public async read(
    msg: Message,
    participationStrategy: ParticipationStrategy,
  ) {
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
    } else if (participationStrategy === ParticipationStrategy.GROUP_CHAT) {
      if (this.followupTimeout !== null) {
        clearTimeout(this.followupTimeout as NodeJS.Timeout);
        this.followupTimeout = null;
      }
      const participate = await this.decideToParticipate();
      if (!participate) {
        return;
      }
      this.think();
    }
  }

  public inspectPeopleMemory(userName: string): string {
    return this.peopleMemory.retrieve(userName);
  }
}
