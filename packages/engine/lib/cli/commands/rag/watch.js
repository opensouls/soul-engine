import path from "node:path";
import { getConfig } from '../../config.js';
import { handleLogin } from '../../login.js';
import { RagPoster } from '../../rag/rag-file-poster.js';
const createRagWatch = (program) => {
    program
        .command('watch <path>')
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
        const defaultRagDir = path.join(".", "rag");
        const ragDir = ragPath || defaultRagDir;
        const poster = RagPoster.createWithDefaultConfig({
            path: ragDir,
            organization,
            local: local,
            apiKey: globalConfig.get("apiKey"),
            // root: ragDir
        });
        const keepAliveInterval = setInterval(() => {
            // do nothing
        }, 60 * 1000); // keep process alive
        try {
            poster.watch();
            return new Promise((resolve) => {
                console.log("watching your rag files...");
                process.on('SIGINT', () => {
                    console.log('Received SIGINT. Exiting.');
                    clearInterval(keepAliveInterval);
                    resolve();
                });
            });
        }
        catch (error) {
            console.error("there was an error posting your RAG files:", error);
            throw error;
        }
    });
};
export default createRagWatch;
