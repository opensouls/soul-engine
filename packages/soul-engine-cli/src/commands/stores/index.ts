import { Command } from "commander";
import createStoresPullCommand from "./pull.js";
import createStoresPushCommand from "./push.js";


const createStoreCommand = (program: Command) => {
  const subCommand = program.command('stores')
  createStoresPullCommand(subCommand)
  createStoresPushCommand(subCommand)
  
  return program
}

export default createStoreCommand
