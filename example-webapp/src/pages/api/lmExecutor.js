import { createOpenAIExecutorHandler } from "../lib/socialagiConnection";
import { Model } from "socialagi";

module.exports = createOpenAIExecutorHandler(Model.GPT_3_5_turbo_16k);
