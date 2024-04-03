import { WorkingMemory } from "@opensouls/core"

export interface MentalProcessArguments<ParamType, CortexStepType = any> {
  params: ParamType,
  step: CortexStepType
  workingMemory: WorkingMemory
}

export interface MentalProcessReturnOptions<ParamType> {
  params?: ParamType,
  executeNow?: boolean
}

export type MentalProcessReturnTypes<CortexStepType, ParamType = any> = CortexStepType | WorkingMemory | [WorkingMemory, MentalProcess<ParamType>] | [WorkingMemory, MentalProcess<ParamType>, MentalProcessReturnOptions<ParamType>]

export type MentalProcess<ParamType = Record<number | string, any>, CortexStepType = any> = 
  (args: MentalProcessArguments<ParamType, CortexStepType>) => Promise<MentalProcessReturnTypes<CortexStepType, ParamType>>
  