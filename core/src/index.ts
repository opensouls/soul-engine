import { EventEmitter } from "events";
import { Configuration, OpenAIApi } from "openai";
import { OpenAIExt } from "openai-ext";

import { GPT, OpenaiConfig, OpenaiModel, Tag } from "./gptTagStream";
export { OpenaiConfig, OpenaiModel };

import { ThinkingObject, Complete, Customization, Personality } from "./customization";
export { ThinkingObject, Complete }



export class Samantha extends EventEmitter {

  private config : OpenaiConfig;
  private gpt: GPT;
  private customization : Customization;

  private tags: Tag[] = [];
  private generatedTags: Tag[] = [];
  private msgQueue: string[] = [];

  constructor(config: OpenaiConfig) {
    super();
    this.config = config;
    this.gpt = new GPT(config);
    this.customization = new Customization();

    this.gpt.on("tag", (tag: Tag) => {
      this.onNewTag(tag);
    });
    this.gpt.on("generated", () => {
      this.onGenerated();
    })
  }

  // Section - Utility

  public reset() {
    this.gpt.stopGenerate()
    this.tags = []
    this.msgQueue = []
    this.generatedTags = []
  }

  // Section - Conversation between User and Samantha

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

      this.gpt.generate(this.tags, this.customization.getSystemPrompt(), this.customization.getRemembrancePrompt());
    }
  }

  public tell(text: string): void {

    if (this.gpt.isGenerating() === true) {
      console.log("\n🧠 SAMANTHA IS THINKING...");

      const isThinkingAfterMessage = this.generatedTags.some(tag => tag?.isTypeMessage());

      if (isThinkingAfterMessage) {
        console.log("\n🔥SAMANTHA IS THINKING AFTER MESSAGE: ")
        this.msgQueue.push(text);
      }
      else {
        console.log("\n🔥SAMANTHA IS THINKING BEFORE MESSAGE: ")

        const tag = new Tag("USER", "MESSAGE", text);

        this.gpt.stopGenerate();
        this.generatedTags = []
        this.tags.push(tag);
        this.gpt.generate(this.tags, this.customization.getSystemPrompt(), this.customization.getRemembrancePrompt());
      }
    }
    else {
      console.log("\n🧠 SAMANTHA IS NOT THINKING...");

      const tag = new Tag("USER", "MESSAGE", text);

      this.tags.push(tag);
      this.gpt.generate(this.tags, this.customization.getSystemPrompt(), this.customization.getRemembrancePrompt());
      }
  }


  // Section - Customizinig Samantha

  public getPersonalityObject() : Personality {
    return this.customization.personality;
  }

  public setPersonalityObject(obj : Personality) {
    this.customization.personality = obj
  }


  // public getThoughtsBeforeBegin() : ThinkingObject[] {

  // }

  public thinkBeforeBegin(arr : ThinkingObject[]) {
    // this.customization.thinkBeforeBegin(arr);
  }

  public thinkBeforeMessage(arr : ThinkingObject[]) {
    this.customization.thinkBeforeMessage(arr);
  }

  public thinkAfterMessage(arr : ThinkingObject[]) {
    this.customization.thinkAfterMessage(arr);
  }


}