import {
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum,
  Configuration,
  OpenAIApi,
} from "openai";
import { devLog } from "./utils";
import { OpenAIExt } from "openai-ext";
import EventEmitter from "events";
import { config } from "dotenv";
config();

const apiKey = process.env.OPENAI_API_KEY;
const configuration = new Configuration({ apiKey });
const openaiApi = new OpenAIApi(configuration);

type StringReplacements = {
  [key: string]: string;
};

type Block = {
  blockName: string;
  content: string;
  name?: string;
};

function parseProgram(
  str: string,
  replacements: StringReplacements[] = []
): Block[] {
  // This is a basic regex to find the blocks in the input. It uses the named capture group feature to get the block names
  const blockRegex =
    /{{#(?<blockName>context|entity|generated|instructions|yield)~\s{0,1}(name='(?<name>.*)')?}}(?<content>[\s\S]*?){{~\/\1}}/gm;

  // This is a basic regex to find and replace comments
  const commentRegex = /{{!.*?}}/g;

  // This is a basic regex to find and replace templated variables
  replacements
    .map((replacement) => Object.entries(replacement)[0])
    .forEach(([name, value]) => {
      const variableRegex = new RegExp("{{" + name + "}}", "g");
      str = str.replace(variableRegex, value);
    });

  str = str.replace(commentRegex, "");

  const blocks: Block[] = [];
  let match;

  while ((match = blockRegex.exec(str)) !== null) {
    if (match.groups !== undefined) {
      const block = {
        blockName: match.groups.blockName,
        content: match.groups.content.trim(),
      } as any;
      if (match.groups?.name !== undefined) {
        block.name = match.groups?.name;
      }
      blocks.push(block);
    }
  }

  return blocks;
}

const blockToOAIRole = {
  context: ChatCompletionRequestMessageRoleEnum.System,
  instructions: ChatCompletionRequestMessageRoleEnum.Assistant,
  generated: ChatCompletionRequestMessageRoleEnum.Assistant,
  yieldBlock: ChatCompletionRequestMessageRoleEnum.Assistant,
  entity: ChatCompletionRequestMessageRoleEnum.User,
};

enum blockTypes {
  context = "context",
  generated = "generated",
  instructions = "instructions",
  yieldBlock = "yield",
  entity = "entity",
}

type OAIProgram = ChatCompletionRequestMessage[];

function compileToOAI(blocks: Block[]): OAIProgram {
  if (blocks.slice(-1)[0].blockName !== "yield") {
    throw new Error("yield block must be last");
  }
  if (
    blocks.some((block) => block.blockName === blockTypes.instructions) &&
    blocks.slice(-2)[0].blockName !== blockTypes.instructions
  ) {
    throw new Error("instructions block must be right before the yield block");
  }
  const messages: ChatCompletionRequestMessage[] = blocks
    .filter((block) => block.blockName !== blockTypes.yieldBlock)
    .map((block) => {
      const message = {
        role: blockToOAIRole[block.blockName as keyof typeof blockToOAIRole],
        content: block.content,
      } as ChatCompletionRequestMessage;
      if (block?.name !== undefined) {
        message.name = block.name;
      }
      return message;
    });
  return messages;
}

type YieldInstruction = {
  varName: string;
  closureTag: string;
  priorChunk: string;
};

interface Match {
  groups: { [key: string]: string };
}

function parseYieldBlock(yieldContent: string): YieldInstruction[] {
  const regex =
    /(}}|^)(?<priorChunk>(.|\n)*?){{gen '(?<var>.*?)' until '(?<closure>.*?)'}}/gm;
  let match: Match;
  const results: YieldInstruction[] = [];

  while ((match = regex.exec(yieldContent) as Match) !== null) {
    if (
      match.groups !== undefined &&
      !["var", "closure", "priorChunk"].some(
        (k) => !Object.keys(match.groups).includes(k)
      )
    ) {
      results.push({
        varName: match.groups.var,
        closureTag: match.groups.closure,
        priorChunk: match.groups.priorChunk,
      });
    } else {
      throw new Error("Compilation error in yield block");
    }
  }
  if (results.length === 0) {
    throw new Error("Missing gen instruction in #yield block");
  }
  if (new Set(results.map((r) => r.varName)).size !== results.length) {
    throw new Error("Each yield must have a different name");
  }
  return results;
}

type Yield = {
  name: string;
  value: string;
  instruction: YieldInstruction;
};

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

type OAIStream = any;

export enum LMYieldEvents {
  generation = "generation",
  done = "done",
}

type LMProgram = string;
type Replacement = {
  [name: string]: string;
};

export enum LMYieldModels {
  gpt_3_5_turbo = "gpt-3.5-turbo",
  gpt_3_5_turbo_0613 = "gpt-3.5-turbo-0613",
  gpt_3_5_turbo_16k = "gpt-3.5-turbo-16k",
  gpt_3_5_turbo_16k_0613 = "gpt-3.5-turbo-16k-0613",
  gpt_4 = "gpt-4",
  gpt_4_0613 = "gpt-4-0613",
  gpt_4_32k = "gpt-4-32k",
  gpt_4_32k_0613 = "gpt-4-32k-0613",
}

type LMYieldOptions = {
  model: LMYieldModels;
};

