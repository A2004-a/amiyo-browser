const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('    Building AETHER Browser for Windows (x64)       ');
console.log('====================================================\n');

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const appDistDir = path.join(distDir, 'AETHER-Browser-win32-x64');
const unpackedDir = path.join(distDir, 'win-unpacked');

// 1. Pack with electron-builder if win-unpacked doesn't exist
if (!fs.existsSync(unpackedDir) || !fs.existsSync(path.join(unpackedDir, 'AETHER Browser.exe'))) {
  console.log('Packaging via electron-builder to apply authentic PE metadata and icon...');
  execSync('npx electron-builder --win --dir --x64', { cwd: rootDir, stdio: 'inherit' });
}

// 2. Ensure clean portable distribution folder
if (fs.existsSync(appDistDir)) {
  console.log('Cleaning previous portable build folder...');
  fs.rmSync(appDistDir, { recursive: true, force: true });
}
fs.mkdirSync(appDistDir, { recursive: true });

// 3. Copy from win-unpacked
console.log('Copying patched binaries from win-unpacked...');
fs.cpSync(unpackedDir, appDistDir, { recursive: true });

// 4. Create a convenient Windows batch launcher in the package
const launcherPath = path.join(appDistDir, 'Launch-AETHER-Browser.bat');
fs.writeFileSync(launcherPath, `@echo off\r\nstart "" "%~dp0AETHER Browser.exe"\r\n`);
console.log(' ✔ Created Launch-AETHER-Browser.bat');

// 5. Create portable zip archive
const zipPath = path.join(distDir, 'AETHER-Browser-win32-x64.zip');
try {
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  console.log('Compressing portable distribution to ZIP archive...');
  execSync(`powershell.exe -NoProfile -Command "$ProgressPreference = 'SilentlyContinue'; Compress-Archive -Path '${appDistDir}\\*' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });
  console.log(` ✔ Created portable zip: ${zipPath}`);
} catch (e) {
  console.warn('Zip compression note:', e.message);
}

const targetExe = path.join(appDistDir, 'AETHER Browser.exe');
console.log('\n====================================================');
console.log(' ✔ Portable Windows 64-bit build completed:');
console.log(`   Folder: ${appDistDir}`);
console.log(`   Executable: ${targetExe}`);
console.log('====================================================\n');
