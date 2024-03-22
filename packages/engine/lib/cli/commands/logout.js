import { getConfig } from '../config.js';
const createLogout = (program) => {
    program
        .command('logout')
        .description('Logout of the Soul Engine to remove your api key and organization.')
        .option('-l, --local', 'use the local config file', false)
        .action(async ({ local }) => {
        const globalConfig = await getConfig(local);
        globalConfig.set("apiKey", "");
        globalConfig.set("organization", "");
        globalConfig.set("organization_id", "");
    });
};
export default createLogout;
