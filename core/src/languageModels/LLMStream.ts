import { Stream } from "openai/streaming"
import { ReusableStream } from "./reusableStream"
import { ChatCompletionChunk } from "openai/resources"

export class OpenAICompatibleStream {
  private reusableStream
  private buffer: { content: string, functionCall: { name: string, arguments: string } }

  private complete: Promise<void>
  private streamResolver?: () => void

  constructor(stream: Stream<ChatCompletionChunk>) {
    this.reusableStream = new ReusableStream(stream)
    this.buffer = { content: "", functionCall: { name: "", arguments: "" } }
    this.complete = new Promise((resolve) => {
      this.streamResolver = resolve
    })
    this.handleStream()
  }

  stream() {
    return this.reusableStream.stream()
  }

  async finalContent() {
    await this.complete
    return this.buffer.content
  }

  async finalFunctionCall() {
    await this.complete
    if (this.buffer.functionCall.name.length === 0) {
      return undefined
    }
    return this.buffer.functionCall
  }

  private async handleStream() {
    for await (const chunk of this.reusableStream.stream()) {
      if (chunk.choices[0].delta.tool_calls?.[0]?.function?.name) {
        this.buffer.functionCall.name += chunk.choices[0].delta.tool_calls?.[0]?.function?.name
      }
      if (chunk.choices[0].delta.tool_calls?.[0]?.function?.arguments) {
        this.buffer.functionCall.arguments += chunk.choices[0].delta.tool_calls?.[0]?.function?.arguments
      } 
      this.buffer.content += chunk.choices[0].delta.content || ""
    }
    this.streamResolver?.()
  }
}
