#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

// Get the current working directory
const currentDir = process.cwd();
const samanthaDir = path.join(currentDir, 'samantha')

// Resolve the path to the 'samantha' folder, which is relative to the script's location
const samanthaPath = path.join(__dirname, '..', 'examples', 'samantha');

// Function to copy files from the 'samantha' folder to the current directory
async function copyFiles() {
  try {
    console.log('\n🟡 creating socialagi server from Samantha template to ./samantha');
    await fs.copy(samanthaPath, samanthaDir);
    console.log('🟢 socialagi server installed');
  } catch (err) {
    console.error('🔴 error copying files:', err);
    process.exit(1);
  }
}

// Function to run 'npm install' in the current directory
function runNpmInstall() {
  console.log('\n🟡 installing dependencies');
  const npmInstall = spawn('npm', ['install'], { stdio: 'inherit', cwd: samanthaDir });

  npmInstall.on('close', (code) => {
    if (code !== 0) {
      console.error(`npm install exited with code ${code}`);
      process.exit(code);
    } else {
      console.log('🟢 server dependencies installed');
      const npmInstallG = spawn('npm', ['install', '-g', 'socialagi-devtools']);
      console.log('\n🟡 installing socialagi-devtools globally');
      npmInstallG.on('close', (code) => {
        if (code !== 0) {
          console.error(`npm install exited with code ${code}`);
          process.exit(code);
        } else {
          console.log('🟢 socialagi-devtools installed globally');
          console.log('\n➡️️️➡️➡️ finished.️ navigate to ./samantha and check out the README.md');
        }
      });
    }
  });
}

// Execute the functions
(async () => {
  await fs.mkdir('samantha', (err) => {
    if (err) throw err;
  });
  await copyFiles();
  runNpmInstall();
})();
