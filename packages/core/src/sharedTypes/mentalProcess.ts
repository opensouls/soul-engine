import { WorkingMemory } from "../WorkingMemory.js"
import type { CortexStep } from "./cortexStep.d.ts"

export interface MentalProcessArguments<ParamType> {
  params: ParamType,
  step: CortexStep<any>
  workingMemory: WorkingMemory
}

export type MentalProcess<ParamType = Record<number | string, any>> = 
  (args: MentalProcessArguments<ParamType>) => Promise<CortexStep<any> | WorkingMemory>
  