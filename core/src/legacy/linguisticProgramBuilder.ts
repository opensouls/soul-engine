import { Action } from "./action";
import { ChatMessage, ChatMessageRoleEnum } from "./languageModels";
import { Soul } from "./soul";

export interface ContextTag {
  name: string;
  content: string;
}

export interface OutputTag extends ContextTag {
  optional?: boolean;
}

export type MarkedMessage = ChatMessage & { creator?: string };

export interface ProgramOutput {
  context: ContextTag[];
  output: OutputTag[];
  rememberances: string[];
  actions: Action[];
  beginningMessages: MarkedMessage[];
  trailingMessages: MarkedMessage[];
}

const groupedTags = <T extends ContextTag>(tags: T[]): Record<string, T[]> => {
  return tags.reduce((acc, tag) => {
    acc[tag.name] ||= [];
    acc[tag.name].push(tag);
    return acc;
  }, {} as Record<string, T[]>);
};

const groupedTagsToSingleTag = <T extends ContextTag>(
  tagName: string,
  tags: T[]
): string => {
  return `<${tagName.toUpperCase()}>${tags
    .map((t) => {
      return t.content;
    })
    .join("\n")}</${tagName.toUpperCase()}>`;
};

const contextToLinguistPartial = (context: ContextTag[]): string => {
  const groupedContextTags = groupedTags(context);
  return Object.keys(groupedContextTags)
    .map((tagName) => {
      const tags = groupedContextTags[tagName];
      return groupedTagsToSingleTag(tagName, tags);
    })
    .join("\n");
};

// optional: <ACTION>[[choose from ${actionNames}]]</ACTION>
// optional: <ACTION_INPUT>[[fill in any input to the action]]</ACTION_INPUT>

export const outputToLinguisticPartial = (
  output: OutputTag[],
  actions: Action[]
): string => {
  const groupedOutputTags = groupedTags(output);
  if (actions.length > 0) {
    groupedOutputTags["action"] = [
      {
        name: "action",
        content: `[[choose from ${actions.map((a) => a.name).join(", ")}]]`,
        optional: true,
      },
    ];
    groupedOutputTags["action_input"] = [
      {
        name: "action_input",
        content: `[[fill in any input to the action]]`,
        optional: true,
      },
    ];
  }

  return Object.keys(groupedOutputTags)
    .map((tagName) => {
      const tags = groupedOutputTags[tagName];
      const optionalText = tags[0].optional ? "optional: " : "";
      return `${optionalText}${groupedTagsToSingleTag(tagName, tags)}}`;
    })
    .join("\n");
};

const actionsToLinguisticPartial = (soul: Soul, actions: Action[]): string => {
  return `
<Actions>
  ${soul.blueprint.name} can (optionally) take any of the following actions:
  ${actions
    .map((a) => {
      return `${a.name}: ${a.description}`;
    })
    .join("\n  ")}
</Actions>
  `.trim();
};

// This takes the output of a linguisticprogram pipeline (currently called MentalModel) and compiles it into a chat prompt for the LLM to process.
export const mergePrograms = (
  soul: Soul,
  programOutputs: Partial<ProgramOutput>[]
): ChatMessage[] => {
  const systemContextMessage = contextToLinguistPartial(
    programOutputs.flatMap((p) => p.context || [])
  );
  const systemActionText = actionsToLinguisticPartial(
    soul,
    programOutputs.flatMap((p) => p.actions || [])
  );

  const outputPartial = outputToLinguisticPartial(
    programOutputs.flatMap((p) => p.output || []),
    programOutputs.flatMap((p) => p.actions || [])
  );

  const outputSystemMessage = `
After receiving a new message, you will perform an introspection sequence that models ${soul.blueprint.name}'s cognition. You respond in the following form:

${outputPartial}
`.trim();

  const system: ChatMessage = {
    role: ChatMessageRoleEnum.System,
    content: `
${systemContextMessage}

${systemActionText}

${outputSystemMessage}
<END />
      `.trim(),
    name: soul.blueprint.name,
  };

  const rememberance: ChatMessage = {
    role: ChatMessageRoleEnum.System,
    content: `

${programOutputs.flatMap((p) => p.rememberances || []).join("\n")}

Now, think through ${
      soul.blueprint.name
    }'s response to the last message using the following output format.
${outputPartial}
<END />

`.trim(),
    name: soul.blueprint.name,
  };

  const messages = programOutputs
    .flatMap((p) => p.beginningMessages || [])
    .concat(programOutputs.flatMap((p) => p.trailingMessages || []));

  return [system].concat(messages).concat([rememberance]);
};
