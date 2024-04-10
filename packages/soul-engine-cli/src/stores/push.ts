import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { Manifest } from './types.js';
import { hashContent } from './hash.js';

export interface StorePusherOpts {
  organizationSlug: string
  local: boolean
  apiKey: string
  bucketName: string

  blueprint?: string
}

export class StorePusher {
  constructor(public opts: StorePusherOpts) {}

  async push() {
    const manifest = await this.fetchManifest()
    const files = manifest.entries

    const localFiles = readdirSync(this.fileSystemPath())

    for (const localFile of localFiles) {
      const filePath = path.join(this.fileSystemPath(), localFile)
      const fileContent = readFileSync(filePath, 'utf-8')
      const localHash = hashContent(fileContent)

      if (!files[localFile] || files[localFile].contentHash !== localHash) {
        console.log(`pushing ${localFile}`)
        await this.pushFile(localFile, fileContent)
      }
    }

    // Delete files from the server not present locally
    for (const fileKey in files) {
      if (!localFiles.includes(fileKey)) {
        console.log(`deleting ${fileKey} from server`)
        await this.deleteFile(fileKey)
      }
    }

    console.log("your store is up to date on the server")
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

  pushFile(key: string, content: string) {
    const { apiKey } = this.opts

    const url = this.url()
    return fetch(url, {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        key,
        content,
      }),
    })
  }

  deleteFile(key: string) {
    const { apiKey } = this.opts

    const url = this.url() + "/" + key
    return fetch(url, {
      method: 'DELETE',
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

    const rootUrl = local ? "http://localhost:4000/api" : "https://soul-engine-servers.fly.dev/api"

    if (this.opts.blueprint) {
      return `${rootUrl}/${organizationSlug}/stores/${this.opts.blueprint}/${this.opts.bucketName}`
    }

    return `${rootUrl}/${organizationSlug}/stores/${this.opts.bucketName}`
  }
}
