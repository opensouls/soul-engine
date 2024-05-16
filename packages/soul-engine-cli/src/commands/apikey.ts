import { Command } from 'commander'
import { getConfig } from '../config.js'

const createApiKeyCommand = (program: Command) => {
  program
    .command('apikey')
    .description('print your api key to the terminal. This command is useful for connecting to a debug chat.')
    .option('-l, --local', 'use the local config file', false)
    .option("--json", "output the api key and organization as json", false)
    .action(async (options: { local: boolean, json: boolean }) => {
      const globalConfig = await getConfig(options.local)
      const org = globalConfig.get("organization")
      const apiKey = globalConfig.get("apiKey")
      
      if (options.json) {
        console.log(JSON.stringify({
          apiKey: apiKey,
          organization: org
        }))
        return
      }
      console.log("API KEY:", apiKey)
      console.log("ORGANIZATION: ", org)
    })
}

export default createApiKeyCommand
