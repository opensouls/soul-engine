import { Command } from 'commander'
import fsExtra from 'fs-extra/esm'
import { writeFile } from "node:fs/promises"
import { basename, join } from "node:path"

const COMMUNITY_ROOT = "https://raw.githubusercontent.com/opensouls/souls/feature/community/library/"

const createInstall = (program: Command) => {
  program
    .command('install')
    .argument('<packagePath>', 'The full path of the library package (eg cognitiveStep/externalDialog)')
    .description('install a community package from the Open Souls community library')
    .action(async (packagePath: string) => {
      if (!packagePath.endsWith(".ts")) {
        packagePath = packagePath + ".ts"
      }

      if (! (await fsExtra.pathExists("soul"))) {
        console.error("You must be in the root of a soul project to install a community file.")
        return
      }
      
      const url = COMMUNITY_ROOT + packagePath
      const resp = await fetch(url)
      if (!resp.ok) {
        console.error("Failed to fetch package", packagePath)
        throw new Error("Failed to fetch package: " + packagePath)
      }
      await fsExtra.mkdirp(join("soul", "lib"))

      const filename = basename(packagePath)
      const data = await resp.text();
      const destinationPath = join("soul", "lib", filename)
      await writeFile(destinationPath, data);
      console.log(`${packagePath} has been installed successfully to ${destinationPath}`);
    })
}

export default createInstall