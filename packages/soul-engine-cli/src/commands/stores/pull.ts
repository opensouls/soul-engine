import { Command } from "commander";
import { handleLogin } from "../../login.js";
import { getConfig } from "../../config.js";
import { StorePuller } from "../../stores/pull.js";
import { parsedPackageJson } from "../../packageParser.js";

const createStoresPullCommand = (program: Command) => {
  program
    .command('pull <bucketName>')
    .description('Pull a specific bucket from the store. This can be in the format `:bucketName` for organization stores or `blueprintName/:bucketName` for blueprint stores.')
    .option('-l, --local', 'Use the local configuration', false)
    .action(async (bucketName, options: { local: boolean }) => {
      const { local } = options;
      console.log(`Pulling blueprint store '${bucketName}' from the store.`);

      await handleLogin(local)
      const globalConfig = await getConfig(local)

      const organizationSlug = globalConfig.get("organization")
      if (!organizationSlug) {
        throw new Error("missing organization, even after login")
      }

      if (bucketName.startsWith("organization/")) {
        const puller = new StorePuller(
          {
            organizationSlug,
            apiKey: globalConfig.get("apiKey"),
            local,
            bucketName: bucketName.split("/")[1],
          },
        )

        return await puller.pull()
      }

      const blueprint = parsedPackageJson().name

      const puller = new StorePuller(
        {
          organizationSlug,
          apiKey: globalConfig.get("apiKey"),
          local,
          blueprint,
          bucketName,
        },
      )

      await puller.pull()
    });
}

export default createStoresPullCommand;

