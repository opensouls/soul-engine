import { ConversationProcessor } from "../../conversationProcessor";
import { ParticipationStrategy } from "./ParticipationStrategy";

export class ConsumeOnlyParticipationStrategy implements ParticipationStrategy {
  constructor(_conversation: ConversationProcessor) {}

  decideToParticipate(): Promise<boolean> {
    return Promise.resolve(false);
  }
}
