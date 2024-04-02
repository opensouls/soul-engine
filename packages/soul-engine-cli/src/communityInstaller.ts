import fsExtra from 'fs-extra/esm'
import { writeFile } from "node:fs/promises"
import { basename, join } from "node:path"

const getCommunityRoot = (branch: string) => {
  return `https://raw.githubusercontent.com/opensouls/community/${branch}/library/`
}

const communityTypeFromPath = (path: string) => {
  if (path.startsWith("cognitiveStep")) {
    return "cognitiveStep"
  }
  if (path.startsWith("subprocess")) {
    return "subprocess"
  }
}

export class CommunityInstaller {
  constructor(public userPath: string, public branch: string) { }

  async install() {
    const type = communityTypeFromPath(this.userPath)
    switch (type) {
      case "subprocess":
        return await this.installSubProcess()
      default:
        await this.installLibOnly()
    }
  }

  // TODO: allow for the installation of dependencies
  private async installSubProcess() {
    const url = getCommunityRoot(this.branch) + this.userPath
    const resp = await fetch(url)
    if (!resp.ok) {
      console.error("Failed to fetch package", this.userPath)
      throw new Error("Failed to fetch package: " + this.userPath)
    }
    await fsExtra.mkdirp(join("soul", "subprocesses"))
    const filename = basename(this.userPath)
    const data = await resp.text();
    const destinationPath = join("soul", "subprocesses", filename)
    await writeFile(destinationPath, data);
    console.log(`${this.userPath} has been installed successfully to ${destinationPath}`);
  }

  private async installLibOnly() {
    const url = getCommunityRoot(this.branch) + this.userPath
    const resp = await fetch(url)
    if (!resp.ok) {
      console.error("Failed to fetch package", this.userPath)
      throw new Error("Failed to fetch package: " + this.userPath)
    }
    await fsExtra.mkdirp(join("soul", "lib"))

    const filename = basename(this.userPath)
    const data = await resp.text();
    const destinationPath = join("soul", "lib", filename)
    await writeFile(destinationPath, data);
    console.log(`${this.userPath} has been installed successfully to ${destinationPath}`);
  }

}