import { ParticipationStrategy } from "../..";
import { Blueprint } from "../../blueprint";
import { ConversationProcessor } from "../../conversationProcessor";
import { ChatMessageRoleEnum, getTag } from "../../languageModels";
import { devLog } from "../../utils";

export class GroupParticipationStrategy implements ParticipationStrategy {
  conversation: ConversationProcessor;
  blueprint: Blueprint;

  constructor(conversation: ConversationProcessor) {
    this.conversation = conversation;
    this.blueprint = conversation.soul.blueprint;
  }

  async decideToParticipate(): Promise<boolean> {
    const k = 7;
    const thoughts = this.conversation.thoughts;
    const soul = this.conversation.soul;

    const latestThoughts = thoughts
      .filter((thought) => thought.memory.action === "MESSAGES")
      .slice(-k);
    const instructions = [
      {
        role: ChatMessageRoleEnum.System,
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
        role: ChatMessageRoleEnum.User,
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
    const res = await soul.languageProgramExecutor.execute(instructions);
    const answer = getTag({ tag: "ANSWER", input: res }).toLowerCase();
    devLog(res);
    return answer === "yes";
  }
}
