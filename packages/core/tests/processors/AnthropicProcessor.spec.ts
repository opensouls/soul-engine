import { expect } from 'chai';
import { WorkingMemory } from '../../src/WorkingMemory.js';
import { ChatMessageRoleEnum } from '../../src/Memory.js';
import { z } from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema"
import { AnthropicProcessor } from '../../src/processors/AnthropicProcessor.js';
import { indentNicely } from '../../src/utils.js';
import { externalDialog } from '../shared/cognitiveSteps.js';

describe('AnthropicProcessor', function() {
  it('processes input from WorkingMemory and return a valid response', async function() {
    const processor = new AnthropicProcessor({});
    const workingMemory = new WorkingMemory({
      soulName: 'testEntity',
      memories: [
        {
          role: ChatMessageRoleEnum.User,
          content: "Hello, world!"
        }
      ],
    });

    const response = await processor.process({ memory: workingMemory, model: "claude-3-haiku-20240307" });
    
    let streamed = ""
    for await (const chunk of response.stream) {
      streamed += chunk
    }
    
    const completion = await response.rawCompletion;
    expect(completion).to.be.a('string');

    const usage = await response.usage;
    expect(usage).to.have.property('input');
    expect(usage.input).to.be.greaterThan(0);
    expect(usage.output).to.be.greaterThan(0);
    expect(streamed).to.equal(completion);
  });

  it('works with cogntive steps', async function() {
    const workingMemory = new WorkingMemory({
      soulName: 'testEntity',
      memories: [
        {
          role: ChatMessageRoleEnum.System,
          content: "You are amazing"
        },
        {
          role: ChatMessageRoleEnum.User,
          content: "Interlocutor said: 'hey'"
        }
      ],
      processor: {
        name: AnthropicProcessor.label,
      }
    });

    const [, response] = await externalDialog(workingMemory, "Say hello magnificently!", { model: "claude-3-haiku-20240307" });

    expect(response).to.be.a('string');
  });

  it("returns typed json if a schema is passed in", async () => {
    const params = z.object({
      text: z.string()
    })
    
    const processor = new AnthropicProcessor({});
    const workingMemory = new WorkingMemory({
      soulName: 'testEntity',
      memories: [
        {
          role: ChatMessageRoleEnum.System,
          content: "You only speak JSON in the requested formats."
        },
        {
          role: ChatMessageRoleEnum.User,
          content: indentNicely`
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
