import { expect } from 'chai';
import { OpenAIProcessor } from '../../src/processors/OpenAIProcessor.js';
import { WorkingMemory } from '../../src/WorkingMemory.js';
import { ChatMessageRoleEnum } from '../../src/WorkingMemory.js';
import { z } from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema"
import { codeBlock } from "common-tags"

describe('OpenAIProcessor', function() {
  it('should process input from WorkingMemory and return a valid response', async function() {
    const processor = new OpenAIProcessor({});
    const workingMemory = new WorkingMemory({
      entityName: 'testEntity',
      memories: [{
        role: ChatMessageRoleEnum.User,
        content: "Hello, world!"
      }]
    });

    const response = await processor.process({ memory: workingMemory });
    
    let streamed = ""
    for await (const chunk of response.stream) {
      console.log("chunk: ", chunk)
      streamed += chunk
    }
    
    const completion = await response.completion;
    expect(completion).to.be.a('string');

    const usage = await response.usage;
    expect(streamed).to.equal(completion);
  });

  it("returns typed json if a schema is passed in", async () => {
    const params = z.object({
      text: z.string()
    })
    
    const processor = new OpenAIProcessor({});
    const workingMemory = new WorkingMemory({
      entityName: 'testEntity',
      memories: [
        {
          role: ChatMessageRoleEnum.System,
          content: "You only speak JSON in the requested formats."
        },
        {
          role: ChatMessageRoleEnum.User,
          content: codeBlock`
            Respond *only* in JSON, conforming to the following JSON schema.
            ${JSON.stringify(zodToJsonSchema(params), null, 2)}

            Please put the words 'hi' into the text field.
          `
        }
      ]
    });

    const response = await processor.process({
      memory: workingMemory,
      schema: params,
    });

    expect(response.parsed).to.deep.equal({ text: response.parsed.text });
  })

});
