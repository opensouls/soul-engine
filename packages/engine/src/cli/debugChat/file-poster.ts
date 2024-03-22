import { HocuspocusProvider, HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import { getYjsDoc, syncedStore } from "@syncedstore/core";
import { EventEmitter } from "eventemitter3";

import { CodeFile, FileWatcher } from "../fileSystem/file-watcher.js";
import { getConnectedWebsocket } from "../sockets/soul-engine-socket.js";

interface FilePosterOpts {
  apiKey: string
  paths: string[]

  organizationSlug: string
  blueprint: string

  local?: boolean

  root: string
}

const docShape = {
  files: {} as Record<string,string> // relativePath, conent
}

const syncedFilesDoc = () => syncedStore(docShape)

interface FilePosterEvents {
  fileUpdate: (files: CodeFile[]) => void
  stateless: () => void
}

// eslint-disable-next-line unicorn/prefer-event-target
export class FilePoster extends EventEmitter<FilePosterEvents> {
  private _connection?: { doc: ReturnType<typeof syncedFilesDoc>, provider: HocuspocusProvider, socket: HocuspocusProviderWebsocket }
  private apiKey: string
  private connectionOpts

  private firstSync = true

  private watcher: FileWatcher

  constructor({ apiKey, paths, root, organizationSlug, blueprint, local }: FilePosterOpts) {
    super()
    this.watcher = new FileWatcher({ paths, root })
    this.watcher.onFileUpdate = (files) => {
      this.onFileUpdate(files)
    }

    this.connectionOpts = {
      organizationSlug,
      blueprint,
      local,
    }
    this.apiKey = apiKey
  }

  async start() {
    await this.setupProvider()
    return this.watcher.start()
  }

  stop() {
    if (!this._connection) {
      return
    }

    this._connection.provider.destroy()
    this._connection.socket.destroy()
  }

  private async onFileUpdate(files: CodeFile[]) {
    console.log("updating:", files.map((f) => f.relativePath))
    if (!this._connection) {
      throw new Error("missing connection")
    }

    const { doc, provider } = this._connection

    getYjsDoc(doc).transact(() => {
      // delete everything in the doc keys
      // notice we're in a transaction so that won't really sync
      // only the changes after we're done modifying
      if (this.firstSync) {
        for (const key of Object.keys(doc.files)) {
          delete doc.files[key]
        }
      }

      this.firstSync = false

      for (const file of files) {
        if (file.removed) {
          delete doc.files[file.relativePath]
          continue
        }

        doc.files[file.relativePath] = file.content
      }
    })

    provider.sendStateless(JSON.stringify({
      event: "codeSync",
      data: "",
    }))
    this.emit("fileUpdate", files)
  }

  private async setupProvider() {
    const { default: ws } = await import("ws");

    const { organizationSlug, blueprint, local } = this.connectionOpts
    const docName = `soul-source-doc.${organizationSlug}.${blueprint}`

    const doc = syncedFilesDoc()
    
    const socket = getConnectedWebsocket(organizationSlug, Boolean(local), false, { WebSocketPolyfill: ws })

    // only return the connection after the initial sync with the server.
    return new Promise((resolve, reject) => {
      const provider = new HocuspocusProvider({
        document: getYjsDoc(doc),
        name: docName,
        async onAuthenticationFailed({ reason }) {
          console.error("authentication failed", reason)
          reject(reason)
        },
        onStateless: async ({ payload }) => {
          this.emit("stateless")
          console.log(new Date(), payload)
        },
        onSynced: async () => {
          this._connection = {
            doc,
            provider,
            socket,
          }
          resolve(this._connection)
        },
        token: this.apiKey,
        websocketProvider: socket,
      });
    })
  }
}
