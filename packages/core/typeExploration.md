# Types

## This is a simple reference type system to use as a guide for the larger system.

```typescript

import { expect } from "chai"
import { ZodSchema, z } from "zod"

type WorkingMemory = {_wm: true}

const wm:WorkingMemory = { _wm: true }

interface TransformOptions<SchemaType, PostProcessType> {
  command: string
  schema?: ZodSchema<SchemaType>
  postProcess?: () => PostProcessType
}

interface RequestOpts {
  stream?: boolean
}

type TransformReturnStreaming<PostProcessType> = [string, string, PostProcessType]
type TransformReturnNonStreaming<PostProcessType> = [string, PostProcessType]
type TransformReturn<PostProcessType> = TransformReturnNonStreaming<PostProcessType> | TransformReturnStreaming<PostProcessType>

async function transform<SchemaType, PostProcessType>(transformation: TransformOptions<SchemaType, PostProcessType>, opts: { stream: true } & RequestOpts): Promise<TransformReturnStreaming<PostProcessType>>;
async function transform<SchemaType, PostProcessType>(transformation: TransformOptions<SchemaType, PostProcessType>, opts?: Omit<RequestOpts, 'stream'>): Promise<TransformReturn<PostProcessType>>;
async function transform<SchemaType, PostProcessType>(transformation: TransformOptions<SchemaType, PostProcessType>, opts?: { stream: false } & Omit<RequestOpts, 'stream'>): Promise<TransformReturn<PostProcessType>>;
async function transform<SchemaType, PostProcessType>(transformation: TransformOptions<SchemaType, PostProcessType>, opts: RequestOpts = {}): Promise<TransformReturn<PostProcessType> | TransformReturnStreaming<PostProcessType>> {
  if (opts.stream) {
    return ["0", "1", transformation.postProcess?.() || ("stream is true" as PostProcessType)]
  }

  return ["0", transformation.postProcess?.() || ("stream is false" as PostProcessType)]
}

type CognitiveStep<PostProcessType> = {
  (workingMemory: WorkingMemory, query: any, opts: { stream: true } & RequestOpts): Promise<TransformReturnStreaming<PostProcessType>>;
  (workingMemory: WorkingMemory, query: any, opts?: Omit<RequestOpts, 'stream'>): Promise<TransformReturnNonStreaming<PostProcessType>>;
  (workingMemory: WorkingMemory, query: any, opts?: { stream: false } & Omit<RequestOpts, 'stream'>): Promise<TransformReturnNonStreaming<PostProcessType>>;
}

const createCognitiveStep = <SchemaType, PostProcessType>(cb: (singleArg: any) => TransformOptions<SchemaType, PostProcessType>): CognitiveStep<PostProcessType> => {

  return (async (workingMemory: WorkingMemory, singleArg: any, opts: RequestOpts = {}) => {
    const transformOpts = cb(singleArg)
    return transform(transformOpts, opts)
  }) as CognitiveStep<PostProcessType>
}


const externalDialog = createCognitiveStep((instructions: string) => {
  return {
    command: "externalDialog",
    schema: z.object({
      answer: z.string().describe(`The answer to the question.`)
    }),
    postProcess: () => "post process"
  }
})


describe("typehell", () => {
  it("works with transform", async () => {
    const transformation = {
      command: "transform",
      schema: z.object({
        answer: z.string().describe(`The answer to the question.`)
      }),
      postProcess: () => "post process"
    }

    // these types working correctly
    const [response, postProcess] = await transform(transformation)
    expect(postProcess).to.be.a('string')

    const [streamed, streamed2, postProcess2] = await transform(transformation, { stream: true })
    expect(streamed2).to.equal("1")
    expect(postProcess2).to.be.a('string')

    // works too
    const resp = await externalDialog(wm, "What is the answer?")
    const respStream = await externalDialog(wm, "What is the answer?", { stream: true})
  })
})
```