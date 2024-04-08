import { join } from "node:path"
import { readFileSync } from "node:fs"

export interface PackageJsonWithName {
  name: string
}

export const parsedPackageJson = (): PackageJsonWithName => {
  const packageJsonPath = join(".", "package.json")
  return JSON.parse(readFileSync(packageJsonPath, { encoding: "utf8" })) as PackageJsonWithName
}
