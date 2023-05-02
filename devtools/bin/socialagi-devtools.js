#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const nextCli = path.resolve(projectRoot, "node_modules", ".bin", "next");

const devCommand = spawn(nextCli, ["dev"], {
  cwd: projectRoot,
  stdio: "inherit",
});

devCommand.on("error", (error) => {
  console.error(`Error running Next.js server: ${error.message}`);
  process.exit(1);
});

devCommand.on("exit", (code) => {
  if (code !== 0) {
    console.error(`Next.js server exited with code ${code}`);
    process.exit(code);
  }
});
