
export enum ChatMessageRoleEnum {
  System = "system",
  User = "user",
  Assistant = "assistant",
  Function = "function",
}

export interface ImageURL {
  /**
   * Either a URL of the image or the base64 encoded image data.
   */
  url: string;

  /**
   * Specifies the detail level of the image. Learn more in the
   * [Vision guide](https://platform.openai.com/docs/guides/vision/low-or-high-fidelity-image-understanding).
   */
  detail?: 'auto' | 'low' | 'high';
}

export type ContentText = { type: "text", text: string }
export type ContentImage = { type: "image_url", image_url: ImageURL }

export type ChatMessageContent = string | (ContentText | ContentImage)[]

export interface Memory<MetaDataType = Record<string, unknown>> {
  role: ChatMessageRoleEnum;
  content: ChatMessageContent;
  name?: string;
  region?: string;
  metadata?: MetaDataType;
  
  _id: string;
  _timestamp: number;
}

export type InputMemory = Omit<Memory, "_id" | "_timestamp"> & { _id?: string, _timestamp?: number }
