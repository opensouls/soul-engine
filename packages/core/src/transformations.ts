import { WorkingMemory } from "./WorkingMemory.js"

export type CognitiveTransformation = (workingMemory: WorkingMemory) => Promise<WorkingMemory>


interface TransformMemoryOptions {
  processor: string
  command: string | ((workingMemory: WorkingMemory) => string)
  update: (originalMemory: WorkingMemory, response: string) => Promise<WorkingMemory>

}

export const transformMemory: CognitiveTransformation = async (workingMemory) => {
  // 
  return workingMemory
}


// return await transformMemory(workingMemory, {
//   processor: "quality",
//   command: ({ entityName: name }: CortexStep) => {
//     return html`
//       Model the mind of ${name}.
      
//       ## Description
//       Write an updated and clear set of notes on the user that ${name} would want to remember.

//       ## Rules
//       * Keep descriptions as bullet points
//       * Keep relevant bullet points from before
//       * Use abbreviated language to keep the notes short
//       * Do not write any notes about ${name} in the third person

//       Please reply with the updated notes on the user:'
//   `},
//   // need to fix the process fxn but yeah
//   update: (memory, response: string) => {
//     return [{...memory, {
//               role: ChatMessageRoleEnum.Assistant,
//               content: response
//             }}, value]
//   }
// })
// }