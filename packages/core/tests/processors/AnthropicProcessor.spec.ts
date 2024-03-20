import { expect } from 'chai';
import { WorkingMemory } from '../../src/WorkingMemory.js';
import { ChatMessageRoleEnum } from '../../src/WorkingMemory.js';
import { z } from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema"
import { codeBlock } from "common-tags"
import { AnthropicProcessor } from '../../src/processors/AnthropicProcessor.js';

describe('AnthropicProcessor', function() {
  it('should process input from WorkingMemory and return a valid response', async function() {
    const processor = new AnthropicProcessor({});
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
      streamed += chunk
    }
    
    const completion = await response.rawCompletion;
    expect(completion).to.be.a('string');

    const usage = await response.usage;
    expect(usage).to.have.property('input');
    expect(streamed).to.equal(completion);
  });

  it("returns typed json if a schema is passed in", async () => {
    const params = z.object({
      text: z.string()
    })
    
    const processor = new AnthropicProcessor({});
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

    expect(await response.parsed).to.deep.equal({ text: (await response.parsed).text });
  })

});
