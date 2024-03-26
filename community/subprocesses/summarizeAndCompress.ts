
import { ChatMessageRoleEnum, MentalProcess, indentNicely, useActions, useProcessMemory } from "@opensouls/engine";
import { internalMonologue } from "../cognitiveSteps/basics/internalMonologue.js";
import { conversationNotes } from "../cognitiveSteps/conversationNotes.js";


/*
 * A really useful subprocess to reduce the amount of noise that goes off to the model, yet keeps important details (as determined by the soul) around.
 * 
 */
const summarizeAndCompressConversation: MentalProcess = async ({ workingMemory }) => {
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
    });

    let updatedNotes
    
    [step, updatedNotes] = await conversationNotes(step, conversationModel.current)

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
    }).concat(workingMemory.slice(-2))
  }

  return step
}

export default summarizeAndCompressConversation
