import { $ } from 'execa'
import esbuild from 'esbuild'
import { Extractor, ExtractorConfig, ExtractorResult } from '@microsoft/api-extractor';
import { join } from 'path';

// import path from 'node:path'

await $`rm -rf dist etc lib temp`
// await $`rm -rf cache/tmp`
await $`mkdir dist`
await $`mkdir etc`
await $`npx tsc -p tsconfig.build.json`


const apiExtractorJsonPath: string = join(process.cwd(), "config/api-extractor.json")

// Load and parse the api-extractor.json file
const extractorConfig: ExtractorConfig = ExtractorConfig.loadFileAndPrepare(apiExtractorJsonPath);


// Invoke API Extractor
const extractorResult: ExtractorResult = Extractor.invoke(extractorConfig, {
  // Equivalent to the "--local" command-line parameter
  localBuild: true,

  // Equivalent to the "--verbose" command-line parameter
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

await $`cp src/sharedTypes/cortexStep.d.ts dist/`

await $`rm -rf lib temp`
