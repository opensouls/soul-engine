// The soul engine swaps out calls to load with an internal implementation
// this is just for clarity locally.
export const load = (path: string): string => {
  if (typeof window === "undefined" && typeof process !== 'undefined' && process.versions != null && process.versions.node != null) {

    // We are in Node.js environment
    const { fileURLToPath } = require('url');
    const fs = require('node:fs');
    const pathModule = require('path');
    let dirname;
    if (typeof __dirname === 'undefined') { // ES Modules
      dirname = pathModule.dirname(fileURLToPath(import.meta.url));
    } else { // CommonJS
      dirname = __dirname;
    }
    const fullPath = pathModule.join(dirname, path);
    return fs.readFileSync(fullPath, 'utf-8');
  } else {
    // We are in a browser environment
    console.error('load function is not supported in the browser');
    throw new Error('load function is not supported in the browser');
  }
};
