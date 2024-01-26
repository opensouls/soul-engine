import { Action } from "../action";
import { ChatMessageRoleEnum } from "../languageModels";
import { Thought } from "../languageModels/memory";
import { devLog } from "../utils";

export const rambleAction: Action = {
  name: "rambleAfterResponding",
  description:
    "If you want to continue talking, without waiting for a response. Use YES or NO as input.",
  execute: (input, soul, conversation) => {
    devLog(`executing ramble action with input: ${input}`);
    if (input.toLowerCase() === "no") {
      return;
    }
    conversation.addGeneratedThought(
      new Thought({
        role: ChatMessageRoleEnum.Assistant,
        entity: soul.blueprint.name,
        action: "RAMBLE",
        content: "I want to ramble before they respond",
      })
    );
    conversation.continueThinking();
  },
};
