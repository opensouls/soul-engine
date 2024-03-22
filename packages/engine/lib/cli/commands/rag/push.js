import { getConfig } from '../../config.js';
import { handleLogin } from '../../login.js';
import { RagPoster } from '../../rag/rag-file-poster.js';
const createRagPushCommand = (program) => {
    program
        .command('push <path>')
        .description('Push your RAG files to your SOUL ENGINE bucket.')
        .option('-l, --local', 'use the local config file', false)
        .action(async (ragPath, options) => {
        const { local } = options;
        await handleLogin(local);
        const globalConfig = await getConfig(local);
        const organization = globalConfig.get("organization");
        if (!organization) {
            throw new Error("missing organization, even after login");
        }
        const defaultRagDir = ragPath.join(".", "rag");
        const ragDir = ragPath || defaultRagDir;
        const poster = RagPoster.createWithDefaultConfig({
            path: ragDir,
            organization,
            local: local,
            apiKey: globalConfig.get("apiKey"),
        });
        try {
            await poster.push();
        }
        catch (error) {
            console.error("there was an error posting your RAG files:", error);
            throw error;
        }
    });
};
export default createRagPushCommand;
