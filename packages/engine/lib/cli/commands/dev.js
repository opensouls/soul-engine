import { existsSync, readFileSync } from 'node:fs';
import path from "node:path";
import { v4 as uuidv4 } from 'uuid';
import { getConfig } from '../config.js';
import { FilePoster } from '../debugChat/file-poster.js';
import { handleLogin } from '../login.js';
import { RagPoster } from '../rag/rag-file-poster.js';
const createDev = (program) => {
    program
        .command('dev')
        .description('Hot reload your code for remote chat debug')
        .option('-l, --local', 'use the local config file', false)
        .option('--once', 'only post the code once, do not watch for changes', false)
        .action(async ({ local, once }) => {
        await handleLogin(local);
        const globalConfig = await getConfig(local);
        const organization = globalConfig.get("organization");
        if (!organization) {
            throw new Error("missing organization, even after login");
        }
        const { default: open } = await import('open');
        let soulConfig;
        const optionalConfigPath = path.join(process.cwd(), "soul-engine.json");
        if (existsSync(optionalConfigPath)) {
            soulConfig = JSON.parse(readFileSync(optionalConfigPath, { encoding: "utf8" }));
        }
        else {
            // parse the package.json and extract the name
            const packageJsonPath = path.join(process.cwd(), "package.json");
            const packageJson = JSON.parse(readFileSync(packageJsonPath, { encoding: "utf8" }));
            soulConfig = {
                soul: packageJson.name,
                paths: [
                    "package.json",
                    "soul",
                ],
            };
        }
        const apiKey = globalConfig.get("apiKey") || "TOOD: fix me";
        const watcher = new FilePoster({
            apiKey,
            paths: soulConfig.paths ?? ["."],
            root: soulConfig.path ?? ".",
            organizationSlug: organization,
            blueprint: soulConfig.soul,
            local,
        });
        // eslint-disable-next-line no-warning-comments
        // TODO: this is a dumb quick fix to make sure we see bad things happening. "stateless" is a poor name for this event.
        watcher.once("stateless", () => {
            if (once) {
                console.log("posted");
                return;
            }
            const url = local ? `http://localhost:3000/chats/${organization}/${soulConfig.soul}/${uuidv4()}` : `https://souls.chat/chats/${organization}/${soulConfig.soul}/${uuidv4()}`;
            console.log("opening", url);
            open(url);
        });
        await watcher.start();
        if (once) {
            return;
        }
        const keepAliveInterval = setInterval(() => {
            // do nothing
        }, 60 * 1000); // keep process alive
        const ragDirPath = path.join(process.cwd(), "rag");
        if (existsSync(ragDirPath)) {
            const ragFilePoster = RagPoster.createWithDefaultConfig({
                path: ragDirPath,
                organization,
                local: local,
                apiKey,
            });
            ragFilePoster.watch();
        }
        return new Promise((resolve) => {
            console.log("watching your files...");
            process.on('SIGINT', () => {
                console.log('Received SIGINT. Exiting.');
                clearInterval(keepAliveInterval);
                watcher.stop();
                resolve();
            });
        });
    });
};
export default createDev;
