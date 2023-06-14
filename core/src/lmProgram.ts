import {
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum,
  Configuration,
  OpenAIApi,
} from "openai";
import { processLMProgram } from "./lmProcessing";
import { devLog } from "./utils";
import { OpenAIExt } from "openai-ext";
import { Thought } from "./lmStream";
import EventEmitter from "events";

const dumy = `
{{#context~}}
{{! this block compiles to system in oai}}

{{personality}}

...
{{~/context}

{{#human~ name='xyz'}}
{{! this block compiles to user in oai}}
...
{{~/human}}

{{#generated~}}
{{! this block compiles to system in assistant in oai and must be last}}
...
{{~/generated}}

{{#instructions~}}
{{! this optional block currently compiles to system in assistant in oai and must before the generated block}}
...
{{~/instructions}}

{{#yield~}}
{{! this block compiles to system in assistant in oai and must be last}}
<FEELS>I feel {{gen 'feeling' until '</FEELS>'}}
...
{{~/yield}}
`;

// class lmProgram {
//   private program: string;
//   constructor(program: string) {
//     this.program = program.trim();
//   }
//
//   private programToGPTChat(): ChatCompletionRequestMessage[] {
//     this.program;
//   }
// }

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
    /{{#(?<blockName>context|human|generated|instructions|yield)~\s{0,1}(name='(?<name>.*)')?}}(?<content>[\s\S]*?){{~\/\1}}/gm;

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
  human: ChatCompletionRequestMessageRoleEnum.User,
};

enum blockTypes {
  context = "context",
  generated = "generated",
  instructions = "instructions",
  yieldBlock = "yield",
  human = "human",
}

type OAIProgram = ChatCompletionRequestMessage[];

function compileToOAI(blocks: Block[], generationProgress = ""): OAIProgram {
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
  if (generationProgress.length > 0) {
    // magic
  }
  return messages;
}

const program = `
{{#context~}}
The following is a conversation between <Bogus>{{personality}}</Bogus>, and an unknown person.

Several thought patterns are references through the conversation:

Bogus uses the following <INTERNAL_DIALOG/> to think through what it says next.

<INTERNAL_DIALOG>
  <FELT>Bogus felt ...</FELT>
  <THOUGHT>Bogus thought ...</THOUGHT>
  <SAID>Bogus said "..."</SAID>
  <ANALYZED>Next, I plan to ...</ANALYZED>
</INTERNAL_DIALOG>
<END />
{{~/context}}

{{#human~ name='xyz'}}
<MEMORY for="xyz">
  <SAID>"Hi"</SAID>
</MEMORY>
{{~/human}}

{{#generated~}}
<MEMORY for="Bogus">
  <FELT>Bogus felt excited and hungry</FELT>
  <THOUGHT>Bogus thought perhaps another victim for me to feast upon</THOUGHT>
  <SAID>Bogus said "Hello there, little one. What brings you to my neck of the woods?"</SAID>
  <ANALYZED>Next, Bogus planed to lull them into a false sense of security before pouncing.</ANALYZED>
</MEMORY>
{{~/generated}}

{{#human~ name='xyz'}}
<MEMORY for="xyz">
  <SAYS>"I think I'm lost"</SAYS>
</MEMORY>
{{~/human}}

{{#instructions~}}
Then, Bogus had the following <INTERNAL_DIALOG />
{{~/instructions}}

{{#yield~}}
<INTERNAL_DIALOG>
  <FELT>Bogus felt {{gen 'feeling' until '</FELT>'}}
  <THOUGHT>Bogus thought {{gen 'thought' until '</THOUGHT>'}}
  <SAID>Bogus said "{{gen 'saying' until '"</SAID>'}}
  <ANALYZED>Next, Bogus plans to {{gen 'analyzed' until '</ANALYZED>'}}
</INTERNAL_DIALOG>
<END />
{{~/yield}}
`;
//<FEELS>I feel {{gen 'feeling' until '</FEELS>'}}

const apiKey = process.env.OPENAI_API_KEY;
const configuration = new Configuration({ apiKey });
const openaiApi = new OpenAIApi(configuration);

const blocks = parseProgram(program, [
  {
    personality: "Bogus, an evil witch that eats children",
  },
]);
if (blocks.length < 2) {
  throw new Error("Missing blocks in lmProgram");
}
const oaiProgram = compileToOAI(blocks);

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
  return results;
}
const yieldBlock = blocks.slice(-1)[0];
const yieldInstructions = parseYieldBlock(yieldBlock.content);

