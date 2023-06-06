import { getTag, processLMProgram } from "./lmProcessing";
import {
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum,
} from "openai";
import { devLog } from "./utils";
import { Blueprint } from "./blueprint";

export class MentalModel {
  public async update(msg: ChatCompletionRequestMessage) {
    // overwrite
  }
}

export class SentientModel extends MentalModel {
  userName: string;
  observerBlueprint: Blueprint;
  name = "[[to learn]]";
  demographics = "[[to learn]]";
  mood = "[[to feel]]";
  narrative = "[[to observe]]";
  goals = "[[to discover]]";
  state = "[[to discover]]";
  private buffer: ChatCompletionRequestMessage[] = [];

  constructor(userName: string, observerBlueprint: Blueprint) {
    super();
    this.userName = userName;
    this.observerBlueprint = observerBlueprint;
  }

  public toString() {
    return `<CONTEXT>To date, ${this.observerBlueprint.name} remembers the following about ${this.name}, including records of their NAME, DEMOGRAPHICS, current HISTORY narrative, personal GOALS, MOOD, and MENTAL STATE.</CONTEXT>

Their historical memory reads:

<ENTITY>
<USERNAME>${this.userName}</USERNAME>
<NAME>${this.name}</NAME>
<DEMOGRAPHICS>${this.demographics}</DEMOGRAPHICS>
<HISTORY>${this.narrative}</HISTORY>
<GOALS>${this.goals}</GOALS>
<MOOD>${this.mood}</MOOD>
<MENTAL STATE>${this.state}</MENTAL STATE>
</ENTITY>`;
  }

  public async update({ role, content, name }: ChatCompletionRequestMessage) {
    if (role !== "user") {
      this.buffer.push({ role, content, name } as ChatCompletionRequestMessage);
      return;
    }
    const program = `<NEW ENTITY RECORD>After reading the new messages ${this.observerBlueprint.name}'s entity record of ${this.name} will read has the following format</NEW ENTITY RECORD>

<ENTITY>
<USERNAME>${this.userName}</USERNAME>
<NAME>[[update from new messages]]</NAME>
<DEMOGRAPHICS>[[update from new messages]]</DEMOGRAPHICS>
<HISTORY>[[update from new messages]]</HISTORY>
<GOALS>[[update from new messages]]</GOALS>
<MOOD>[[update from new messages]]</MOOD>
<MENTAL STATE>[[update from new messages]]</MENTAL STATE>
</ENTITY>

Additionally the sections marked [[update from new messages]] have been filled in, noting the following:

- ONLY information from the new messages is used to inform the updates
- NAME is the userName's real name
- The NAME should only be filled in when it is obvious, otherwise leave as [[to learn]]
- The HISTORY is additive, rarely forgetting information
- Where appropriate the HISTORY information has been condensed
- The HISTORY contains a maximum of 20 bullet points
- Once the HISTORY is longer than 5 bullet points, then the least important bullet points are forgotten
- The GOALS contains ${this.observerBlueprint.name}'s belief about ${this.name}'s goals in a few sentences
- The GOALS section should ALWAYS have a guess, even if imperfect
- The MENTAL STATE contains ${this.observerBlueprint.name}'s belief about ${this.name}'s mental state in a few sentences
- The MENTAL STATE contains only information about ${this.name}, no particular directives on how to proceed
- The MENTAL STATE section should ALWAYS have a guess, even if imperfect

The new record reads:

<ENTITY>`;
    let instructions = [
      {
        role: ChatCompletionRequestMessageRoleEnum.System,
        content:
          this.toString() + `\n\nThen, the following messages were exchanged.`,
      },
    ];
    if (this.buffer.length > 0) {
      instructions = instructions.concat(this.buffer as any);
    }
    instructions = instructions.concat([
      { role, content, name },
      { role: ChatCompletionRequestMessageRoleEnum.System, content: program },
    ] as any);
    const res = await processLMProgram(instructions);
    devLog(`Mental model updated from "${content}" to \x1b[31m${res}\x1b[0m`);

    this.demographics = getTag({ tag: "DEMOGRAPHICS", input: res });
    this.name = getTag({ tag: "NAME", input: res });
    this.mood = getTag({ tag: "MOOD", input: res });
    this.narrative = getTag({ tag: "HISTORY", input: res });
    this.state = getTag({ tag: "MENTAL STATE", input: res });
    this.goals = getTag({ tag: "GOALS", input: res });
  }
}
