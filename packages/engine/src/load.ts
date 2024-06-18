import { fileURLToPath } from 'url';

export const load = async (path: string) => {
  if (typeof process !== 'undefined' && process.versions != null && process.versions.node != null) {
    // We are in Node.js environment
    const fs = await import('node:fs/promises');
    const pathModule = await import('path');
    let dirname;
    if (typeof __dirname === 'undefined') { // ES Modules
      dirname = pathModule.dirname(fileURLToPath(import.meta.url));
    } else { // CommonJS
      dirname = __dirname;
    }
    const fullPath = pathModule.join(dirname, path);
    return fs.readFile(fullPath, 'utf-8');
  } else {
    // We are in a browser environment
    console.error('load function is not supported in the browser');
    throw new Error('load function is not supported in the browser');
  }
};
