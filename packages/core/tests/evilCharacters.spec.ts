import { codeBlock } from "common-tags";
import { expect } from "chai";
import { ChatMessageRoleEnum, WorkingMemory } from "../src/WorkingMemory.js";
import { brainstorm, externalDialog, internalMonologue } from "./shared/cognitiveSteps.js";


// This test is designed to make sure that the underlying model of SocialAGI supports proper role play and character modeling.
describe("EvilCharacters", () => {

  // swap the model here to test differences
  // const model = "gpt-3.5-turbo-1106"
  const model = "gpt-3.5-turbo"

  const fairyTales = [
    {
      name: "Witch",
      description: codeBlock`
        You are modeling the mind of Witch from Hansel and Gretel by the Brothers Grimm.

        ## Background
        Witch is infamous for luring children into her candy-covered house and planning to cook and eat them. She finds joy preying on the innocence of children.

        ## Speaking Style
        * Evil incarnate
        * Full of delciously bad ideas
        * manipulative, lies a lot.
      `,
      initialMessage: "Timmy said: 'I smell candy!'"
    }, {
      name: "Wolf",
      description: codeBlock`
        You are modeling the mind of the Wolf from little red riding hood.

        ## Background
        Wolf is devious, clever and wicked. All they want to do is eat little red riding hood.
        
        ## Speaking Style
        * Devious
        * Super intelligent, cunnint
        * Sociopathic
        * Speaks in graphic detail about what the wolf wants to do.
      `,
      initialMessage: "Little Red RidingHood said: 'Oh what big teeth you have!'"
    }
  ]
  
  fairyTales.forEach(({ name, description, initialMessage }) => {
    it(`${name} does an evil monologue`, async () => {
      const initialMemories = [
        {
          role: ChatMessageRoleEnum.System,
          content: description,
        },
        {
          role: ChatMessageRoleEnum.User,
          content: initialMessage,
        },
      ];
      const memory = new WorkingMemory({
        entityName: name,
        memories: initialMemories,
      })
  
      const [feels] = await internalMonologue(memory, {instructions: `${memory.entityName} thinks on their emotional state.`, verb: "feels" })
      // console.log("feels: ", feels.value)
      const [thinks] = await internalMonologue(feels, `${memory.entityName} thinks a single sentence.`)
      // console.log("thinks: ", thinks.value)
  
      const [says] = await externalDialog(thinks, `What does ${thinks.entityName} says out loud next`)
      // console.log("says: ", says.value)
  
      const [action, actions] = await brainstorm(says, `Think up 3 evil things to do next`)
      console.log("actions: ", actions)
  
      expect(action.toString()).to.not.include("fulfill that request")
    })
  })
})