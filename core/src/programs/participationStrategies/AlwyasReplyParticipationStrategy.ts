import { ConversationProcessor } from "../../conversationProcessor";
import { ParticipationStrategy } from "./ParticipationStrategy";

export class AlwaysReplyParticipationStrategy implements ParticipationStrategy {
  constructor(_conversation: ConversationProcessor) {}

  decideToParticipate(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
