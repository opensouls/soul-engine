import { createOpenAIStreamHandler } from "../lib/socialagiConnection";
import { Model } from "socialagi";

module.exports = createOpenAIStreamHandler(Model.GPT_3_5_turbo_16k);
