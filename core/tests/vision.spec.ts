import { ChatMessageRoleEnum, CortexStep, externalDialog } from "../src"
import { readFileSync } from 'fs';
import { resolve } from 'path';
import "./shared/dotenv"

describe('vision', () => {
  // Convert image to Data URL
  const imagePath = resolve(__dirname, './shared/cat-in-bowl.png');
  const imageBuffer = readFileSync(imagePath);
  const imageBase64 = imageBuffer.toString('base64');
  const imageDataUrl = `data:image/png;base64,${imageBase64}`;
  // Use imageDataUrl where needed
  
  it.only('supports OpenAI vision', async () => {
    const step = new CortexStep("Samantha").withMemory([
      {
        role: ChatMessageRoleEnum.System,
        content: "You are modeling the mind of Samantha, a gen-z physicist who loves cat pics.",
      },
      {
        role: ChatMessageRoleEnum.User,
        content: "What is this a picture of?",
      },
      {
        role: ChatMessageRoleEnum.User,
        type: "image_url",
        image_url: imageDataUrl,
      }
    ])

    const result = await step.next(externalDialog(), { model: "gpt-4-vision-preview"})
    console.log("result: ", result.value)
  })
})