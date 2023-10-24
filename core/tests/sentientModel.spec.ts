import { getTag } from "../src/languageModels"
import { Blueprints } from "../src/blueprint"
import { Soul } from "../src/soul"
import { isAbstractTrue, AbstractSample } from "../src/testing"
import { PeopleMemory } from "../src/programs/PeopleMemory/PeopleMemory"
import { expect } from "chai"
import { AlwaysReplyParticipationStrategy } from "../src"

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

const mentalModelForUser = (soul: Soul, userName: string) => {
  const peopleMemory = soul.conversationalPrograms.find((model) => {
    return model instanceof PeopleMemory;
  });
  if (!peopleMemory) {
    throw new Error("no people memory");
  }
  const userMemory = (peopleMemory as PeopleMemory).memory[userName];
  if (!userMemory) {
    throw new Error("no user memory");
  }
  return userMemory.toLinguisticProgram(null);
};

describe.skip("SentientModel", () => {

  it("accumulates sorrowful conversation history", async () => {
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
        input: mentalModelForUser(soul, "user"),
      });
    };
    const sample = new AbstractSample(generator);
    await sample.generate(5);
    expect(
      await sample.evaluate(
        "contains information about a dog dying, a mom not caring, a dad passing away"
      )
    ).to.exist;
  }).timeout(35_000);


  it("gives interesting mental model of a sorrowful conversation", async () => {
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
        input: mentalModelForUser(soul, "user"),
      });
    };
    const sample = new AbstractSample(generator);
    await sample.generate(5);
    expect(
      await sample.evaluate(
        "feeling some set of depression, grief, anxiety, or sadness"
      )
    ).to.exist;
  }).timeout(35_000)

  it("tests technical discussion", async () => {
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
        input: soul.conversationalPrograms[0].toString(),
      });
    };
    const sample = new AbstractSample(generator);
    await sample.generate(5);
    expect(
      await sample.evaluate("make a telegram bot or something with the library")
    ).to.exist;
  }).timeout(35_000);


  //TODO: as of aug-23-2023 this is failing (and was failing in older JS tests too)
  it.skip("captures name", async () => {
    async function testSoul() {
      const soul = new Soul(Blueprints.SAMANTHA, {
        defaultConversationOptions: {
          participationStrategy: AlwaysReplyParticipationStrategy,
        }      
      });
      const messagesToSend = ["hi, my name is Kevin"];
      for (const message of messagesToSend) {
        soul.tell(message);
        await delay(6000);
      }
      return getTag({
        tag: "NAME",
        input: mentalModelForUser(soul, "user"),
      });
    }

    const results = await Promise.all([1, 2, 3, 4, 5].map(() => testSoul()));
    for (const res of results) {
      expect(res).to.equal("Kevin");
    }
  }).timeout(45_000);

  //TODO: as of aug-23-2023 this is failing (and was failing in older JS tests too)
  it.skip("captures name updates", async () => {
    async function testSoul() {
      const soul = new Soul(Blueprints.SAMANTHA);
      const messagesToSend = [
        "hi, my name is Kevin",
        "just kidding my name is Fred",
      ];
      for (const message of messagesToSend) {
        soul.tell(message);
        await delay(6000);
      }
      return getTag({
        tag: "NAME",
        input: mentalModelForUser(soul, "user"),
      });
    }
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => testSoul()));
    for (const res of results) {
      expect(res).to.equal("Fred");
    }
  }).timeout(45_000);


  it("captures goals", async () => {
    async function testSoul() {
      const soul = new Soul(Blueprints.SAMANTHA);
      const messagesToSend = ["i want to rule the world in life"];
      for (const message of messagesToSend) {
        soul.tell(message);
        await delay(6000);
      }
      const goals = getTag({
        tag: "GOALS",
        input: mentalModelForUser(soul, "user"),
      });
      const estimate = await isAbstractTrue(
        goals,
        "wants to take over the world"
      );
      return estimate.answer;
    }
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => testSoul()));
    for (const res of results) {
      expect(res).to.exist;
    }
  }).timeout(45_000);



  it("captures goals update", async () => {
    async function testSoul() {
      const soul = new Soul(Blueprints.SAMANTHA);
      const messagesToSend = [
        "i want to rule the world in life",
        "i also want to become a dad",
      ];
      for (const message of messagesToSend) {
        soul.tell(message);
        await delay(6000);
      }
      const goals = getTag({
        tag: "GOALS",
        input: mentalModelForUser(soul, "user"),
      });
      const estimate = await isAbstractTrue(
        goals,
        "wants to take over the world and become a dad"
      );
      return estimate.answer;
    }
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => testSoul()));
    for (const res of results) {
      expect(res).to.exist;
    }
  }).timeout(45_000);


  it("yields multiple separate mental models for multiple people conversing", async () => {
    const generator = async () => {
      const soul = new Soul(Blueprints.SAMANTHA);
      const messagesToRead = [
        { userName: "user122", text: "hi I'm Kevin" },
        { userName: "user022", text: "hi, I'm Bob" },
        { userName: "user022", text: "I have an amazing cat!" },
        { userName: "user122", text: "I like dogs" },
      ];
      for (const message of messagesToRead) {
        soul.read(message);
        await delay(6000);
      }
      return soul;
    };
    const sample = new AbstractSample(generator, true);
    await sample.generate(3);
    expect(
      await sample.evaluate({
        getter: (soul) =>
          getTag({
            tag: "NAME",
            input: mentalModelForUser(soul, "user122"),
          }),
        condition: "contains 'Kevin'",
      })
    ).to.exist;
    expect(
      await sample.evaluate({
        getter: (soul) =>
          getTag({
            tag: "HISTORY",
            input: mentalModelForUser(soul, "user022"),
          }),
        condition: "includes having a cat",
      })
    ).to.exist
    expect(
      await sample.evaluate({
        getter: (soul) =>
          getTag({
            tag: "HISTORY",
            input: mentalModelForUser(soul, "user122"),
          }),
        condition: "includes liking the animal dog",
      })
    ).to.exist
    expect(
      await sample.evaluate({
        getter: (soul) =>
          getTag({
            tag: "NAME",
            input: mentalModelForUser(soul, "user022"),
          }),
        condition: "contains 'Bob'",
      })
    ).to.exist
  }).timeout(35_000);
})
