import { EventEmitter } from "events";
import { Configuration, OpenAIApi } from "openai";
import { OpenAIExt } from "openai-ext";

import { GPT, OpenaiConfig, OpenaiModel, Tag, TagRole, TagType } from "./gpt";
import { type } from "os";
import { text } from "stream/consumers";
export { OpenaiConfig, OpenaiModel };

export interface Message {
  text: string;
}

export interface Thought {
  text: string;
}

export class Samantha extends EventEmitter {
  private openaiConfig: OpenaiConfig;
  private gpt: GPT;
  private tags: Tag[] = [];
  private newTags: Tag[] = [];
  private tagQueue: Tag[] = [];
  constructor(config: OpenaiConfig) {
    super();
    this.openaiConfig = config;
    this.gpt = new GPT(config);

    this.gpt.on("tag", (tag: Tag) => {

      console.log("\n🌵NEW TAG --", tag.role, tag.type);
      this.newTags.push(tag);

      if (tag.role === TagRole.assistant) {
        if (tag.type === TagType.message) {
          this.emit("says", tag.text);
        } else {
          this.emit("thinks", tag.text)
        }
      }
    });
    this.gpt.on("generateComplete", () => {

      console.log("\n🌵GENERATE COMPLETE🌵\n")

      //Add newly generated tags
      console.log("New Tags🥎🥎", this.newTags.slice(-5), "🥎🥎")
      console.log("🥎🥎", this.tags.slice(-5), "🥎🥎")
      this.tags = this.tags.concat(this.newTags);
      console.log("\n🌵ADDED NEW TAGS --", this.newTags.length);
      this.newTags = []
      console.log("🥎🥎🥎", this.tags.slice(-5), "🥎🥎🥎")
      console.log("post-operation New Tags🥎🥎", this.newTags.slice(-5), "🥎🥎")

      if (this.tagQueue.length > 0) {
        this.tags = this.tags.concat(this.tagQueue);
        console.log("\n🌵ADDED QUEUED TAGS --", this.tagQueue.length);
        this.tagQueue = [];
        console.log("\n🌵STARTING NEW GENERATE🌵\n")
        this.gpt.generate(this.tags);
      }
    })
  }

  public reset() {
    this.gpt.stopGeneration()
    this.tags = []
    this.tagQueue = []
    this.newTags = []
  }

  public tell(text : String): void {
    
    const tag = {role : TagRole.user, type : TagType.message, text : text};

    if (this.gpt.isGenerating() === true) {
      console.log("\n🧠 SAMANTHA IS THINKING...");

      const isRetrospecting = this.newTags.some(tag => tag?.type === TagType.message);


      if (isRetrospecting) {
        console.log("\n🔥SAMANTHA IS THINKING ABOUT WHAT SHE SAID (PAST TENSE): ")
        this.tagQueue.push(tag);
      }
      else {
        console.log("\n🔥SAMANTHA IS THINKING ABOUT WHAT TO SAY (FUTURE TENSE): ")

        this.gpt.stopGeneration();
        this.newTags = []
        this.tags.push(tag);
        this.gpt.generate(this.tags);
      }
    }
    else {
      console.log("\n🧠 SAMANTHA IS NOT THINKING...");
      
      this.newTags = []
      this.tags.push(tag);
      this.gpt.generate(this.tags);
    }
  }
}



//Configuration