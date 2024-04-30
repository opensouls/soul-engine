import { $ } from 'execa'
import fsExtra from 'fs-extra/esm'
import { writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

const getCommunityRoot = (branch: string) => {
  return `https://raw.githubusercontent.com/opensouls/community/${branch}/library/`
}

const fetchCommunityContent = async (branch: string, path: string) => {
  console.log("looking for path", path)
  const resp = await fetch(`https://api.github.com/repos/opensouls/community/contents/library/${path}?ref=${branch}`, {
    headers: {
      "Accept": "application/vnd.github.v3+json"
    }
  })
  if (!resp.ok) {
    console.error("Failed to fetch", path, resp)
    throw new Error("Failed to fetch: " + path)
  }
  return resp.json()
}

// TODO (topper):
// I think we can now generalize and just pull directory structures from the repo rather than having branching logic.

export class CommunityInstaller {
  constructor(public userPath: string, public branch: string) { }

  async install() {
   
    const directory = dirname(this.userPath)
    switch (directory) {
      case "perceptionProcessors":
        return this.preprocessorInstall()
      case "pipelines":
        return this.pipelineInstall()
      default:
        return this.defaultInstall()
    }
  }

  async defaultInstall() {
    if (!this.userPath.endsWith(".ts")) {
      this.userPath = this.userPath + ".ts"
    }
    const data = await this.fetchFile(this.userPath)
    const directory = dirname(this.userPath)

    await fsExtra.mkdirp(join("soul", directory))

    const destinationPath = join("soul", this.userPath)
    await writeFile(destinationPath, data);
    console.log(`${this.userPath} has been installed successfully to ${destinationPath}`);
  }

  async preprocessorInstall() {
    if (!this.userPath.endsWith(".ts")) {
      this.userPath = this.userPath + ".ts"
    }
    const data = await this.fetchFile(this.userPath)
    const destinationPath = join("soul", "perceptionProcessor.ts")
    await writeFile(destinationPath, data);
    console.log(`${this.userPath} has been installed successfully to ${destinationPath}`);
  }

  async pipelineInstall() {
    await $`npm install @opensouls/pipeline`
    const directoryContents = await fetchCommunityContent(this.branch, this.userPath)
    console.log(directoryContents)
    await this.processPipelineDirectory(directoryContents, ".")
  }

  async processPipelineDirectory(contents: any[], basePath: string) {
    for (const item of contents) {
      if (item.path === `library/${this.userPath}/README.md`) {
        continue;
      }
      const localPath = join(basePath, item.path.replace(new RegExp(`^library/${this.userPath}`, "i"), ''));
      if (item.type === 'file') {
        const fileData = await fetch(item.download_url);
        if (!fileData.ok) {
          console.error("Failed to download file", item.path);
          continue;
        }
        const fileContent = await fileData.text();
        await fsExtra.mkdirp(dirname(localPath));
        await writeFile(localPath, fileContent);
        console.log(`Remote ${item.path} written to ${localPath}`);
      } else if (item.type === 'dir') {
        const resp = await fetch(item.url, {
          headers: {
            "Accept": "application/vnd.github.v3+json"
          }
        })
        if (!resp.ok) {
          console.error("Failed to fetch directory", item.path, resp.status, resp.statusText)
          throw new Error("Failed to fetch directory: " + item.path);
        }
        await this.processPipelineDirectory(await resp.json(), basePath);
      }
    }
  }

  private async fetchFile(path:string) {
    const url = getCommunityRoot(this.branch) + path
    const resp = await fetch(url)
    if (!resp.ok) {
      console.error("Failed to fetch package", path)
      throw new Error("Failed to fetch package: " + path)
    }

    return resp.text()
  }
}