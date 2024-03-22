import createRagPushCommand from "./push.js";
import createRagWatch from "./watch.js";
const createRagCommand = (program) => {
    const subCommand = program.command('rag');
    createRagPushCommand(subCommand);
    createRagWatch(subCommand);
    return program;
};
export default createRagCommand;
