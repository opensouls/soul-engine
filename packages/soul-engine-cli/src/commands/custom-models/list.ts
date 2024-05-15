import { Command } from "commander";
import { handleLogin } from "../../login.js";
import { getConfig } from "../../config.js";
import CustomModelManager from "../../customModels/customModel.js";
import Table from 'cli-table3'

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

      const customModelManager = new CustomModelManager(local, organizationSlug, globalConfig.get("apiKey"));
      const models = await customModelManager.listModels();

      const table = new Table({
        head: ["Name", "API Endpoint", "Model Name"]
      })
      table.push(...models.map((model: any) => [model.name, model.api_endpoint, model.model_name]))

      console.log(table.toString())
    });

  return program;
}

export default createListModelsCommand;
