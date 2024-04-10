import { glob } from "glob"
import path from "node:path"
import fs from "node:fs/promises"
import { expect } from "chai"
import { FilePipeline, filePathToKey } from "../src/pipeline/filepipeline.js"

describe("Pipeline", () => {
  const src = "tests/shared/pipeline/src"
  const dest = "tests/shared/pipeline/dest"

  it("executes a standard pipeline", async () => {
    const pipeline = new FilePipeline(src, dest, { replace: true })

    await pipeline.process(async ({ content }) => {
      return content()
    })

    const srcFiles = await glob(path.join(src, "**/*"), { absolute: true })
    for (const srcFilePath of srcFiles) {
      if ((await fs.stat(srcFilePath)).isDirectory()) {
        continue
      }
      const relativeToSrc = path.relative(src, srcFilePath)
      const srcBits = await fs.readFile(srcFilePath, "utf-8")
      const destBits = await fs.readFile(path.join(dest, filePathToKey(relativeToSrc)), "utf-8")

      expect(destBits).to.eq(srcBits)
    }
  })

  it("executes a pipeline with split files", async () => {
    const pipeline = new FilePipeline(src, dest, { replace: true })

    await pipeline.process(async ({ content, path}) => {
      const newContent = (await content()) + "__changed"
      
      return [
        {
          content: newContent,
          key: filePathToKey(path) + "0"
        },
        {
          content: newContent,
          key: filePathToKey(path) + "1"
        }
      ]
    })

    const srcFiles = await glob(path.join(src, "**/*"), { absolute: true })
    for (const srcFilePath of srcFiles) {
      if ((await fs.stat(srcFilePath)).isDirectory()) {
        continue
      }
      const relativeToSrc = path.relative(src, srcFilePath)
      const srcBits = await fs.readFile(srcFilePath, "utf-8")
      const destBits0 = await fs.readFile(path.join(dest, filePathToKey(relativeToSrc) + "0"), "utf-8")
      const destBits1 = await fs.readFile(path.join(dest, filePathToKey(relativeToSrc) + "1"), "utf-8")

      expect(destBits0).to.eq(srcBits + "__changed")
      expect(destBits1).to.eq(srcBits + "__changed")
    }
  })

  it("executes a pipeline with split files and no returned keys", async () => {
    const pipeline = new FilePipeline(src, dest, { replace: true })

    await pipeline.process(async ({ content, path}) => {
      const newContent = (await content()) + "__changed"
      
      return [
        {
          content: newContent,
        },
        {
          content: newContent,
        }
      ]
    })

    const srcFiles = await glob(path.join(src, "**/*"), { absolute: true })
    for (const srcFilePath of srcFiles) {
      if ((await fs.stat(srcFilePath)).isDirectory()) {
        continue
      }
      const relativeToSrc = path.relative(src, srcFilePath)
      const srcBits = await fs.readFile(srcFilePath, "utf-8")
      const destBits0 = await fs.readFile(path.join(dest, filePathToKey(relativeToSrc) + "_0"), "utf-8")
      const destBits1 = await fs.readFile(path.join(dest, filePathToKey(relativeToSrc) + "_1"), "utf-8")

      expect(destBits0).to.eq(srcBits + "__changed")
      expect(destBits1).to.eq(srcBits + "__changed")
    }
  })
})