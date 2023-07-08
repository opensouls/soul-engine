import { devLog } from "../../utils";
import { ConversationProcessor } from "../../conversationProcessor";
import { ChatMessage, ChatMessageRoleEnum, getTag } from "../../languageModels";
import { Thought } from "../../languageModels/memory";
import { Soul } from "../../soul";

export class PersonModel {
  userName: string;
  soul: Soul;
  observerName: string;
  name = "I'm not yet sure their real name";
  mood = "I'm not sure yet what their mood is";
  narrative = `- they're messaging me for the first time`;
  goals = "Because they're messaging me they probably want to interact";
  state = "Interested to engage";
  private buffer: ChatMessage[];

  constructor(soul: Soul, userName: string) {
    this.buffer = [];
    this.userName = userName;
    this.soul = soul;
    this.observerName = this.soul.blueprint.name;
  }

  toLinguisticProgram(_conversation: ConversationProcessor) {
    return `<CONTEXT>To date, ${this.observerName} remembers the following about ${this.name}, including records of their NAME, basic FACTS, current HISTORY narrative, personal GOALS, MOOD, and MENTAL STATE.</CONTEXT>

Their historical memory, which may include blanks yet to be learned from conversation, reads:

<ENTITY>
  <NEW INFORMATION LEARNED>[[to fill in]]</NEW INFORMATION LEARNED>
  <USERNAME>${this.userName}</USERNAME>
  <NAME>${this.name}</NAME>
  <HISTORY>${this.narrative}</HISTORY>
  <GOALS>${this.goals}</GOALS>
  <MOOD>${this.mood}</MOOD>
  <MENTAL STATE>${this.state}</MENTAL STATE>
</ENTITY>`;
  }

  public async update(
    thoughts: Thought[],
    conversation: ConversationProcessor
  ) {
    const { role, entity: name } = thoughts[0].memory;
    const content = thoughts.map((t) => t.memory.content).join("\n");

    if ((role === "user" && this.userName === name) || role === "assistant") {
      this.buffer.push({ role, content, name } as ChatMessage);
    }
    // only update on new user message
    if (role !== "user" || this.userName !== name) {
      return;
    }
    if (this.buffer.length > 5) {
      this.buffer = this.buffer.slice(-5);
    }
    const program = `<CONSIDERATIONS>
- ONLY information from the new messages is used to inform the updates
- DO NOT DRAW UPON OUTSIDE KNOWLEDGE, JUST INFER FROM READING THE NEW MESSAGES

==>NAME
- NAME is the userName's preference for how they would like to be called in conversation

==>LIKES/DISLIKES
- LIKES/DISLIKES is basic facts about ${this.userName}, e.g. 'likes coffee'

==>HISTORY
- The HISTORY is additive, rarely forgetting information
- Where appropriate the HISTORY information has been condensed
- The HISTORY contains a maximum of 20 bullet points
- Once the HISTORY is longer than 5 bullet points, then the least important bullet points are forgotten

==>GOALS
- The GOALS contains ${this.observerName}'s belief about ${this.name}'s goals in a few sentences
- The GOALS section should ALWAYS have a guess, even if imperfect

==>MENTAL STATE
- The MENTAL STATE contains ${this.observerName}'s belief about ${this.name}'s mental state in a few sentences
- The MENTAL STATE contains only information about ${this.name}, no particular directives on how to proceed
- The MENTAL STATE section should ALWAYS have a guess, even if imperfect
</CONSIDERATIONS>

<IMPORTANT>
No facts are inferred about ${this.name} from outside the messages and the prior memory.
</IMPORTANT>

After reading the new messages ${this.observerName}'s entity record of ${this.name} now has the form:

<ENTITY>
  <NEW INFORMATION LEARNED>[[EXPLAIN]]</NEW INFORMATION LEARNED>
  <USERNAME>${this.userName}</USERNAME>
  <NAME>[[update from new messages]]</NAME>
  <HISTORY>[[update from new messages]]</HISTORY>
  <GOALS>[[update from new messages]]</GOALS>
  <MOOD>[[update from new messages]]</MOOD>
  <MENTAL STATE>[[update from new messages]]</MENTAL STATE>
</ENTITY>

and reads

<ENTITY>
  <NEW INFORMATION LEARNED>`;
    let instructions = [
      {
        role: ChatMessageRoleEnum.System,
        content:
          this.toLinguisticProgram(conversation) +
          `\n\nThen, the following messages were exchanged.`,
      },
    ];
    instructions = instructions.concat(this.buffer as any);
    instructions = instructions.concat([
      { role: ChatMessageRoleEnum.System, content: program },
    ] as any);
    const { content: res } = await this.soul.languageProgramExecutor.execute(
      instructions
    );
    if (!res) {
      throw new Error("missing response");
    }
    devLog(`Mental model updated from "${content}" to \x1b[31m${res}\x1b[0m`);

    this.name = getTag({ tag: "NAME", input: res });
    this.mood = getTag({ tag: "MOOD", input: res });
    this.narrative = getTag({ tag: "HISTORY", input: res });
    this.state = getTag({ tag: "MENTAL STATE", input: res });
    this.goals = getTag({ tag: "GOALS", input: res });

    this.buffer = [];
  }
}
