import { ChatMessage } from "gpt-tokenizer/GptEncoding"
import { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import { ChatMessageRoleEnum } from "../WorkingMemory.js"

export interface FixMethods {
  singleSystemMessage?: boolean
  forcedRoleAlternation?: boolean
}

export const fixMessageRoles = (fixMethods: FixMethods, messages: (ChatMessage | ChatCompletionMessageParam)[]): ChatCompletionMessageParam[] => {
  if (!fixMethods.singleSystemMessage && !fixMethods.forcedRoleAlternation) {
    return messages as ChatCompletionMessageParam[]
  }

  let newMessages = messages

  if (fixMethods.singleSystemMessage) {
    let firstSystemMessage = true
    newMessages = messages.map((originalMessage) => {
      const message = { ...originalMessage }
      if (message.role === ChatMessageRoleEnum.System) {
        if (firstSystemMessage) {
          firstSystemMessage = false
          return message
        }
        message.role = ChatMessageRoleEnum.User
        // systemMessage += message.content + "\n"
        return message
      }
      return message
    }) as ChatCompletionMessageParam[]
  }

  if (fixMethods.forcedRoleAlternation) {
    // now we make sure that all the messages alternate User/Assistant/User/Assistant
    let lastRole: ChatCompletionMessageParam["role"] | undefined
    const { messages } = newMessages.reduce((acc, message) => {
      // If it's the first message or the role is different from the last, push it to the accumulator
      if (lastRole !== message.role) {
        acc.messages.push(message as ChatCompletionMessageParam);
        lastRole = message.role;
        acc.grouped = [message.content as string]
      } else {
        // If the role is the same, combine the content with the last message in the accumulator
        const lastMessage = acc.messages[acc.messages.length - 1];
        acc.grouped.push(message.content as string)

        lastMessage.content = acc.grouped.slice(0, -1).map((str) => {
          return `${message.role} said: ${str}`
        }).concat(acc.grouped.slice(-1)[0]).join("\n\n")
      }

      return acc;
    }, { messages: [], grouped: [] } as { grouped: string[], messages: ChatCompletionMessageParam[] })

    newMessages = messages
    if (newMessages[0]?.role === ChatMessageRoleEnum.Assistant) {
      newMessages.unshift({
        content: "...",
        role: ChatMessageRoleEnum.User
      })
    }
  }

  return newMessages as ChatCompletionMessageParam[]
}
