import fs, { PathLike } from "node:fs";
import path from "node:path";

export function readDirRecursive(directory: PathLike ) {
  let results:string[] = [];
  const list = fs.readdirSync(directory);
  for (const listFile of list) {
    const file = path.join(directory.toString(), listFile);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      /* Recurse into a subdirectory */
      results = [...results, ...readDirRecursive(file)];
    } else {
      /* Is a file */
      results.push(file);
    }
  }

  return results;
}