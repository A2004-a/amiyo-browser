const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('    Building AETHER Browser for Windows (x64)       ');
console.log('====================================================\n');

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const appDistDir = path.join(distDir, 'AETHER-Browser-win32-x64');
const electronDistDir = path.join(rootDir, 'node_modules', 'electron', 'dist');

// 1. Ensure clean dist directory
if (fs.existsSync(appDistDir)) {
  console.log('Cleaning previous build directory...');
  fs.rmSync(appDistDir, { recursive: true, force: true });
}
fs.mkdirSync(appDistDir, { recursive: true });

// 2. Copy Electron binaries and resources
console.log('Copying Chromium & Electron binaries from node_modules...');
fs.cpSync(electronDistDir, appDistDir, { recursive: true });

// 3. Rename electron.exe to AETHER Browser.exe
const defaultExe = path.join(appDistDir, 'electron.exe');
const targetExe = path.join(appDistDir, 'AETHER Browser.exe');
if (fs.existsSync(defaultExe)) {
  fs.renameSync(defaultExe, targetExe);
  console.log('Renamed executable to "AETHER Browser.exe"');
}

// 4. Populate resources/app
const appDir = path.join(appDistDir, 'resources', 'app');
fs.mkdirSync(appDir, { recursive: true });

console.log('Packaging application code into resources/app...');
const itemsToCopy = ['package.json', 'main.js', 'preload.js', 'electron', 'src', 'data', 'assets'];

for (const item of itemsToCopy) {
  const srcPath = path.join(rootDir, item);
  const destPath = path.join(appDir, item);
  if (fs.existsSync(srcPath)) {
    fs.cpSync(srcPath, destPath, { recursive: true });
    console.log(` ✔ Copied ${item}`);
  }
}

// 5. Create a convenient Windows batch launcher in the package
const launcherPath = path.join(appDistDir, 'Launch-AETHER-Browser.bat');
fs.writeFileSync(launcherPath, `@echo off\r\nstart "" "%~dp0AETHER Browser.exe"\r\n`);
console.log(' ✔ Created Launch-AETHER-Browser.bat');

console.log('\n====================================================');
console.log(' ✔ Portable Windows 64-bit build completed:');
console.log(`   Folder: ${appDistDir}`);
console.log(`   Executable: ${targetExe}`);
console.log('====================================================\n');

