import { Command } from 'commander'
import fsExtra from 'fs-extra/esm'
import { writeFile } from "node:fs/promises"
import { basename } from "node:path"

const COMMUNITY_ROOT = "https://raw.githubusercontent.com/opensouls/souls/feature/community/library/"

const createInstall = (program: Command) => {
  program
    .command('install <packagePath>')
    .argument('<packagePath>', 'The full path of the library package (eg cognitiveSteps/externalDialog)')
    .description('install a community package from the Open Souls community library')
    .action(async ({ packagePath }: { packagePath: string }) => {
      if (!packagePath.endsWith(".ts")) {
        packagePath = packagePath + ".ts"
      }
      const url = COMMUNITY_ROOT + packagePath
      const resp = await fetch(url)
      if (!resp.ok) {
        console.error("Failed to fetch package", packagePath)
        throw new Error("Failed to fetch package: " + packagePath)
      }
      await fsExtra.mkdirp("soul/lib")

      const filename = basename(packagePath)
      const data = await resp.text();
      const destinationPath = `soul/lib/${filename}`
      await writeFile(destinationPath, data);
      console.log(`${packagePath} has been installed successfully to ${destinationPath}`);
    })
}

export default createInstall