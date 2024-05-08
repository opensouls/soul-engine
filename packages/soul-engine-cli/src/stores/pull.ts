import fsExtra from 'fs-extra/esm';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { Manifest } from './types.js';
import { hashContent } from './hash.js';

export interface StorePullerOpts {
  organizationSlug: string
  local: boolean
  apiKey: string
  bucketName: string

  blueprint?: string
}

export class StorePuller {
  constructor(public opts: StorePullerOpts) {}

  async pull() {
    const manifest = await this.fetchManifest()
    const files = manifest.entries

    await fsExtra.mkdirp(this.fileSystemPath())

    for (const file of Object.values(files)) {
      const filePath = path.join(this.fileSystemPath(), file.key)
      if (fsExtra.pathExistsSync(filePath)) {
        const fileContent = readFileSync(filePath, 'utf8')
        // hash the file contents
        const localHash = hashContent(fileContent)
        if (localHash === file.contentHash) {
          console.log(`File ${file.key} is up to date`)
          continue
        }
      }
      console.log(`fetching ${file.key}`)
      // if the file is not up to date, then fetch the file from the server and update it locally
      const resp = await this.fetchFile(file.key)
      const data = await resp.text()
      writeFileSync(filePath, data)
    }
    // next get the contents of the directory and delete anything not in the manifest
    const localFiles = readdirSync(this.fileSystemPath())
    for (const localFile of localFiles) {
      if (!files[localFile]) {
        console.log(`deleting ${localFile} -- ${path.join(this.fileSystemPath(), localFile)}`)
        // fsExtra.removeSync(path.join(this.fileSystemPath(), localFile))
      }
    }

    console.log("your store is up to date from the server")
  }

  async fetchManifest() {
    const { apiKey } = this.opts

    const url = this.url()
    const resp = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
    })
    if (!resp.ok) {
      console.error("Failed to fetch manifest", this.opts.bucketName, { url: this.url(), response: resp.status, statusText: resp.statusText })
      throw new Error("Failed to fetch manifest: " + this.opts.bucketName)
    }

    return resp.json() as Promise<Manifest>
  }

  fetchFile(key: string) {
    const { apiKey } = this.opts

    const url = this.url() + "/" + key
    return fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    })
  }

  private fileSystemPath() {
    if (this.opts.blueprint) {
      return path.join('.', 'stores', this.opts.bucketName);
    }
    return path.join('.', 'stores', 'organization', this.opts.bucketName);
  }

  private url() {
    const { organizationSlug, local } = this.opts

    const rootUrl = local ? "http://localhost:4000/api" : "https://servers.souls.chat/api"

    if (this.opts.blueprint) {
      return `${rootUrl}/${organizationSlug}/stores/${this.opts.blueprint}/${this.opts.bucketName}`
    }

    return `${rootUrl}/${organizationSlug}/stores/${this.opts.bucketName}`
  }


}