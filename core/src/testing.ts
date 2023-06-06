import { getTag, processLMProgram } from "./lmProcessing";
import { ChatCompletionRequestMessageRoleEnum } from "openai";

type AbstractTrue = {
  confidence: number;
  answer: boolean;
};

export async function isAbstractTrue(
  target: string,
  condition: string
): Promise<AbstractTrue> {
  const instructions = [
    {
      role: ChatCompletionRequestMessageRoleEnum.System,
      content: `<CONTEXT>You are providing an implementation of a unit testing software that operates over language.</CONTEXT>

<GOAL>The goal is to asses a TARGET input against a given CONDITION, indicating if the condition is met.</GOAL>`,
    },
    {
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: `Here is the input

<INPUT>${target}</INPUT>

and the condition to evaluate

<CONDITION>${condition}</CONDITION>`,
    },
    {
      role: ChatCompletionRequestMessageRoleEnum.System,
      content: `Here is your output format
  
<TEST>
  <INPUT>[[fill in]]</TEST>
  <CONDITION>[[fill in]]</CONDITION>
  <THINKING>[[explain if the INPUT satisfies the CONDITION]]</THINKING>
  <CONFIDENCE>[[confidence score ranging from 0 to 1 if the input satisfies the condition]]</CONFIDENCE>
<TEST>

The optimal assessment is given

<TEST>`,
    },
  ];
  const res = await processLMProgram(instructions);
  const confidence = Number(getTag({ tag: "CONFIDENCE", input: res }));
  return {
    confidence,
    answer: confidence > 0.5,
  } as AbstractTrue;
}

type StringGenerator = () => Promise<string>;

export class AbstractSample {
  public condition: string;
  private generator: StringGenerator;
  private generations: string[] = [];
  private sample: AbstractTrue[] = [];
  private verbose = true;

  constructor(generator: StringGenerator, condition: string, verbose = true) {
    this.condition = condition;
    this.generator = generator;
    this.verbose = verbose;
  }

  public async generateSample(nTimes: number) {
    this.generations = await Promise.all(
      Array.from({ length: nTimes }).map(async () => await this.generator())
    );
    this.sample = await Promise.all(
      this.generations.map((s) => isAbstractTrue(s, this.condition))
    );
  }

  public allTrue() {
    if (this.verbose) {
      const data = this.sample.map((element, index) => [
        element,
        this.generations[index],
      ]);
      console.log("abstract samples", data);
    }
    return this.sample.every((s) => s.answer);
  }
}
