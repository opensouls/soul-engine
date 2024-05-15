import { Command } from "commander";
import inquirer from "inquirer";
import { handleLogin } from "../../login.js";
import { getConfig } from "../../config.js";
import CustomModelManager from "../../customModels/customModel.js";

const createCreateModelCommand = (program: Command) => {
  program
    .command('create')
    .description('Create a custom model for the organization')
    .option('-l, --local', '(Soul Engine dev only) use a local soul engine server', false)
    .action(async ({ local }) => {
      console.log(`Creating a custom model for the organization.`);

      await handleLogin(local);
      const globalConfig = await getConfig(local);

      const organizationSlug = globalConfig.get("organization");
      if (!organizationSlug) {
        throw new Error("missing organization, even after login");
      }

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: "The name of your custom model. This is the name you'll use to access the model.",
        },
        {
          type: 'input',
          name: 'apiEndpoint',
          message: 'The baseUrl for the model (eg https://api.fireworks.ai/inference/v1 )',
        },
        {
          type: 'password',
          name: 'apiKey',
          message: 'The API key for the model',
        },
        {
          type: 'input',
          name: 'modelName',
          message: "What is the provider's model name? (eg. 'gpt-4o')",
        },

        {
          type: 'confirm',
          name: 'confirmCreation',
          message: 'Do you want to create this model?',
          default: false,
        },
      ]);

      const customModelManager = new CustomModelManager(local, organizationSlug, globalConfig.get("apiKey"));
      const newModel = await customModelManager.createModel(answers);
      console.log('New model created:', newModel);
    });

  return program;
}

export default createCreateModelCommand;
