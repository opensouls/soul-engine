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


    public async generate(tags: Tag[], systemPrompt : string, remembrancePrompt : string) {

        const apiKey = this.openaiConfig.apiKey;
        const model = this.openaiConfig.model;

        const configuration = new Configuration({ apiKey });
        const openaiApi = new OpenAIApi(configuration);

        const openaiStreamConfig = {
            openai: openaiApi,
            handler: {
                onContent: (content: string, isFinal: boolean, stream: any) => {

                    const tag = this.contentToTag(content, isFinal);
                    if (tag) { this.emitTagEvent(tag) }
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



    private tagsToMessages(tags: Tag[], systemPrompt : string, remembrancePrompt : string): OpenaiMessage[] {
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
            // add in rememberence at end of system prompt to ensure output format from GPT is fixed
            // only necessary after first message sent by user
            finalMessages = finalMessages.concat({
                role: "system",
                content: remembrancePrompt,
            });
        }
        return finalMessages;
    }

    private contentToTag(content: string, isFinal: boolean): Tag | null {
        // console.log("isFinal", isFinal, "content: ", content)
        if (isFinal) {
            //
        } else {
            let inputString = content;
            const regex = /<\/([A-Z\s]+)>$/;
            const match = inputString.trimEnd().match(regex);
            if (match) {
                const type = match[1];
                const openingTagRegex = new RegExp(`<${type}>`, "i");
                const openingTagMatch = inputString.match(openingTagRegex);
                if (openingTagMatch) {
                    const startIndex = openingTagMatch?.index !== undefined ? openingTagMatch.index + openingTagMatch[0].length : undefined;
                    const endIndex = match.index;
                    const text = inputString.slice(startIndex, endIndex).trim();

                    return new Tag("ASSISTANT", type, text)
                }
            }
        }
        return null;
    }


}