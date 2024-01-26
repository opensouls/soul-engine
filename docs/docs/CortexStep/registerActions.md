---
id: actions
sidebar_position: 4
---

# Custom Cognitive Functions

The CortexStep class in the SocialAGI library, meant for modelling an AI's internal monologue, provides flexibility by allowing custom cognitive functions apart from its predefined ones.

## Building a Cognitive Function

Cogntiive functions use 

```typescript
import { CortexStep, NextFunction, StepCommand, z } from "socialagi";
import { html } from "common-tags";

export const existingKnowledge = (goal: string) => {
  return ({ entityName }: CortexStep<any>) => {
    const params = z.object({
      questions: z.array(z.string()).describe(html`
        1 to 3 questions related to the webpage that ${entityName} might already know the answer to.
      `)
    })

    return {
      name: `save_existing_knowledge_questions`,
      description: html`
        Saves questions that ${entityName} might already know the answer to.
      `,
      parameters: params,
      command: html`
        goal: ${goal}
        Carefully analyze ${entityName}'s interests, purpose, goals and decide what existing knowledge ${entityName} might have around topics related to this webpage.
      `,
    }
  }
}

```

Cognitive functions consist of a name, a description, parameters (specified using Zod and following the OpenAI schema), and a "command" which is inserted as a system message into the dialog.

## Invoking a Cognitive Function

Call your cognitive function using the `next` method:

```javascript
step = await step.next(existingKnowledge("To explore the universe"))
// values are strongly typed!
const { questions } = response.value

```


## Important Points

- CortexStep aims to model an AI's internal monologue. Keeping this concept in mind when defining custom actions ensures consistency.

Through cognitive functions, you can extend CortexStep's capabilities and create a flexible cognitive model.


## The Process Function

Sometimes you want to shape how the soul's memory is changed by the cogntive function and you can do this with the process function. We will modify the above cognitive function:

```typescript
import { CortexStep, NextFunction, StepCommand, z } from "socialagi";
import { html } from "common-tags";

export const existingKnowledge = (goal: string) => {
  return ({ entityName }: CortexStep<any>) => {
    const params = z.object({
      questions: z.array(z.string()).describe(html`
        1 to 3 questions related to the webpage that ${entityName} might already know the answer to.
      `)
    })

    return {
      name: `save_existing_knowledge_questions`,
      description: html`
        Saves questions that ${entityName} might already know the answer to.
      `,
      parameters: params,
      command: html`
        goal: ${goal}
        Carefully analyze ${entityName}'s interests, purpose, goals and decide what existing knowledge ${entityName} might have around topics related to this webpage.
      `,
      process: (step: CortexStep<any>, response: z.output<typeof params>) => {
        return {
          value: response.questions,
          memories: [{
            role: ChatMessageRoleEnum.Assistant,
            content: html`
              ${entityName} thinks they might know the answer to the following questions:
              ${response.questions.join("\n")}
            `
          }],
        }
      }
    }
  }
}
```

Notice how we've changed the value (so now response.value will be the array of questions instead of an object that looks like `{ questions: [...questions here] }`). We've also modified the memories that will be given to the Open Soul to make it easier for the soul to process them.