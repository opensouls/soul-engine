import { Command } from "commander";
import createListModelsCommand from "./list.js";

const createCustomModelCommand = (program: Command) => {
  const subCommand = program.command('custom-models');
  createListModelsCommand(subCommand);
  return program;
}

export default createCustomModelCommand;
