export enum ChatMessageRoleEnum {
  System = "system",
  User = "user",
  Assistant = "assistant",
  Function = "function",
}

export interface ChatMessage {
  role: ChatMessageRoleEnum;
  content: string;
  name?: string;
}
