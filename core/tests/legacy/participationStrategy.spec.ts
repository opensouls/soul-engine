import { expect } from "chai";
import { Blueprints, Model, OpenAILanguageProgramProcessor, Soul } from "../../src/legacy"
import { ConsumeOnlyParticipationStrategy, AlwaysReplyParticipationStrategy, GroupParticipationStrategy } from "../../src/legacy/programs/participationStrategies"

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

// TODO: do we need this test anymore?
describe.skip("ParticipationStrategy", () => {
  it("ALWAYS_REPLYs replies to each message", async () => {
    const generator = async () => {
      const messages:any[] = [];
      const soul = new Soul(Blueprints.SAMANTHA, {
        languageProgramExecutor: new OpenAILanguageProgramProcessor({}, {
          model: Model.GPT_3_5_turbo,
        }),
        defaultConversationOptions: {
          participationStrategy: AlwaysReplyParticipationStrategy,
        },
      });
      const messagesToRead = [
        { userName: "user122", text: "hi Bob, I'm Kevin" },
        { userName: "user022", text: "hi, I'm Bob" },
      ];
      soul.on("says", (message) =>
        messages.push({ userName: "sam", text: message })
      );
      for (const message of messagesToRead) {
        messages.push(message);
        soul.read(message);
        await delay(10_000);
      }
      return messages;
    };
    const finalMessages = await generator();
    expect(finalMessages.length).to.equal(4);
  }).timeout(120_000);


  it("replies to some messages in GROUP_CHAT", async () => {
    const generator = async () => {
      const messages:any[] = [];
      const soul = new Soul(Blueprints.SAMANTHA, {
        defaultConversationOptions: {
          participationStrategy: GroupParticipationStrategy,
        },
      });
      const messagesToRead = [
        { userName: "user122", text: "hi Bob, I'm Kevin" },
        { userName: "user022", text: "hi, I'm Bob" },
        { userName: "user022", text: "I have an amazing cat!" },
        { userName: "user122", text: "my mom died" },
        { userName: "user122", text: "Samantha, can you say something?" },
        { userName: "user122", text: "Samantha, please stop talking" },
        { userName: "user122", text: "I don't want your input" },
      ];
      soul.on("says", (message) => {
        console.log("says!", message);
        messages.push({ userName: "sam", text: message })
      });
      for (const message of messagesToRead) {
        soul.read(message);
        messages.push(message);
        await delay(5000);
      }
      return messages;
    };
    const finalMessages = await generator();
    // i'm actually not even totally sure how to evaluate how many times sam should respond here in the end...
    expect(finalMessages.length).to.be.lessThan(14);
    console.log(finalMessages);
  }).timeout(45_000);


  it("CONSUMEs participation replies to each message", async () => {
    const generator = async () => {
      const messages = [];
      const soul = new Soul(Blueprints.SAMANTHA, {
        defaultConversationOptions: {
          participationStrategy: ConsumeOnlyParticipationStrategy,
        },
      });
      const messagesToRead = [
        { userName: "user122", text: "hi Bob, I'm Kevin" },
        { userName: "user022", text: "hi, I'm Bob" },
        { userName: "user022", text: "I have an amazing cat!" },
        { userName: "user122", text: "my mom died" },
        { userName: "user122", text: "Samantha, can you say something?" },
        { userName: "user122", text: "Samantha, please stop talking" },
        { userName: "user122", text: "I don't want your input" },
      ];
      soul.on("says", (message) =>
        messages.push({ userName: "sam", text: message })
      );
      for (const message of messagesToRead) {
        soul.read(message);
        messages.push(message);
        await delay(5000);
      }
      return messages;
    };
    const finalMessages = await generator();
    expect(finalMessages.length).to.equal(7);
  }).timeout(45_000);

})
