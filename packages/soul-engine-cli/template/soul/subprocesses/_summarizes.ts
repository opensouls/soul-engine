
import { ChatMessageRoleEnum, MentalProcess, WorkingMemory, createCognitiveStep, indentNicely, useActions, useProcessMemory } from "@opensouls/engine";
import { internalMonologue } from "../lib/cognitiveSteps.js";

const conversationNotes = createCognitiveStep((existing: string) => {
  return {
    command: ({ soulName: name }: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        content: indentNicely`
          ## Existing notes
          ${existing}

          ## Description
          Write an updated and clear paragraph describing the conversation so far.
          Make sure to keep details that ${name} would want to remember.

          ## Rules
          * Keep descriptions as a paragraph
          * Keep relevant information from before
          * Use abbreviated language to keep the notes short
          * Make sure to detail the motivation of ${name} (what are they trying to accomplish, what have they done so far).

          Please reply with the updated notes on the conversation:
        `,
      }
    },
  }
})

const summarizesConversation: MentalProcess = async ({ workingMemory }) => {
  const conversationModel = useProcessMemory(indentNicely`
    ${workingMemory.soulName} met a new user for the first time. They are just getting to know each other and ${workingMemory.soulName} is trying to learn as much as they can about the user.
  `)
  const { log } = useActions()

  let step = workingMemory

  if (step.memories.length > 5) {
    log("updating conversation notes");
    [step] = await internalMonologue(step, {
      instructions: indentNicely`
        What is really important that I remember about this conversation?
      `,
      verb: "noted"
    },
    { 
      model: "exp/nous-hermes-2-mixtral-fp8",
    });

    let updatedNotes
    
    [step, updatedNotes] = await conversationNotes(step, conversationModel.current, { model: "exp/nous-hermes-2-mixtral-fp8" })

    conversationModel.current = updatedNotes as string

    return workingMemory.slice(0, 1).withMemory({
      role: ChatMessageRoleEnum.Assistant,
      content: indentNicely`
        ## Conversation so far
        ${updatedNotes}
      `,
      metadata: {
        conversationSummary: true
      }
    }).concat(workingMemory.slice(-4))
  }

  return step
}

export default summarizesConversation
