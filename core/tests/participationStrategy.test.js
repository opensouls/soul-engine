const { Blueprints, Soul } = require("../src");
const { ConsumeOnlyParticipationStrategy, AlwaysReplyParticipationStrategy, GroupParticipationStrategy } = require("../src/programs/participationStrategies");

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

const errorSpy = jest.spyOn(console, "error");

errorSpy.mockImplementation(() => {
  // ignore some annoying error msgs that need to be fixed in an upstream repo
});

afterAll(() => {
  errorSpy.mockRestore();
});

test("test ALWAYS_REPLY participation replies to each message", async () => {
  const generator = async () => {
    let messages = [];
    const soul = new Soul(Blueprints.SAMANTHA, {
      defaultConversationOptions: {
        participationStrategy: AlwaysReplyParticipationStrategy,
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
  expect(finalMessages.length).toEqual(11);
}, 45000);

test("test GROUP_CHAT participation replies to some messages", async () => {
  const generator = async () => {
    let messages = [];
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
  // i'm actually not even totally sure how to evaluate how many times sam should respond here in the end...
  expect(finalMessages.length).toBeLessThan(14);
  console.log(finalMessages);
}, 45000);

test("test CONSUME participation replies to each message", async () => {
  const generator = async () => {
    let messages = [];
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
  expect(finalMessages.length).toEqual(7);
}, 45000);
