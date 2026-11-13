process.noDeprecation = true;

// CLI evaluation & version checks (e.g. VS Code debugger inspection)
if (process.argv.includes('-v') || process.argv.includes('--version')) {
  console.log(`v${process.versions.node}`);
  process.exit(0);
}
const pIdx = process.argv.findIndex(arg => arg === '-p' || arg === '--print');
if (pIdx !== -1 && process.argv[pIdx + 1]) {
  try {
    const res = eval(process.argv[pIdx + 1]);
    if (res !== undefined) console.log(res);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
  process.exit(0);
}
const eIdx = process.argv.findIndex(arg => arg === '-e' || arg === '--eval');
if (eIdx !== -1 && process.argv[eIdx + 1]) {
  try {
    eval(process.argv[eIdx + 1]);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
  process.exit(0);
}

const electron = require('electron');

// Auto-spawn under Electron when executed directly with `node main.js` (e.g. VS Code Run/Debug)
if (typeof electron === 'string') {
  const { spawn } = require('child_process');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.NODE_OPTIONS;
  delete env.VSCODE_INSPECTOR_OPTIONS;
  env.ELECTRON_ENABLE_LOGGING = '0';

  const flags = [
    '--no-sandbox',
    '--disable-gpu',
    '--no-deprecation',
    '.',
    ...process.argv.slice(2)
  ];

  const child = spawn(electron, flags, {
    stdio: 'inherit',
    env,
    windowsHide: false
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
  return;
}

const { app, BrowserWindow } = electron;
process.noDeprecation = true;

// Suppress internal Chromium DirectX/DirectComposition overlay notices
if (app && app.commandLine) {
  app.commandLine.appendSwitch('log-level', '3');
  app.commandLine.appendSwitch('disable-logging');
}

if (app && typeof app.setName === 'function') {
  app.setName('AETHER Browser');
}

// Single instance lock to prevent concurrent database & cache lock contention
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  console.log('[AETHER] Another instance of AETHER Browser is already running. Focusing primary window...');
  app.quit();
  return;
}

app.on('second-instance', () => {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    const primary = windows[0];
    if (primary.isMinimized()) primary.restore();
    primary.focus();
  }
});
const windowManager = require('./electron/window-manager');
const menuManager = require('./electron/menu-manager');
const { registerIpcHandlers } = require('./electron/ipc-handlers');

app.whenReady().then(() => {
  registerIpcHandlers();
  menuManager.setupAppMenu(windowManager);

  // Create initial browser window
  const mainWin = windowManager.createWindow(false);

  // If in automated test mode, verify and exit cleanly
  if (process.argv.includes('--test-mode')) {
    const handleLoaded = () => {
      console.log('✔ [TEST MODE] Browser window and shell loaded successfully!');
      setTimeout(() => {
        console.log('✔ [TEST MODE] Closing browser cleanly...');
        app.quit();
      }, 500);
    };

    if (mainWin.webContents.isLoading()) {
      mainWin.webContents.once('did-finish-load', handleLoaded);
    } else {
      handleLoaded();
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createWindow(false);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Protect against unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
