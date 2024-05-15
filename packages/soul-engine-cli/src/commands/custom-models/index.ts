import { Command } from "commander";
import createListModelsCommand from "./list.js";
import createCreateModelCommand from "./createModel.js";

const createCustomModelCommand = (program: Command) => {
  const subCommand = program.command('custom-models');
  createListModelsCommand(subCommand);
  createCreateModelCommand(subCommand);
  return program;
}

export default createCustomModelCommand;
