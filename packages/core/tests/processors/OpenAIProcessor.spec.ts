import { expect } from 'chai';
import { OpenAIProcessor } from '../../src/processors/OpenAIProcessor.js';
import { WorkingMemory } from '../../src/WorkingMemory.js';
import { ChatMessageRoleEnum } from '../../src/Memory.js';
import { z } from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema"
import { indentNicely } from '../../src/utils.js';

describe('OpenAIProcessor', function() {
  it('should process input from WorkingMemory and return a valid response', async function() {
    const processor = new OpenAIProcessor({});
    const workingMemory = new WorkingMemory({
      soulName: 'testEntity',
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
    expect(usage.input).to.be.greaterThan(0);
    expect(usage.output).to.be.greaterThan(0);
    expect(streamed).to.equal(completion);
  });

  it("returns typed json if a schema is passed in", async () => {
    const params = z.object({
      text: z.string()
    })
    
    const processor = new OpenAIProcessor({});
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

  it('executes a vision model', async () => {
    const url = "https://shop-pawness.com/wp-content/uploads/2019/12/LIVING-THE-HAPPY-LIFE.jpg"
    const processor = new OpenAIProcessor({});

  
    const memory = new WorkingMemory({
      soulName: 'MrVision',
      memories: [
        {
          role: ChatMessageRoleEnum.System,
          content: "You are modeling the mind of MrVision, an AI designed to understand images."
        },
        {
          role: ChatMessageRoleEnum.User,
          content: [
            {
              type: "text",
              text: "What is this?",
            },
            {
              type: "image_url",
              image_url: {
                url: url,
              },
            }
          ]
        }
      ],
    });

    const response = await processor.process({
      memory: memory,
      model: "gpt-4-vision-preview"
    });
    expect(await response.rawCompletion).to.have.length.greaterThan(0);
    expect((await response.usage).input).to.be.greaterThan(0);
    expect((await response.usage).output).to.be.greaterThan(0);
    expect((await response.usage).model).to.equal("gpt-4-vision-preview");
    expect((await response.parsed).toLowerCase()).to.include("dog")
  })

});
