import { CortexValue } from "../cortexStep.js";
import { ChatMessage, FunctionSpecification } from "./index.js";

export interface FunctionRunnerResponse {
  lastValue: CortexValue;
  memories: ChatMessage[];
}

export interface FunctionRunner {
  specification: FunctionSpecification;
  run: (args: any) => Promise<FunctionRunnerResponse>;
}
