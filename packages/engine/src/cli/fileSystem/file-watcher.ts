import { watch } from "chokidar"
import fs, { readdirSync } from "node:fs"
import path, { basename, dirname, join } from "node:path"
import process from "node:process"

export interface CodeFile {
  content: string
  relativePath: string
  removed: boolean
}

export interface FileWatcherOpts {
  paths: string[]
  root: string
  allowedExtensions?: string[]
}
const caseSensitiveExistsSync = (path: string) => readdirSync(dirname(path)).includes(basename(path))

export class FileWatcher {
  onFileUpdate?: (files: CodeFile[]) => void

  private paths: string[]
  private root: string

  constructor(private options: FileWatcherOpts) {
    this.paths = options.paths
    this.root = options.root
    console.log("paths:", this.paths, "cwd", this.root)
    console.log('Watcher constructor');
  }

  async start() {
    return this.watch()
  }

  private async callOnUpdate(files: string[]) {
    if (!this.onFileUpdate) {
      return
    }

    this.onFileUpdate(files.map((filePath) => {
      try {
        console.log("file update:", filePath)

        if (filePath === "") {
          return null
        }

        const fullPath = join(this.root, filePath)
        const remotePath = filePath.split(path.sep).join("/")

        const exists = caseSensitiveExistsSync(fullPath)

        if (!exists) {
          return {
            content: "",
            relativePath: remotePath,
            removed: true,
          }
        }

        const stat = fs.statSync(fullPath)
        if (!stat.isFile()) {
          return null
        }

        return {
          content: fs.readFileSync(fullPath, { encoding: "utf8" }),
          relativePath: remotePath,
        }
      } catch (error) {
        console.error("error reading file:", filePath, error)
        throw error
      }

    }).filter(Boolean) as CodeFile[])
  }

  private watch() {
    let timeoutId: NodeJS.Timeout | null = null;
    const changedFiles: Set<string> = new Set();

    const scheduleUpdate = (filepath: string) => {
      if (this.options.allowedExtensions && !this.options.allowedExtensions.includes(path.extname(filepath))) {
        console.warn("Ignoring file", filepath);
        return;
      }

      changedFiles.add(filepath);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        timeoutId = null;
        this.callOnUpdate([...changedFiles]);
        changedFiles.clear();
      }, 300);
    };

    const watcher = watch(this.paths, {
      ignored: [
        /(^|[/\\])\../, // ignore dotfiles
        /node_modules/, // ignore node_modules
        /tsconfig\.json/, // ignore tsconfig.json
      ],
      persistent: true,
      cwd: this.root,
    });

    watcher
      .on('add', path => console.log(`File ${path} has been added`))
      .on('change', path => console.log(`File ${path} has been changed`))
      .on('unlink', path => console.log(`File ${path} has been removed`))
      .on('addDir', path => console.log(`Directory ${path} has been added`))
      .on('unlinkDir', path => console.log(`Directory ${path} has been removed`))
      .on('error', error => console.error(`Watcher error: ${error}`))
      .on('ready', () => console.log('Initial scan complete. Ready for changes'))
      .on('all', (event, path) => {
        scheduleUpdate(path);
      });

    process.once('SIGINT', () => {
      watcher.close();
    })

    return watcher;
  }
}
