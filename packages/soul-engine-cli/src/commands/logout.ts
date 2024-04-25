import { Command } from 'commander'
import { getConfig } from '../config.js'

const createLogout = (program: Command) => {
  program
    .command('logout')
    .description('Logout of the Soul Engine to remove your api key and organization.')
    .option('-l, --local', 'use the local config file', false)
    .action(async ({ local }) => {
      const globalConfig = await getConfig(local)
      globalConfig.set("apiKey", "")
      globalConfig.set("organization", "")
    })

}

export default createLogout