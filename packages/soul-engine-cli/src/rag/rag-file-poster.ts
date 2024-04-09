import fetch from "cross-fetch"
import fs, { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { FileWatcher } from "../fileSystem/file-watcher.js";
import { readDirRecursive } from "../fileSystem/recursive-reader.js";
import { ALLOWED_RAG_FILE_EXTENSIONS, RagConfigfile, RagIngestionBody, defaultRagBucketName } from "@opensouls/engine";
import { parsedPackageJson } from "../packageParser.js";

interface RagPosterOpts {
  apiKey?: string
  path: string
  url: string
}

interface RagFile {
  content: Buffer
  relativePath: string
}

interface CreateWithDefaultConfigOpts {
  path: string
  organization: string
  local: boolean
  apiKey: string
}


export class RagPoster {
  private apiKey: string
  private path: string
  private url: string

  private watcher?: FileWatcher

  constructor({ apiKey, path, url }: RagPosterOpts) {
    this.url = url
    console.log("file poster url:", this.url)
    this.apiKey = apiKey || ""
    this.path = path
  }

  static createWithDefaultConfig({ path, organization, local, apiKey }: CreateWithDefaultConfigOpts) {

    const ragDir = path

    const pathToRagConfig = join(ragDir, "rag.json");
    const pathToPackageJson = join(".", "package.json");
    const ragConfigExists = existsSync(pathToRagConfig);
    const packageJsonExists = existsSync(pathToPackageJson);

    if (!ragConfigExists && !packageJsonExists) {
      throw new Error('Neither rag.json nor package.json exists in the specified directory.');
    }

    let bucketName;
    if (ragConfigExists) {
      const ragConfig: RagConfigfile = JSON.parse(readFileSync(pathToRagConfig, { encoding: "utf8" }));
      bucketName = ragConfig.bucket;
    } else {
      bucketName = defaultRagBucketName(parsedPackageJson().name);
    }

    console.log("RAG bucket name:", bucketName)

    const url = local ?
      `http://localhost:4000/api/${organization}/rag-ingest/${bucketName}` :
      `https://soul-engine-servers.fly.dev/api/${organization}/rag-ingest/${bucketName}`

    return new RagPoster({
      apiKey,
      path: ragDir,
      url,
    })
  }

  async push() {
    return this.pushFiles(...readDirRecursive(this.path))
  }

  async pushFiles(...paths: string[]) {
    const files: RagFile[] = paths.map((path) => {
      const relativePath = relative(this.path, path)
      return {
        content: fs.readFileSync(path),
        relativePath,
      }
    }).filter((f) => !f.relativePath.includes("rag.json"))

    const body: RagIngestionBody[] = files.map((f) => ({
      content: f.content.toString("base64"),
      rootKey: f.relativePath,
    }))
    console.log("RAG: posting", files.map((f) => f.relativePath))

    const controller = new AbortController()

    const timeout = setTimeout(() => {
      console.log("timeout")
      controller.abort()
    }, 60_000)

    const response = await fetch(this.url, {
      body: JSON.stringify(body),
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      method: "POST",
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) {
      console.error("RAG: failed to post", response.status, response.statusText)
    }

    console.log("RAG: uploaded for processing")
  }

  watch() {
    this.watcher = new FileWatcher({ paths: [join("**", "*")], root: this.path, allowedExtensions: ALLOWED_RAG_FILE_EXTENSIONS })
    this.watcher.onFileUpdate = (files) => {
      // does not currently handle removals
      const liveFiles = files.filter((f) => !f.removed).map((f) => join(this.path, f.relativePath))
      this.pushFiles(...liveFiles)
    }

    this.watcher.start()
  }
}
