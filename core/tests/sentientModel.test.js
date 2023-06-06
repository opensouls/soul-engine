const { getTag } = require("../src/lmProcessing");
const { Blueprints } = require("../src/blueprint");
const { Soul } = require("../src/soul");
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
      input: soul.inspectMemory().mentalModels[0].toString(),
    });
  };
  const sample = new AbstractSample(
    generator,
    "contains information about a dog dying, a mom not caring, a dad passing away"
  );
  await sample.generateSample(5);
  expect(sample.allTrue()).toBeTruthy();
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
      input: soul.inspectMemory().mentalModels[0].toString(),
    });
  };
  const sample = new AbstractSample(
    generator,
    "feeling some set of depression, grief, anxiety, or sadness"
  );
  await sample.generateSample(5);
  expect(sample.allTrue()).toBeTruthy();
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
  const sample = new AbstractSample(
    generator,
    "make a telegram bot or something with the library"
  );
  await sample.generateSample(5);
  expect(sample.allTrue()).toBeTruthy();
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
      input: soul.inspectMemory().mentalModels[0].toString(),
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
      input: soul.inspectMemory().mentalModels[0].toString(),
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
      input: soul.inspectMemory().mentalModels[0].toString(),
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
      input: soul.inspectMemory().mentalModels[0].toString(),
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