type Yield = {
  name: string;
  value: string;
  instruction: YieldInstruction;
};

type onPartialGenType = (partial: string) => void;

class LMYield {
  public oaiProgram: OAIProgram;
  public yieldInstructions: YieldInstruction[];
  public yields: Yield[] = [];

  constructor(oaiProgram: OAIProgram, yieldInstructions: YieldInstruction[]) {
    this.oaiProgram = oaiProgram;
    this.yieldInstructions = yieldInstructions;
  }

  public async generate() {
    await this.onPartialGen();
    while (yieldInstructions.length > 0) {
      // wait
    }
    return this.yields;
  }

  private async onPartialGen(partial = "") {
    const program = this.addPartialToOAIProgram(partial);
    await this.yield(program, this.onPartialGen);
  }

  private addPartialToOAIProgram(partialGen: string) {
    const lastElement = this.oaiProgram.slice(-1)[0];
    return oaiProgram.slice(0, -1).concat({
      ...lastElement,
      content: lastElement.content + "\n\n" + partialGen,
    });
  }

  private async yield(program: OAIProgram, onPartialGen: onPartialGenType) {
    yieldInstructions.reverse();
    if (yieldInstructions.length === 0) {
      throw new Error("Yield instruction block missing any gen instructions");
    }
    let currentYieldInstruction = yieldInstructions.pop() as YieldInstruction;
    let parsedGeneration = "";
    let generation = "";
    let stream: any;
    const restart = (partialGen: string) => {
      console.log("NEED TO RESTART\n\n", partialGen);
      const nextPrompting = currentYieldInstruction.priorChunk;
      const gen = this.yields
        .map(
          (y) => y.instruction.priorChunk + y.value + y.instruction.closureTag
        )
        .concat([nextPrompting])
        .join("\n");
      onPartialGen(gen);
    };
    const openaiStreamConfig = {
      openai: openaiApi,
      handler: {
        onContent: (content: string) => {
          console.log(content);
          generation = content.trimStart();
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
                  this.yields.push({
                    name: currentYieldInstruction.varName,
                    value,
                    instruction: currentYieldInstruction,
                  });
                  if (yieldInstructions.length > 0) {
                    currentYieldInstruction =
                      yieldInstructions.pop() as YieldInstruction;
                    parsedGeneration = generation;
                  } else {
                    stream.abort();
                  }
                } else {
                  throw new Error("NEED TO FIX THIS ERROR 108");
                }
              } else {
                // todo - add some streaming here
              }
            } else {
              console.log("a", {
                generation,
                chunk: currentYieldInstruction.priorChunk,
              });
              restart(generation);
            }
          } else {
            console.log("b", {
              yields: this.yields,
              generation,
              partialGen,
              currentYieldInstruction,
            });
            restart(generation);
          }
        },
        onDone: () => {
          if (yieldInstructions.length > 0) {
            restart(generation);
          }
          console.log("WTFFFFF", this.yields);
        },
      },
    };

    // TODO: upstream lib parses stream chunks correctly but sometimes emits a spurious error
    //   open PR to silence non-fatal errors in https://github.com/justinmahar/openai-ext
    devLog("New stream");
    const openaiStreamResponse = await OpenAIExt.streamServerChatCompletion(
      {
        model: "gpt-3.5-turbo-16k",
        messages: program,
      },
      openaiStreamConfig
    );

    console.log("STREAMING");
    stream = openaiStreamResponse.data;
  }
}
const lmYield = new LMYield(oaiProgram, yieldInstructions);
lmYield.generate();
