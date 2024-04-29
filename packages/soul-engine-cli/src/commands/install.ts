import { Command } from 'commander'
import fsExtra from 'fs-extra/esm'
import { CommunityInstaller } from '../communityInstaller.js'

const createInstall = (program: Command) => {
  program
    .command('install')
    .argument('<packagePath...>', 'The full path of the library package (eg cognitiveStep/externalDialog). You can specify multiple library packages.')
    .option('-b,--branch <branch>', 'The branch to install from', "main")
    .description('install a community package from the OPEN SOULS community library found here https://github.com/opensouls/community/tree/main/library')
    .action(async (packagePaths: string[], { branch }: { branch: string }) => {
      for (let packagePath of packagePaths) {
        if (!(await fsExtra.pathExists("soul"))) {
          console.error("You must be in the root of a soul project to install a community package.")
          return
        }

        const installer = new CommunityInstaller(packagePath, branch)
        await installer.install()
      }
    })
}

export default createInstall
