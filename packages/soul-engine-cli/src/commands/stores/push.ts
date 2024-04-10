import { Command } from "commander";
import { handleLogin } from "../../login.js";
import { getConfig } from "../../config.js";
import { StorePusher } from "../../stores/push.js";
import { parsedPackageJson } from "../../packageParser.js";

const createStoresPushCommand = (program: Command) => {
  program
    .command('push <bucketName>')
    .description('Push a specific bucket to the store. This can be in the format `:bucketName` for blueprint stores or `organization/:bucketName` for organization stores.')
    .option('-l, --local', 'Use the local configuration', false)
    .action(async (bucketName, options: { local: boolean }) => {
      const { local } = options;
      console.log(`Pushing blueprint store '${bucketName}' to the store.`);

      await handleLogin(local)
      const globalConfig = await getConfig(local)

      const organizationSlug = globalConfig.get("organization")
      if (!organizationSlug) {
        throw new Error("missing organization, even after login")
      }

      if (bucketName.startsWith("organization/")) {
        const pusher = new StorePusher(
          {
            organizationSlug,
            apiKey: globalConfig.get("apiKey"),
            local,
            bucketName: bucketName.split("/")[1],
          },
        )

        return await pusher.push()
      }

      const blueprint = parsedPackageJson().name

      const pusher = new StorePusher(
        {
          organizationSlug,
          apiKey: globalConfig.get("apiKey"),
          local,
          blueprint,
          bucketName,
        },
      )

      await pusher.push()
    });
}

export default createStoresPushCommand;
