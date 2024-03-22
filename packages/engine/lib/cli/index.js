import { Command } from "commander";
import { setupCLI } from "./commands/index.js";
export const run = () => {
    const program = new Command();
    setupCLI(program);
    return program.parse();
};
