import { expect } from "chai";
import { ChatMessageRoleEnum, CortexStep, OpenAILanguageProgramProcessor, externalDialog } from "../src"
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('vision', () => {
  // Convert image to Data URL
  const imagePath = resolve(__dirname, './shared/cat-in-bowl.png');
  const imageBuffer = readFileSync(imagePath);
  const imageBase64 = imageBuffer.toString('base64');
  const imageDataUrl = `data:image/png;base64,${imageBase64}`;
  // Use imageDataUrl where needed
  
  it('supports OpenAI vision', async () => {
    const step = new CortexStep("Samantha", {
      processor: new OpenAILanguageProgramProcessor({}, {
        model: "gpt-4-vision-preview",
        max_tokens: 500,
      })
    }).withMemory([
      {
        role: ChatMessageRoleEnum.System,
        content: "You are modeling the mind of Samantha, a gen-z physicist who loves cat pics.",
      },
      {
        role: ChatMessageRoleEnum.User,
        content: [
          { type: "text", text: "I just took this picture."},
          { type: "image_url", image_url: imageDataUrl },
        ]
      }
    ])

    const result = await step.next(externalDialog("Samantha describes what is in the photo."))
    console.log("vision result: ", result.value)
    expect(result.value).to.include("kitten")
  })
})