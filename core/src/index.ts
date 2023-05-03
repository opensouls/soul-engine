import { EventEmitter } from "events";

import { GPT, OpenaiConfig, OpenaiModel, Tag } from "./gptStream";
export { OpenaiConfig, OpenaiModel };

import { Personality, SamanthaPersonality } from "./personality";

import { Thoughts, Complete, ThoughtPattern, ThoughtTiming } from "./thoughts";
export { Complete, ThoughtPattern, ThoughtTiming }


//TO DO: Turn Tags into Thoughts. Turn Thoughts into ThoughtPatterns
export class Soul extends EventEmitter {

  private config: OpenaiConfig;
  private gpt: GPT;

  private personality: Personality = new Personality()
  private thoughts: Thoughts = new Thoughts()

  private tags: Tag[] = [];
  private generatedTags: Tag[] = [];
  private msgQueue: string[] = [];

  constructor(config: OpenaiConfig) {
    super();
    this.config = config;
    this.gpt = new GPT(config);

    this.gpt.on("tag", (tag: Tag) => {
      this.onNewTag(tag);
    });
    this.gpt.on("generated", () => {
      this.onGenerated();
    })
  }

  //TO DO: Document
  public updatePersonality(obj : Partial<Personality>) {
    Object.assign(this.personality, obj);
  }

  //TO DO: Document
  public from(personalityType : string) : void {
    //TO DO: FIX
    if (personalityType.toUpperCase() === "SAMANTHA") {
      this.personality = new SamanthaPersonality();
    } else {
      throw new Error("Invalid Personality Enum");
    }
  }

  //TO DO: Document
  public updateThoughts(timing : ThoughtTiming, pattern : ThoughtPattern[]) {
    switch (timing) {
      case ThoughtTiming.THOUGHTS_BEFORE_INTRO:
        this.thoughts.thoughtsBeforeIntro = pattern
        break;
      case ThoughtTiming.THOUGHTS_AFTER_INTRO:
        this.thoughts.thoughtsAfterIntro = pattern
        break;
      case ThoughtTiming.THOUGHTS_BEFORE_SPEAKING:
        this.thoughts.thoughtsBeforeSpeaking = pattern
        break;
      case ThoughtTiming.THOUGHTS_AFTER_SPEAKING:
        this.thoughts.thoughtsAfterSpeaking = pattern
        break;
      default:
        throw new Error("Invalid ThoughtTiming Enum");
    }
  }

  //TO DO: Document
  public reset() {
    this.gpt.stopGenerate()
    this.tags = []
    this.msgQueue = []
    this.generatedTags = []
  }
  
  //TO DO: Document
  private onNewTag(tag: Tag) {
    this.generatedTags.push(tag);

    if (tag.isRoleAssistant()) {

      if (tag.isTypeMessage()) {

        this.emit("says", tag.text);

      } else {

        this.emit("thinks", tag.text)

      }
    }
  }
  private onGenerated() {
    this.tags = this.tags.concat(this.generatedTags);

    this.generatedTags = []

    if (this.msgQueue.length > 0) {

      const msgTags = this.msgQueue.map(text => new Tag("USER", "MESSAGE", text));
      this.tags = this.tags.concat(msgTags);
      this.msgQueue = [];

      this.gpt.generate(this.tags, this.personality.createSystemPrompt(), this.thoughts.createRememberancePrompt());
    }
  }

  public tell(text: string): void {

    const tag = new Tag("User", "Message", text);

    if (this.gpt.isGenerating() === true) {
      console.log("\n🧠 Soul is Thinking...");

      const isThinkingBeforeSpeaking = (this.generatedTags.some(tag => tag?.isTypeMessage()) === false);

      if (isThinkingBeforeSpeaking) {
        console.log("\n🔥SOUL is thinking before speaking")
        this.msgQueue.push(text);
      }
      else {
        console.log("\n🔥SOUL is thinking after speaking")

        this.gpt.stopGenerate();
        this.generatedTags = []
        this.tags.push(tag);
        this.gpt.generate(this.tags, this.personality.createSystemPrompt(), this.thoughts.createRememberancePrompt());
      }
    }
    else {
      console.log("\n🧠 Soul is not thinking...");

      this.tags.push(tag);
      this.gpt.generate(this.tags, this.personality.createSystemPrompt(), this.thoughts.createRememberancePrompt());
    }
  }



}