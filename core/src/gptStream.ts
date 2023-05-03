import { EventEmitter } from "events";
import { Configuration, OpenAIApi } from "openai";
import { OpenAIExt } from "openai-ext";


//SAMANTHA AI

export class Tag {
    role: string;
    type: string;
    text: string;

    constructor(role: string, type: string, text: string) {
        this.role = role;
        this.type = type;
        this.text = text;
        this.format();
    }

    format() {
        this.role = this.role.toUpperCase()
        this.type = this.type.toUpperCase()
    }

    setRole(role: string) {
        this.role = role;
        this.format();
    }
    setType(type: string) {
        this.type = type;
        this.format();
    }
    setText(text: string) {
        this.text = text;
        this.format();
    }

    //Role:
    isRoleAssistant(): Boolean {
        return (this.role === "ASSISTANT");
    }

    //Type:
    isTypeMessage(): Boolean {
        return (this.type === "MESSAGE");
    }
}



//OPEN AI

export enum OpenaiModel {
    gpt_4 = "gpt-4",
    gpt_3_5_turbo = "gpt-3.5-turbo",
}

export class OpenaiConfig {
    apiKey: string;
    model: OpenaiModel;

    constructor(config?: Partial<OpenaiConfig>) {
        this.apiKey = config?.apiKey || process.env.OPENAI_API_KEY || '';
        this.model = config?.model || OpenaiModel.gpt_3_5_turbo;
        if (!this.apiKey) {
            throw new Error('API key not provided and not found in environment variables.');
        }
    }
}

interface OpenaiMessage {
    role: string;
    content: string;
}




export class GPT extends EventEmitter {
    private openaiConfig: OpenaiConfig;
    private stream: any = null;

    constructor(config: OpenaiConfig) {
        super();
        this.openaiConfig = config
    }

    private emitTagEvent(tag: Tag) {
        this.emit("tag", tag);
    }
    private emitGeneratedEvent() {
        this.emit("generated");
    }

    public stopGenerate(): void {
        if (this.stream) {
            try {
                this.stream.destroy();
            } catch (error) {
                console.error('Failed to destroy the stream:', error);
            } finally {
                this.stream = null;
            }
        }
    }

    public isGenerating(): Boolean {
        if (this.stream) {
            return true
        } else {
            return false
        }
    }

    private oldTags: Tag[] = []
    public async generate(tags: Tag[], systemPrompt: string, remembrancePrompt: string) {

        const apiKey = this.openaiConfig.apiKey;
        const model = this.openaiConfig.model;

        const configuration = new Configuration({ apiKey });
        const openaiApi = new OpenAIApi(configuration);

        const openaiStreamConfig = {
            openai: openaiApi,
            handler: {
                onContent: (content: string, isFinal: boolean, stream: any) => {

                    // console.log("🌵", content, "🌵");

                    //TO DO: Fix Bug where content ends on non-closing bracket.

                    let newTags = this.extractTags(content.replace(/(\r\n|\n|\r)/gm, ""));
                    // console.log("🔥", newTags);
                    let diffTags = this.getUniqueTags(newTags, this.oldTags)
                    this.oldTags = newTags;
                    diffTags.forEach(diffTag => {
                        this.emitTagEvent(diffTag)
                    });
                },
                onDone: (stream: any) => {
                    this.emitGeneratedEvent();
                    this.stopGenerate();
                },
                onError: (error: Error, stream: any) => {
                    // console.error("Openai Stream Error: ", error);
                },
            },
        };

        const messages = this.tagsToMessages(tags, systemPrompt, remembrancePrompt);
        console.log("\n<🫥\n", messages, "\n🫥>\n")

        const openaiStreamResponse = await OpenAIExt.streamServerChatCompletion(
            {
                model: model,
                messages: messages,
            },
            openaiStreamConfig
        );

        this.stream = openaiStreamResponse.data;
    }
    
    private getUniqueTags(newArray: Tag[], oldArray: Tag[]): Tag[] {
        return newArray.filter((newTag) =>
          !oldArray.some((oldTag) =>
            newTag.role === oldTag.role && newTag.type === oldTag.type && newTag.text === oldTag.text
          )
        );
      }


    private tagsToMessages(tags: Tag[], systemPrompt: string, remembrancePrompt: string): OpenaiMessage[] {
        // First, map each tag to an OpenaiMessage
        const initialMessages = tags.map(tag => {
            let content = tag.text;
            if (tag.isRoleAssistant()) {
                content = `<${tag.type}>${tag.text}</${tag.type}>`;
            }
            return {
                role: tag.role.toLowerCase(),
                content: content
            } as OpenaiMessage;
        });

        // Then, reduce the array of OpenaiMessages, merging consecutive messages with the same role
        const reducedMessages = initialMessages.reduce((messages: OpenaiMessage[], currentMessage) => {
            const previousMessage = messages[messages.length - 1];
            if (previousMessage && previousMessage.role === currentMessage.role) {
                previousMessage.content += currentMessage.content;
            }
            else {
                messages.push(currentMessage);
            }
            return messages;
        }, []);



        let truncatedMessages = reducedMessages
        if (reducedMessages.length > 10) {
            if (reducedMessages.length === 11) {
                truncatedMessages = reducedMessages.slice(0, 1).concat(reducedMessages.slice(2));
            } else if (reducedMessages.length === 12) {
                truncatedMessages = reducedMessages.slice(0, 2).concat(reducedMessages.slice(3));
            } else if (reducedMessages.length === 13) {
                truncatedMessages = reducedMessages.slice(0, 3).concat(reducedMessages.slice(4));
            } else {
                truncatedMessages = reducedMessages.slice(0, 3).concat(reducedMessages.slice(-10));
            }
        }


        let finalMessages = truncatedMessages;
        finalMessages = [{
            role: "system",
            content: systemPrompt
        }].concat(finalMessages);
        if (truncatedMessages.length > 0) {
            finalMessages = finalMessages.concat({
                role: "system",
                content: remembrancePrompt,
            });
        }
        return finalMessages;
    }

    private extractTags(content: string): Tag[] {

        const regex = /<([A-Z]+)>(.*?)<\/\1>/g;
        const matches = content.matchAll(regex);
        const extractedTags = [];

        for (const match of matches) {
            const [fullTag, tag, content] = match;
            const completeTag = `<${tag}>${content}</${tag}>`;
            const extractedTag = new Tag("assistant", tag, content);
            extractedTags.push(extractedTag);
        }

        return extractedTags;

    }

}