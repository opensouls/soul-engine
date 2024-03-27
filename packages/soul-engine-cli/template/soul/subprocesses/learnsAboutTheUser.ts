
import { ChatMessageRoleEnum, MentalProcess, WorkingMemory, createCognitiveStep, indentNicely, useActions, useProcessMemory } from "@opensouls/engine";
import mentalQuery from "../lib/mentalQuery.js";
import internalMonologue from "../lib/internalMonologue.js";

const userNotes = createCognitiveStep(() => {
  return {
    command: ({ soulName: name}: WorkingMemory) => {
      return {
        role: ChatMessageRoleEnum.System,
        content: indentNicely`
          Model the mind of ${name}.

          ## Description
          Write an updated and clear set of notes on the user that ${name} would want to remember.

          ## Rules
          * Keep descriptions as bullet points
          * Keep relevant bullet points from before
          * Use abbreviated language to keep the notes short
          * Do not write any notes about ${name}

          Please reply with the updated notes on the user:'
        `,
      }
    },
    postProcess: async (_step, response: string) => {
      return [
        {
          role: ChatMessageRoleEnum.Assistant,
          content: response
        },   
        response
      ]
    }
  }
})

const learnsAboutTheUser: MentalProcess = async ({ workingMemory: initialStep }) => {
  const userModel = useProcessMemory("Unkown User")
  const { log } = useActions()

  let step = initialStep
  let finalStep = initialStep

  step = step.withMemory({
    role: ChatMessageRoleEnum.Assistant,
    content: indentNicely`
      ${step.soulName} remembers:

      ## User model

      ${userModel.current}
    `
  })

  const [,learnedSomethingNew] = await mentalQuery(
    step,
    `${step.soulName} has learned something new and they need to update the mental model of the user.`,
    { model: "exp/nous-hermes-2-mixtral-fp8" }
  )

  log("Update model?", learnedSomethingNew)
  if (learnedSomethingNew) {
    let monologue
    [step, monologue] = await internalMonologue(step,
      {
        instructions: "What have I learned specifically about the user from the last few messages?",
        verb: "noted"
      },
      { model: "exp/nous-hermes-2-mixtral-fp8" }
    )
    log("User Learnings:", monologue)
    const [, notes] = await userNotes(step, undefined, { model: "exp/nous-hermes-2-mixtral-fp8" })
    userModel.current = notes
  }

  const [, needsToChange] = await mentalQuery(step,
    `${step.soulName} thinks they to make changes to their behavior.`,
    { model: "exp/nous-hermes-2-mixtral-fp8" }
  )

  log("Internal voice?", needsToChange)
  if (needsToChange) {

    const [, thought] = await internalMonologue(step,
      {
        instructions: "What should I think to myself to change my behavior? Start with 'I need...'",
        verb: "thinks"
      },
      { model: "exp/nous-hermes-2-mixtral-fp8" }
    )

    log("behavior updates:", thought)

    finalStep = initialStep.withMemory({
      role: ChatMessageRoleEnum.Assistant,
      content: `${step.soulName} thought to themself: ${thought}`
    })
  }

  return finalStep
}

export default learnsAboutTheUser
