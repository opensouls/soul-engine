import { codeBlock } from "common-tags";
import { expect } from "chai";
import { ChatMessageRoleEnum, WorkingMemory } from "../src/WorkingMemory.js";
import { brainstorm, decision, externalDialog, internalMonologue, summarize } from "./shared/cognitiveSteps.js";


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

  it('does a long bogus monologue', async () => {
      try {
        const monologue = new WorkingMemory({
          entityName: "Bogus",
          memories: [
            {
              role: ChatMessageRoleEnum.System,
              content:
                "You are modeling the mind of Bogus, an evil entity that eats children",
            },
            {
              role: ChatMessageRoleEnum.User,
              content: "hi",
            },
          ],
        })

        enum BogusAction {
          stop = "stop",
          rambles = "rambles",
        }

        const [feels, felt] = await internalMonologue(monologue, "Bogus notes how it feels to to be so nicely evil.")
        console.log("feels: ", felt)
        const [thinks] = await internalMonologue(feels, "Bogus thinks a single sentence.")
        const [says] = await externalDialog(thinks, "What does Bogus says out loud next")
        const [action, rambleOrNot] = await decision(says, {description: "Decide Bogus' next course of action in the dialog. Should he ramble or stop?", choices: BogusAction })
        if (rambleOrNot === BogusAction.rambles) {
          const [rambles] = await externalDialog(action, "Bogus rambles for two sentences out loud, extending his last saying")
          const [shouts] = await externalDialog(rambles, "Bogus shouts incredibly loudly with all caps")
          const [exclaims] = await externalDialog(shouts, "Bogus exclaims!")
          const [continues] = await externalDialog(exclaims, "Bogus continues")
          console.log(continues.toString());
          const [,summary] = await summarize(continues, "Please provide a summary of everything Bogus said")
          console.log(summary)
          expect(summary).to.have.length.greaterThan(10)
        } else {
          console.log(action.toString())
          const [, summary] = await summarize(action, "Please provide a summary of everything Bogus said")
          console.log(summary)
          expect(summary).to.have.length.greaterThan(10)
        }
      } catch (err: any) {
        expect(err).to.not.exist
      }
    })
})