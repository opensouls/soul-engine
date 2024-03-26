import { Command } from 'commander'
import { getConfig } from '../config.js'

const createApiKeyCommand = (program: Command) => {
  program
    .command('apikey')
    .description('print your api key to the terminal. This command is useful for connecting to a debug chat.')
    .option('-l, --local', 'use the local config file', false)
    .action(async (options: { local: boolean }) => {
      const globalConfig = await getConfig(options.local)
      console.log("API KEY:", globalConfig.get("apiKey"))
    })
}

export default createApiKeyCommand