export default class LMYield extends EventEmitter {
  public oaiProgram: OAIProgram;
  public yieldInstructions: YieldInstruction[];
  public yields: Yield[];
  private options: LMYieldOptions;

  constructor(
    program: LMProgram,
    replacements: Replacement[],
    options?: LMYieldOptions
  ) {
    super();
    const blocks = parseProgram(program, replacements);
    if (blocks.length < 2) {
      throw new Error("Missing blocks in lmProgram");
    }
    const yieldBlock = blocks.slice(-1)[0];
    this.yieldInstructions = parseYieldBlock(yieldBlock.content);
    this.oaiProgram = compileToOAI(blocks);
    this.yields = [];
    this.options = options || { model: LMYieldModels.gpt_3_5_turbo_16k };
  }

  public async generate() {
    const numberYields = this.yieldInstructions.length;
    await this.onPartialGen();
    const yields: Yield[] = [];
    this.on(LMYieldEvents.generation, (data: Yield) => {
      yields.push(data);
    });
    while (yields.length < numberYields) {
      await delay(10);
    }
    return yields;
  }

  private async onPartialGen(
    partial = "",
    nextYieldInstruction: YieldInstruction | null = null
  ) {
    const program = this.addPartialToOAIProgram(partial);
    await this.yield(program, nextYieldInstruction);
  }

  private addPartialToOAIProgram(partialGen: string) {
    const lastElement = this.oaiProgram.slice(-1)[0];
    const additionalFormatting =
      partialGen.length > 0 ? "\n\n" + partialGen : "";
    return this.oaiProgram.slice(0, -1).concat({
      ...lastElement,
      content: lastElement.content + additionalFormatting,
    });
  }

  private async yield(
    program: OAIProgram,
    nextYieldInstruction: YieldInstruction | null
  ) {
    this.yieldInstructions.reverse();
    if (this.yieldInstructions.length === 0 && nextYieldInstruction === null) {
      throw new Error("Yield instruction block missing any gen instructions");
    }
    let currentYieldInstruction =
      nextYieldInstruction ||
      (this.yieldInstructions.pop() as YieldInstruction);
    let parsedGeneration = "";
    let generation = "";
    let prefix = "";
    if (nextYieldInstruction !== null) {
      prefix = nextYieldInstruction.priorChunk;
    }
    let stream: OAIStream;
    const restart = () => {
      if (stream) {
        stream.destroy();
        devLog("Decoding deviation, restarting");
        const nextPrompting = currentYieldInstruction.priorChunk;
        const gen = this.yields
          .map(
            (y) => y.instruction.priorChunk + y.value + y.instruction.closureTag
          )
          .concat([nextPrompting])
          .join("\n");
        this.onPartialGen(gen, currentYieldInstruction);
      }
    };
    const openaiStreamConfig = {
      openai: openaiApi,
      handler: {
        onContent: (content: string) => {
          generation = prefix + content.trimStart();
          const partialGen = generation.slice(parsedGeneration.length);
          if (
            partialGen.startsWith(
              currentYieldInstruction.priorChunk.slice(0, partialGen.length)
            ) &&
            partialGen.length < currentYieldInstruction.priorChunk.length
          ) {
            // currently valid generation
            return;
          } else if (
            partialGen.startsWith(currentYieldInstruction.priorChunk) &&
            partialGen.length >= currentYieldInstruction.priorChunk.length
          ) {
            // currently generating a variable
            if (partialGen.startsWith(currentYieldInstruction.priorChunk)) {
              // check for yield instruction closure
              const remainingGen = partialGen.slice(
                currentYieldInstruction.priorChunk.length
              );
              if (remainingGen.includes(currentYieldInstruction.closureTag)) {
                // move to next closure tag
                const regex = new RegExp(
                  "(?<value>.*)" + currentYieldInstruction.closureTag + ".*",
                  "g"
                );
                const match = regex.exec(remainingGen) as Match;
                const value = match.groups?.value;
                if (value !== undefined) {
                  if (
                    !this.yields
                      .map((y) => y.name)
                      .includes(currentYieldInstruction.varName)
                  ) {
                    const newYield = {
                      name: currentYieldInstruction.varName,
                      value,
                      instruction: currentYieldInstruction,
                    };
                    this.emit(LMYieldEvents.generation, newYield);
                    this.yields.push(newYield);
                  }
                  if (this.yieldInstructions.length > 0) {
                    currentYieldInstruction =
                      this.yieldInstructions.pop() as YieldInstruction;
                    parsedGeneration = generation;
                  } else {
                    stream?.abort();
                  }
                } else {
                  throw new Error("NEED TO FIX THIS ERROR 108");
                }
              } else {
                // todo - add some streaming here
              }
            } else {
              restart();
            }
          } else {
            restart();
          }
        },
        onDone: () => {
          if (this.yieldInstructions.length > 0) {
            restart();
          }
        },
      },
    };

    // TODO: write own openai parser in socialagi https://github.com/justinmahar/openai-ext
    devLog(`New stream`);
    const openaiStreamResponse = await OpenAIExt.streamServerChatCompletion(
      {
        model: this.options.model,
        messages: program,
      },
      openaiStreamConfig
    );

    stream = openaiStreamResponse.data;
  }
}
