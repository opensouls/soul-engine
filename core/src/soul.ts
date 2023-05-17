import { LanguageProcessor, LMStream, Thought } from "./lmStream";

import { EventEmitter } from "events";

import { Blueprint, ThoughtFramework } from "./blueprint";

import { devLog } from "./utils";
import {
  getIntrospectiveRemembranceProgram,
  getIntrospectiveSystemProgram,
  getReflectiveLPSystemProgram,
} from "./TEMPLATES";

//TO DO: Turn Thoughts into Thoughts. Turn Thoughts into ThoughtPatterns
export class Soul extends EventEmitter {
  private lmStream: LMStream;

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

    this.lmStream = new LMStream(this.blueprint.languageProcessor);
    this.lmStream.on("tag", (tag: Thought) => {
      this.onNewThought(tag);
    });
    this.lmStream.on("generated", () => {
      this.onGenerated();
    });
  }

  public reset() {
    this.lmStream.stopGenerate();
    this.thoughts = [];
    this.msgQueue = [];
    this.generatedThoughts = [];
  }

  private onNewThought(tag: Thought) {
    this.generatedThoughts.push(tag);

    if (tag.isRoleAssistant()) {
      if (tag.isTypeMessage()) {
        devLog("🧠 SOUL says: " + tag.text);
        this.emit("says", tag.text);
      } else {
        devLog("🧠 SOUL thinks: " + tag.text);
        this.emit("thinks", tag.text);
      }
    }
  }
  private onGenerated() {
    devLog("🧠 SOUL finished thinking");

    this.thoughts = this.thoughts.concat(this.generatedThoughts);

    this.generatedThoughts = [];

    if (this.msgQueue.length > 0) {
      const msgThoughts = this.msgQueue.map(
        (text) => new Thought("USER", "MESSAGE", text)
      );
      this.thoughts = this.thoughts.concat(msgThoughts);
      this.msgQueue = [];

      this.generate();
    }
  }

  private generate() {
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

    this.lmStream.generate(this.thoughts, systemProgram, remembranceProgram);
  }

  public tell(text: string): void {
    const tag = new Thought("User", "Message", text);

    if (this.lmStream.isGenerating()) {
      devLog("🧠 SOUL is thinking...");

      const isThinkingBeforeSpeaking = !this.generatedThoughts.some((tag) =>
        tag?.isTypeMessage()
      );

      if (isThinkingBeforeSpeaking) {
        devLog("🧠 SOUL is thinking before speaking...");
        this.msgQueue.push(text);
      } else {
        devLog("🧠 SOUL is thinking after speaking...");

        this.lmStream.stopGenerate();
        this.generatedThoughts = [];
        this.thoughts.push(tag);
        this.generate();
      }
    } else {
      devLog("🧠 SOUL is not thinking.");

      this.thoughts.push(tag);
      this.generate();
    }
  }
}
