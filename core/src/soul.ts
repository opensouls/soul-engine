import { Configuration } from "openai";
import { GPT, OpenaiConfig, OpenaiModel, Tag } from "./gptStream";

import { EventEmitter } from "events";

import { Personality } from "./personality";

import { devLog } from "./utils";




//TO DO: Turn Tags into Thoughts. Turn Thoughts into ThoughtPatterns
export class Soul extends EventEmitter {

    private gpt: GPT;

    public personality: Personality;

    private tags: Tag[] = [];
    private generatedTags: Tag[] = [];
    private msgQueue: string[] = [];

    constructor(personality: Personality, config?: OpenaiConfig) {
        super();
        const openaiConfig: OpenaiConfig = config || new OpenaiConfig();
        this.gpt = new GPT(openaiConfig);

        this.personality = personality;

        this.gpt.on("tag", (tag: Tag) => {
            this.onNewTag(tag);
        });
        this.gpt.on("generated", () => {
            this.onGenerated();
        })
    }

    public reset() {
        this.gpt.stopGenerate()
        this.tags = []
        this.msgQueue = []
        this.generatedTags = []
    }

    private onNewTag(tag: Tag) {
        this.generatedTags.push(tag);

        if (tag.isRoleAssistant()) {

            if (tag.isTypeMessage()) {

                devLog("🧠 SOUL says: " + tag.text)
                this.emit("says", tag.text);

            } else {

                devLog("🧠 SOUL thinks: " + tag.text)
                this.emit("thinks", tag.text)

            }
        }
    }
    private onGenerated() {

        devLog("🧠 SOUL finished thinking")

        this.tags = this.tags.concat(this.generatedTags);

        this.generatedTags = []

        if (this.msgQueue.length > 0) {

            const msgTags = this.msgQueue.map(text => new Tag("USER", "MESSAGE", text));
            this.tags = this.tags.concat(msgTags);
            this.msgQueue = [];

            this.generate();
        }
    }

    private generate() {

        devLog("🧠 SOUL is starting thinking...")

        const systemPrompt = `<Background>
      You are modeling the mind of ${this.personality.name}, ${this.personality.shortPersonality}
      
      ${this.personality.longPersonality}
      </Background>
      
      <Plan>
      ${this.personality.initialPlan}
      </Plan>`;

        const rememberancePrompt = `Remember you are ${this.personality.name}, ${this.personality.shortPersonality} as described in the system prompt.
      Now, think through ${this.personality.name}'s response to the last message using the following output format.
  
      <FEELING>I feel [[fill in]]</FEELING>
      <THOUGHT>I want [[fill in]]</THOUGHT>
      <MESSAGE>[[use insight to craft a message to the user]]</MESSAGE>
      <SELF ANALYSIS>In retrospect, I [[fill in]]</SELF ANALYSIS>`

        this.gpt.generate(this.tags, systemPrompt, rememberancePrompt);
    }

    public tell(text: string): void {

        const tag = new Tag("User", "Message", text);

        if (this.gpt.isGenerating() === true) {
            devLog("🧠 SOUL is thinking...")

            const isThinkingBeforeSpeaking = (this.generatedTags.some(tag => tag?.isTypeMessage()) === false);

            if (isThinkingBeforeSpeaking) {
                devLog("🧠 SOUL is thinking before speaking...")
                this.msgQueue.push(text);
            }
            else {
                devLog("🧠 SOUL is thinking after speaking...")

                this.gpt.stopGenerate();
                this.generatedTags = []
                this.tags.push(tag);
                this.generate()
            }
        }
        else {
            // console.log("\n🧠 Soul is not thinking...");
            devLog("🧠 SOUL is not thinking.")

            this.tags.push(tag);
            this.generate()
        }
    }

}
