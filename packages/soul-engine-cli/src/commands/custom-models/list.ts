import { Command } from "commander";
import fetch from 'node-fetch';
import { handleLogin } from "../../login.js";
import { getConfig } from "../../config.js";

const createListModelsCommand = (program: Command) => {
  program
    .command('list')
    .description('List custom models for the organization')
    .option('-l, --local', 'Use the local server', false)
    .action(async ({ local }) => {
      console.log(`Listing custom models for the organization.`);

      await handleLogin(local)
      const globalConfig = await getConfig(local)

      const organizationSlug = globalConfig.get("organization")
      if (!organizationSlug) {
        throw new Error("missing organization, even after login")
      }

      const rootUrl = local ? "http://localhost:4000/api" : "https://servers.souls.chat/api";
      const url = `${rootUrl}/${organizationSlug}/customProcessors`;

      try {
        const response = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${globalConfig.get("apiKey")}`,
            "Content-Type": "application/json"
          },
        });

        if (!response.ok) {
          console.error("Failed to fetch custom processors", { url, response: response.status, statusText: response.statusText });
          return;
        }

        const processors = await response.json();
        console.log("Custom Processors:", processors);
      } catch (error) {
        console.error("Error fetching custom processors:", error);
      }
    });

  return program;
}

export default createListModelsCommand;
