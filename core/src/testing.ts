import { ChatMessageRoleEnum, getTag } from "./languageModels";
import { OpenAILanguageProgramProcessor } from "./languageModels/openAI";

export type AbstractTrue = {
  reasoning: string;
  confidence: number;
  answer: boolean;
};

const getExecutor = () => {
  return new OpenAILanguageProgramProcessor();
};

export async function isAbstractTrue(
  target: string,
  condition: string
): Promise<AbstractTrue> {
  const executor = getExecutor();

  const instructions = [
    {
      role: ChatMessageRoleEnum.System,
      content: `<CONTEXT>You are providing an implementation of a unit testing software that operates over language.</CONTEXT>

<GOAL>The goal is to asses a TARGET input against a given CONDITION, indicating if the condition is met.</GOAL>`,
    },
    {
      role: ChatMessageRoleEnum.User,
      content: `Here is the input

<INPUT>${target}</INPUT>

and the condition to evaluate

<CONDITION>${condition}</CONDITION>`,
    },
    {
      role: ChatMessageRoleEnum.System,
      content: `Here is your output format
  
<TEST>
  <INPUT>[[fill in]]</INPUT>
  <CONDITION>[[fill in]]</CONDITION>
  <THINKING>[[explain if the INPUT satisfies the CONDITION]]</THINKING>
  <CONFIDENCE>[[confidence score ranging from 0 to 1 if the input satisfies the condition]]</CONFIDENCE>
</TEST>

The optimal assessment is given

<TEST>`,
    },
  ];
  const res = await executor.execute(instructions);
  const confidence = Number(getTag({ tag: "CONFIDENCE", input: res }));
  const reasoning = getTag({ tag: "THINKING", input: res });
  return {
    reasoning,
    confidence,
    answer: confidence > 0.5,
  } as AbstractTrue;
}

type Generator = () => Promise<any>;
type Conditional = {
  getter?: (generation: any) => string;
  condition: string;
};

export class AbstractSample {
  private generator: Generator;
  private generations: string[] = [];
  private verbose = true;

  constructor(generator: Generator, verbose = true) {
    this.generator = generator;
    this.verbose = verbose;
  }

  public async generate(nTimes: number) {
    this.generations = await Promise.all(
      Array.from({ length: nTimes }).map(async () => await this.generator())
    );
  }

  public async evaluate(conditional: string | Conditional) {
    let expandedConditional: Conditional;
    if (typeof conditional === "string") {
      expandedConditional = {
        condition: conditional,
      };
    } else {
      expandedConditional = conditional;
    }
    const getter =
      expandedConditional.getter === undefined
        ? (text: string) => text
        : expandedConditional.getter;
    const sample = await Promise.all(
      this.generations.map((s) =>
        isAbstractTrue(getter(s), expandedConditional.condition)
      )
    );
    if (this.verbose) {
      const data = sample.map((element, index) => [
        element,
        getter(this.generations[index]),
      ]);
      console.log("abstract samples", data, getter(this.generations[0]));
    }
    return sample.every((s) => s.answer);
  }
}
