import { $ } from 'execa'
import esbuild from 'esbuild'
import { Extractor, ExtractorConfig, ExtractorResult } from '@microsoft/api-extractor';
import { join } from 'path';
import { readFile, appendFile } from "node:fs/promises"

await $`rm -rf dist lib temp`
await $`mkdir dist`
await $`npx tsc -p tsconfig.build.json`

const apiExtractorJsonPath: string = join(process.cwd(), "config/api-extractor.json")

// Load and parse the api-extractor.json file
const extractorConfig: ExtractorConfig = ExtractorConfig.loadFileAndPrepare(apiExtractorJsonPath);

// Invoke API Extractor
const extractorResult: ExtractorResult = Extractor.invoke(extractorConfig, {
  localBuild: true,
  showVerboseMessages: true,
});

if (extractorResult.succeeded) {
  console.log(`API Extractor completed successfully`);
} else {
  console.error(
    `API Extractor completed with ${extractorResult.errorCount} errors` +
      ` and ${extractorResult.warningCount} warnings`
  );
  process.exit(1)
}

const defaultParams:esbuild.BuildOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  sourcemap: true,
  packages: "external",
  target: "node18",
  outdir: 'dist',
  outExtension: { ".js": ".cjs" },
}

await esbuild.build({
  ...defaultParams,
  format: 'esm',
  outExtension: { ".js": ".mjs" },
})

await esbuild.build({
  ...defaultParams,
  format: 'cjs',
})

await $`rm -rf lib temp`
