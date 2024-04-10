import { emptyDir } from "fs-extra/esm"
import { glob } from "glob"
import { mkdir, readFile, writeFile, stat } from "node:fs/promises"
import { join, relative } from "node:path"

interface CallbackParams {
  content: () => Promise<string>
  contentBytes: () => Promise<Buffer>
  
  path: string
}

type ProcessCallbackReturn = { content: string, key?: string }[] | string[] | string

export const filePathToKey = (path: string) => {
  return path.replace(/[\\\/]/g, "__").replace(/[^\w\d_\.]/g, "-")
}

const normalizeProcessCallbackReturn = (relativePath: string, result: ProcessCallbackReturn): { content: string, key: string }[] => {
  if (typeof result === "string") {
    return [{ content: result, key: filePathToKey(relativePath) }]
  }

  return result.map((item, index) => {
    if (typeof item === "string") {
      return { content: item, key: filePathToKey(relativePath) + "_" + index }
    }
    return { content: item.content, key: item.key ?? filePathToKey(relativePath) + "_" + index }
  })
}

export interface FilePiplineOpts {
  /**
   * `replace`: Removes all files in the destination directory before running the pipeline.
   * This action ensures the destination directory only contains the output from the current pipeline execution.
   */
  replace?: boolean
}

export class FilePipeline {

  constructor(public src: string, public dest: string, public opts: FilePiplineOpts = {}) {}

  async process(callback: (params: CallbackParams) => Promise<ProcessCallbackReturn>) {
    let globSrc = join(this.src, "**/*")

    if (this.opts.replace) {
      await emptyDir(this.dest) // emptyDir also creates the dir
    } else {
      await mkdir(this.dest, { recursive: true })
    }

    const files = await glob(globSrc, { absolute: true })

    for (const filePath of files) {
      if ((await stat(filePath)).isDirectory()) {
        continue
      }
      const relativeToSrc = relative(this.src, filePath)
      console.log(`processing ${relativeToSrc}`)
      const content = () => {
        return readFile(filePath, "utf8")
      }

      const contentBytes = () => {
        return readFile(filePath)
      }

      const result = await callback({
        content,
        contentBytes,
        path: relativeToSrc
      })

      const normalizedResult = normalizeProcessCallbackReturn(relativeToSrc, result)

      for (const { content, key } of normalizedResult) {
        const destPath = join(this.dest, key)
        console.log(`writing ${destPath}`)
        // write
        await writeFile(destPath, content)
      }

    }
  }

}
