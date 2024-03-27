import { Command } from "commander";
import createApiKeyCommand from "./apikey.js";
import createDev from "./dev.js";
import createInit from "./init.js";
import createLogout from "./logout.js";
import createLogin from "./login.js";
import createRagCommand from "./rag/index.js";
import createInstall from "./install.js";

export const setupCLI = (program: Command) => {
  createApiKeyCommand(program);
  createDev(program);
  createInit(program);
  createLogin(program);
  createLogout(program);
  createRagCommand(program);
  createInstall(program);
}
