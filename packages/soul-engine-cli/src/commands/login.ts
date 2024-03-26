import { Command } from 'commander'
import { handleLogin } from '../login.js'

const createLogin = (program: Command) => {
  program
    .command('login')
    .description('Login to the Soul Engine to provide this CLI with an api key and organization.')
    .option('-l, --local', 'Use the local config file', false)
    .action(async (options: { local: boolean }) => {
      await handleLogin(options.local, true)
    })
}

export default createLogin
