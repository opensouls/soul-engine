import { Command } from "commander";
import createStoresPullCommand from "./pull.js";


const createStoreCommand = (program: Command) => {
  const subCommand = program.command('stores')
  createStoresPullCommand(subCommand)

  return program
}

export default createStoreCommand
