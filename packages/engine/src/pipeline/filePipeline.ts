import { glob } from "glob"
import { join, relative } from "node:path"

export interface CallbackParams {
  
  /**
   * A function that returns a promise resolving to the string contents of the file.
   */
  content: () => Promise<string>
  /**
   * A function that returns a promise resolving to the byte contents of the file.
   */
  contentBytes: () => Promise<Buffer>
  
  /**
   * The relative path of the file from the source directory.
   */
  path: string
}

export type ProcessCallbackReturn = { content: string, key?: string }[] | string[] | string

/**
 * Transforms a given file path into a flat filename representation.
 * This function replaces path separators (both forward slash `/` and backslash `\`)
 * with double underscores `__` and then replaces any characters that are not
 * alphanumeric, underscores, or periods with a dash `-`.
 * 
 * @param {string} path - The original file path to transform.
 * @return {string} The transformed flat filename.
 */

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

export interface FilePipelineOpts {
  /**
   * `replace`: Removes all files in the destination directory before running the pipeline.
   * This action ensures the destination directory only contains the output from the current pipeline execution.
   */
  replace?: boolean
}

export class FilePipeline {

  constructor(public src: string, public dest: string, public opts: FilePipelineOpts = {}) {}

  /**
   * Processes each file in the source directory, applying a provided callback function to transform the file content.
   * Each file is read and provided to the callback in two forms: as a UTF-8 string and as raw bytes.
   * The callback can return either a string, an array of strings, or an array of objects containing the content and an optional key.
   * If a key is not provided, a default key is generated based on the file's relative path and an index (if needed).
   * The transformed content is then written to the destination directory under the generated or provided key.
   * 
   * @param callback - A function that takes a `CallbackParams` object and returns a `ProcessCallbackReturn`.
   *                   This function is expected to perform the necessary transformations on the file content.
   * @returns - A promise that resolves when all files have been processed.
   */
  async process(callback: (params: CallbackParams) => Promise<ProcessCallbackReturn>) {
    const { mkdir, readFile, writeFile, stat } = await import("node:fs/promises")
    const { emptyDir } = await import("fs-extra/esm")

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
