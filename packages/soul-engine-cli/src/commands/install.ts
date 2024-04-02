import { Command } from 'commander'
import fsExtra from 'fs-extra/esm'
import { CommunityInstaller } from '../communityInstaller.js'

const createInstall = (program: Command) => {
  program
    .command('install')
    .argument('<packagePath>', 'The full path of the library package (eg cognitiveStep/externalDialog)')
    .option('-b,--branch <branch>', 'The branch to install from', "main")
    .description('install a community package from the Open Souls community library')
    .action(async (packagePath: string, { branch }: { branch: string }) => {
      if (!packagePath.endsWith(".ts")) {
        packagePath = packagePath + ".ts"
      }

      if (! (await fsExtra.pathExists("soul"))) {
        console.error("You must be in the root of a soul project to install a community file.")
        return
      }
      
      const installer = new CommunityInstaller(packagePath, branch)
      await installer.install()
    })
}

export default createInstall
