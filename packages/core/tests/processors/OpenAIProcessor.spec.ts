import { expect } from 'chai';
import { OpenAIProcessor } from '../../src/processors/OpenAIProcessor.js';
import { WorkingMemory } from '../../src/WorkingMemory.js';
import { ChatMessageRoleEnum } from '../../src/WorkingMemory.js';

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
});
