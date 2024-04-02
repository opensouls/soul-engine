import fsExtra from 'fs-extra/esm'
import { writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

const getCommunityRoot = (branch: string) => {
  return `https://raw.githubusercontent.com/opensouls/community/${branch}/library/`
}

export class CommunityInstaller {
  constructor(public userPath: string, public branch: string) { }

  async install() {
    const url = getCommunityRoot(this.branch) + this.userPath
    const resp = await fetch(url)
    if (!resp.ok) {
      console.error("Failed to fetch package", this.userPath)
      throw new Error("Failed to fetch package: " + this.userPath)
    }

    const directory = dirname(this.userPath)

    await fsExtra.mkdirp(join("soul", directory))

    const data = await resp.text();
    const destinationPath = join("soul", this.userPath)
    await writeFile(destinationPath, data);
    console.log(`${this.userPath} has been installed successfully to ${destinationPath}`);
  }
}