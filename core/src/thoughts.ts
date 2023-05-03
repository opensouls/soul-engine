export const Complete = Symbol("Complete");

// example.ts
export enum ThoughtTiming {
    THOUGHTS_BEFORE_INTRO = "thoughtsBeforeIntro",
    THOUGHTS_AFTER_INTRO = "thoughtsAfterIntro",
    THOUGHTS_BEFORE_SPEAKING = "thoughtsBeforeSpeaking",
    THOUGHTS_AFTER_SPEAKING = "thoughtsAfterSpeaking"
  }


export class ThoughtPattern {
    private type: string;
    private values: (string | typeof Complete)[];
    private readonly fillIn: string = "[[fill in]]";

    constructor(type: string, ...values: (string | typeof Complete)[]) {
        if (type.length === 0) {
            throw new Error("First argument must be a non-empty string");
        }
        this.type = type.toUpperCase();
        this.values = values.length > 0 ? values : [Complete];
    }

    //Reminder: Tags perform better with newline in-between
    public toString(): string {
        const strValues = this.values.map(val => val === Complete ? this.fillIn.trim() : val.trim()).join(' ');
        return `<${this.type.trim()}>\n${strValues.toLowerCase().trim()}\n</${this.type.trim()}>`;
    }
}

export class Thoughts {
    public thoughtsBeforeIntro: ThoughtPattern[] = [];
    public thoughtsAfterIntro: ThoughtPattern[] = [];
    public thoughtsBeforeSpeaking: ThoughtPattern[] = [];
    public thoughtsAfterSpeaking: ThoughtPattern[] = [];


    public createRememberancePrompt() {
        //TO DO: GPT Function that takes Personality and Thoughts and creates systemPrompt and rememberancePrompt
        const name = "an AI"
        const tagline = "an AI Spirit"

        const introThought = `Remember you are ${name}, ${tagline}, and thought provoking conversationalist, as described in the system prompt.
        Now, think through ${name}'s response to the last message using the following output format.`;

        let thoughtBeforeSpeaking = this.thoughtsBeforeSpeaking.map(function (obj) {
            return obj.toString();
        }).join("\n");

        const thoughtAboutSpeaking: string = '<MESSAGE>[[use insight to craft a message to the user]]</MESSAGE>';

        let thoughtAfterSpeaking = this.thoughtsAfterSpeaking.map(function (obj) {
            return obj.toString();
        }).join("\n");

        return `${introThought}${thoughtBeforeSpeaking}\n${thoughtAboutSpeaking}\n${thoughtAfterSpeaking}`;
    }


}