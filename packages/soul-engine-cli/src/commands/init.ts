import { Command } from "commander"
import { globSync } from "glob"
import Handlebars from "handlebars"
import { readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url';
import fsExtra from "fs-extra"

import { getConfig } from '../config.js'
import { handleLogin } from '../login.js'


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const templatePath = join(__dirname, '..', '..', 'template');

const createInit = (program: Command) => {
  program
    .command('init <projectName>')
    .description('Create a new soul for the OPEN SOULS soul engine.')
    .option('-l, --local', 'Use the local template', false)
    .action(async (projectName: string, options: { local: boolean }) => {
      await handleLogin(options.local)

      const config = await getConfig()

      if (!projectName) {
        console.log("missing project name")
        return
      }

      const safeProjectName = projectName.replaceAll(/\s/g, "-").toLowerCase()
      const lowerCaseEntityName = safeProjectName.split("-")[0]
      const entityName = lowerCaseEntityName.charAt(0).toUpperCase() + lowerCaseEntityName.slice(1)

      const { $ } = await import('execa');
      console.log("cloning template...")

      await fsExtra.copy(templatePath, safeProjectName)

      console.log("Template copied successfully.");

      process.chdir(join('.', safeProjectName))

      await $`git init`
      // glob files need to use the "/" even on windows machines, so cannot use path.join here.
      const files = globSync(`${process.cwd()}/**/*`, { dot: false, ignore: "node_modules/**/*" })
      const organization = config.get("organization") || "public"
      console.log("using soul-engine organization:", organization)
      const data = {
        name: projectName,
        slug: safeProjectName,
        entityName,
      }
      console.log("processing files...")
      for (const file of files) {
        try {
          if (file.includes("node_modules")) continue;
          if (file.includes("/.git/")) continue;
          const stat = statSync(file)
          if (stat.isDirectory()) continue;

          const rawFile = readFileSync(file, { encoding: "utf8" })
          const template = Handlebars.compile(rawFile)
          writeFileSync(file, template(data))

          if (file.includes("{{")) {
            // then it's a file where the name is templated,
            // we move it into place.
            const templateFileName = Handlebars.compile(file.replace("\\", "\\\\"));
            const newFileName = templateFileName(data);
            renameSync(file, newFileName);
          }
        } catch (error: unknown) {
          console.error("skipping...", file, error)
          // throw error
        }
      }

      console.log("npm install...")
      await $`npm install`
      console.log("success.")
      return
    })
}

export default createInit
