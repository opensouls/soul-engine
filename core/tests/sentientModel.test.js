const { getTag } = require("../src/lmProcessing");
const { Blueprints } = require("../src/blueprint");
const { Soul } = require("../src/soul");
const { ParticipationStrategy } = require("../src/soul");
const { isAbstractTrue, AbstractSample } = require("../src/testing");

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

test("test sorrowful conversation history accumulates", async () => {
  const generator = async () => {
    const soul = new Soul(Blueprints.SAMANTHA);
    const messagesToSend = [
      "hi",
      "honestly, my dog died",
      "it's just fucking terrible",
      "and my mom didn't care at all",
      "also my dad just passed away",
    ];
    for (const message of messagesToSend) {
      soul.tell(message);
      await delay(4000);
    }
    return getTag({
      tag: "HISTORY",
      input: soul.inspectPeopleMemory("user"),
    });
  };
  const sample = new AbstractSample(generator);
  await sample.generate(5);
  expect(
    await sample.evaluate(
      "contains information about a dog dying, a mom not caring, a dad passing away"
    )
  ).toBeTruthy();
}, 35000);

test("test sorrowful conversation gives interesting mental model", async () => {
  const generator = async () => {
    const soul = new Soul(Blueprints.SAMANTHA);
    const messagesToSend = [
      "hi",
      "honestly, my dog died",
      "it's just fucking terrible",
      "and my mom didn't care at all",
      "also my dad just passed away",
    ];
    for (const message of messagesToSend) {
      soul.tell(message);
      await delay(4000);
    }
    return getTag({
      tag: "MENTAL STATE",
      input: soul.inspectPeopleMemory("user"),
    });
  };
  const sample = new AbstractSample(generator);
  await sample.generate(5);
  expect(
    await sample.evaluate(
      "feeling some set of depression, grief, anxiety, or sadness"
    )
  ).toBeTruthy();
}, 35000);

test("test technical discussion", async () => {
  const generator = async () => {
    const soul = new Soul(Blueprints.SAMANTHA);
    const messagesToSend = [
      "hi, my name is Kevin",
      "i'm thinking about generating a telegram bot in discord",
      "digital souls are really cool",
      "anyone know how to deal with a bug in the library here?",
    ];
    for (const message of messagesToSend) {
      soul.tell(message);
      await delay(4000);
    }
    return getTag({
      tag: "GOALS",
      input: soul.inspectMemory().mentalModels[0].toString(),
    });
  };
  const sample = new AbstractSample(generator);
  await sample.generate(5);
  expect(
    await sample.evaluate("make a telegram bot or something with the library")
  ).toBeTruthy();
}, 35000);

test("test capture name", async () => {
  async function testSoul() {
    const soul = new Soul(Blueprints.SAMANTHA);
    const messagesToSend = ["hi, my name is Kevin"];
    for (const message of messagesToSend) {
      soul.tell(message);
      await delay(4000);
    }
    return getTag({
      tag: "NAME",
      input: soul.inspectPeopleMemory("user"),
    });
  }
  const results = await Promise.all([1, 2, 3, 4, 5].map(() => testSoul()));
  for (const res of results) {
    expect(res).toBe("Kevin");
  }
}, 15000);

test("test capture name update", async () => {
  async function testSoul() {
    const soul = new Soul(Blueprints.SAMANTHA);
    const messagesToSend = [
      "hi, my name is Kevin",
      "just kidding my name is Fred",
    ];
    for (const message of messagesToSend) {
      soul.tell(message);
      await delay(4000);
    }
    return getTag({
      tag: "NAME",
      input: soul.inspectPeopleMemory("user"),
    });
  }
  const results = await Promise.all([1, 2, 3, 4, 5].map(() => testSoul()));
  for (const res of results) {
    expect(res).toBe("Fred");
  }
}, 15000);

test("test capture goals", async () => {
  async function testSoul() {
    const soul = new Soul(Blueprints.SAMANTHA);
    const messagesToSend = ["i want to rule the world in life"];
    for (const message of messagesToSend) {
      soul.tell(message);
      await delay(4000);
    }
    const goals = getTag({
      tag: "GOALS",
      input: soul.inspectPeopleMemory("user"),
    });
    const estimate = await isAbstractTrue(
      goals,
      "wants to take over the world"
    );
    return estimate.answer;
  }
  const results = await Promise.all([1, 2, 3, 4, 5].map(() => testSoul()));
  for (const res of results) {
    expect(res).toBeTruthy();
  }
}, 15000);

test("test capture goals update", async () => {
  async function testSoul() {
    const soul = new Soul(Blueprints.SAMANTHA);
    const messagesToSend = [
      "i want to rule the world in life",
      "i also want to become a dad",
    ];
    for (const message of messagesToSend) {
      soul.tell(message);
      await delay(4000);
    }
    const goals = getTag({
      tag: "GOALS",
      input: soul.inspectPeopleMemory("user"),
    });
    const estimate = await isAbstractTrue(
      goals,
      "wants to take over the world and become a dad"
    );
    return estimate.answer;
  }
  const results = await Promise.all([1, 2, 3, 4, 5].map(() => testSoul()));
  for (const res of results) {
    expect(res).toBeTruthy();
  }
}, 15000);

test("test multiple people conversing yield separate mental models", async () => {
  const generator = async () => {
    const soul = new Soul(Blueprints.SAMANTHA);
    const messagesToRead = [
      { userName: "user122", text: "hi I'm Kevin" },
      { userName: "user022", text: "hi, I'm Bob" },
      { userName: "user022", text: "I have an amazing cat!" },
      { userName: "user122", text: "I like dogs" },
    ];
    for (const message of messagesToRead) {
      soul.read(message, ParticipationStrategy.CONSUME_ONLY);
      await delay(3000);
    }
    return soul;
  };
  const sample = new AbstractSample(generator, false);
  await sample.generate(3);
  expect(
    await sample.evaluate({
      getter: (soul) =>
        getTag({
          tag: "NAME",
          input: soul.inspectPeopleMemory("user122"),
        }),
      condition: "contains 'Kevin'",
    })
  ).toBeTruthy();
  expect(
    await sample.evaluate({
      getter: (soul) =>
        getTag({
          tag: "LIKES",
          input: soul.inspectPeopleMemory("user022"),
        }),
      condition: "contains a reference to the animal cat",
    })
  ).toBeTruthy();
  expect(
    await sample.evaluate({
      getter: (soul) =>
        getTag({
          tag: "LIKES",
          input: soul.inspectPeopleMemory("user122"),
        }),
      condition: "contains a reference to the animal dog",
    })
  ).toBeTruthy();
  expect(
    await sample.evaluate({
      getter: (soul) =>
        getTag({
          tag: "NAME",
          input: soul.inspectPeopleMemory("user022"),
        }),
      condition: "contains 'Bob'",
    })
  ).toBeTruthy();
}, 35000);
