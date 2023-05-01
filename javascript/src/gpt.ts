import { EventEmitter } from "events";
import { Configuration, OpenAIApi } from "openai";
import { OpenAIExt } from "openai-ext";
import { systemPrompt, remembrancePrompt } from "./utils";


//SAMANTHA AI

export interface Tag {
    role: TagRole;
    type: TagType;
    text: String;
}

export enum TagRole {
    assistant = "assistant",
    user = "user",
}
export enum TagType {
    thought = "thought",
    message = "message",
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
    role: String;
    content: String;
}




export class GPT extends EventEmitter {
    private openaiConfig: OpenaiConfig;
    private stream: any;

    constructor(config: OpenaiConfig) {
        super();
        this.openaiConfig = config
        this.stream = null;
    }

    public stopGeneration() : void {
        if (this.stream) {
            this.stream.destroy()
            this.stream = null;
        }
        this.stream = null;
    }

    private deliverTag(tag: Tag) {
        this.emit("tag", tag);
    }
    private deliverGenerateCompleteUpdate() {
        this.emit("generateComplete");
    }

    public isGenerating() : Boolean {
        if (this.stream) {
            return true
        } else {
            return false
        }
    }


    public async generate(tags: Tag[]) {

        console.log("🔥", tags.slice(-5), "🔥")

        const messages = this.tagsToMessages(tags);

        const apiKey = this.openaiConfig.apiKey;
        const model = this.openaiConfig.model;

        const configuration = new Configuration({ apiKey });
        const openaiApi = new OpenAIApi(configuration);

        const openaiStreamConfig = {
            openai: openaiApi,
            handler: {
                onContent: (content: string, isFinal: boolean, stream: any) => {
                    const tag = this.messageToTag(content, isFinal);
                    if (tag) { this.deliverTag(tag) }
                },
                onDone: (stream: any) => {
                    this.deliverGenerateCompleteUpdate();
                    this.stopGeneration();
                },
                onError: (error: Error, stream: any) => {
                    // console.error("Openai Stream Error: ", error);
                },
            },
        };

        // console.log("🔥", messages, "🔥")
        const openaiStreamResponse = await OpenAIExt.streamServerChatCompletion(
            {
                model: model,
                messages: messages,
            },
            openaiStreamConfig
        );
        this.stream = openaiStreamResponse.data;
    }



    private tagsToMessages(tags: Tag[]): OpenaiMessage[] {
        // First, map each tag to an OpenaiMessage
        const initialMessages = tags.map(tag => {
            const messageContent = `<${tag.type.toUpperCase()}>\n${tag.text}\n</${tag.type.toUpperCase()}>`;
            return {
                role: tag.role,
                content: messageContent
            } as OpenaiMessage;
        });

        // Then, reduce the array of OpenaiMessages, merging consecutive messages with the same role
        const reducedMessages = initialMessages.reduce((messages: OpenaiMessage[], currentMessage) => {
            const previousMessage = messages[messages.length - 1];

            // If the previous message exists and has the same role as the current message,
            // merge the current message's content into the previous message's content
            if (previousMessage && previousMessage.role === currentMessage.role) {
                previousMessage.content += "\n" + currentMessage.content;
            }
            // Otherwise, just add the current message to the list of messages
            else {
                messages.push(currentMessage);
            }
            return messages;
        }, []);



        let truncatedMessages = this.truncateItems(reducedMessages)


        let finalMessages = truncatedMessages;
        finalMessages = [{ role: "system", content: systemPrompt }].concat(
            finalMessages
        );
        if (truncatedMessages.length > 0) {
            // add in rememberence at end of system prompt to ensure output format from GPT is fixed
            // only necessary after first message sent by user
            finalMessages = finalMessages.concat({
                role: "system",
                content: remembrancePrompt,
            });
        }
        return finalMessages;
    }


    private truncateItems(messages: any[]): any[] {
        let sentMessages = messages;
        if (messages.length > 10) {
            if (messages.length === 11) {
                sentMessages = messages.slice(0, 1).concat(messages.slice(2));
            } else if (messages.length === 12) {
                sentMessages = messages.slice(0, 2).concat(messages.slice(3));
            } else if (messages.length === 13) {
                sentMessages = messages.slice(0, 3).concat(messages.slice(4));
            } else {
                sentMessages = messages.slice(0, 3).concat(messages.slice(-10));
            }
        }
        return sentMessages;
    }



    private messageToTag(content: string, isFinal: boolean): Tag | null {
        if (isFinal) {
            let inputString = content;
            const openingTagRegex = /<([A-Z]+)[^>]*>/gi;
            let match: RegExpExecArray | null;
            let lastMatch: RegExpExecArray | null = null;
            while ((match = openingTagRegex.exec(inputString)) !== null) {
                lastMatch = match;
            }
            if (lastMatch) {
                const type = lastMatch[1];
                const startIndex = lastMatch.index + lastMatch[0].length;
                const endIndex = inputString.lastIndexOf(`</${type}>`);
                const text = inputString.slice(startIndex, endIndex).trim();
                if (type.toUpperCase() === "MESSAGE") {
                    return {role: TagRole.assistant, type: TagType.message, text: text}
                } else {
                    return {role: TagRole.assistant, type: TagType.thought, text: text}
                }
            }
        } else {
            let inputString = content;
            const regex = /<\/([A-Z]+)>$/;
            const match = inputString.trimEnd().match(regex);
            if (match) {
                const type = match[1];
                const openingTagRegex = new RegExp(`<${type}>`, "i");
                const openingTagMatch = inputString.match(openingTagRegex);
                if (openingTagMatch) {
                    const startIndex = openingTagMatch?.index !== undefined ? openingTagMatch.index + openingTagMatch[0].length : undefined;
                    const endIndex = match.index;
                    const text = inputString.slice(startIndex, endIndex).trim();
                    if (type.toUpperCase() === "MESSAGE") {
                        return {role: TagRole.assistant, type: TagType.message, text: text}
                    } else {
                        return {role: TagRole.assistant, type: TagType.thought, text: text}
                    }
                }
            }
        }
        return null;
    }

}