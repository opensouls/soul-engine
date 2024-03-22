import { WorkingMemory } from "@opensouls/core"

export interface MentalProcessArguments<ParamType, CortexStepType = any> {
  params: ParamType,
  step: CortexStepType
  workingMemory: WorkingMemory
}

export type MentalProcess<ParamType = Record<number | string, any>, CortexStepType = any> = 
  (args: MentalProcessArguments<ParamType, CortexStepType>) => Promise<CortexStepType | WorkingMemory>
  