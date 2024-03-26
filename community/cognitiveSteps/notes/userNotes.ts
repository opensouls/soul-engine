import { createCognitiveStep, WorkingMemory, ChatMessageRoleEnum, indentNicely } from "@opensouls/engine";

/**
 * `userNotes` is a cognitive step designed for generating and processing user notes within a chat-based system.
 * It prompts the system to build updated notes about the user.
 * The command function generates a system message asking for updated, concise notes following specific rules.
 * The postProcess function handles the response, formatting it for display and further processing.
 */
export const userNotes = createCognitiveStep(() => {
  return {
    command: ({ soulName: name}: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        content: indentNicely`
          Model the mind of ${name}.

          ## Description
          Write an updated and clear set of notes on the user that ${name} would want to remember.

          ## Rules
          * Keep descriptions as bullet points
          * Keep relevant bullet points from before
          * Use abbreviated language to keep the notes short
          * Do not write any notes about ${name}

          Please reply with the updated notes on the user:'
        `,
      }
    },
    postProcess: async (_step, response: string) => {
      return [
        {
          role: ChatMessageRoleEnum.Assistant,
          content: response
        },   
        response
      ]
    }
  }
})
