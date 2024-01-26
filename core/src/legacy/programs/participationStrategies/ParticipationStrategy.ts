import { ConversationProcessor } from "../../conversationProcessor";

export interface ParticipationStrategy {
  decideToParticipate(): Promise<boolean>;
}

export interface ParticipationStrategyClass {
  new (conversation: ConversationProcessor): ParticipationStrategy;
}
