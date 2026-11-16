process.noDeprecation = true;
delete process.env.NODE_OPTIONS;
delete process.env.VSCODE_INSPECTOR_OPTIONS;
delete process.env.ELECTRON_RUN_AS_NODE;

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

  const explicitDisableGpu = process.argv.includes('--disable-gpu') || process.env.AETHER_DISABLE_GPU === '1';
  const flags = [
    '--no-sandbox',
    '--log-level=3',
    ...(explicitDisableGpu ? ['--disable-gpu'] : []),
    '--no-deprecation',
    '.',
    ...process.argv.slice(2).filter(arg => arg !== '--disable-gpu')
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

const { app, BrowserWindow, session } = electron;
process.noDeprecation = true;

// Suppress internal Chromium DirectX/DirectComposition overlay notices and activate acceleration
if (app && app.commandLine) {
  app.commandLine.appendSwitch('log-level', '3');
  app.commandLine.appendSwitch('disable-logging');

  // Hardware Acceleration & High-Performance Switches (only when GPU is enabled)
  const isGpuDisabled = process.argv.includes('--disable-gpu') || process.env.AETHER_DISABLE_GPU === '1';
  if (!isGpuDisabled) {
    app.commandLine.appendSwitch('enable-gpu-rasterization');
    app.commandLine.appendSwitch('enable-zero-copy');
    app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
    app.commandLine.appendSwitch('enable-accelerated-video-decode');
  } else {
    app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
    app.commandLine.appendSwitch('disable-gpu-program-cache');
  }
  app.commandLine.appendSwitch('enable-fast-unload');
  app.commandLine.appendSwitch('enable-features', isGpuDisabled
    ? 'OverlayScrollbar,SmoothScrolling,ParallelDownloading,AsyncDns,BackForwardCache'
    : 'VaapiVideoDecoder,OverlayScrollbar,CanvasOopRasterization,SmoothScrolling,ParallelDownloading,AsyncDns,BackForwardCache');
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=2048');
}

const path = require('path');
if (app && typeof app.setName === 'function') {
  app.setName('AETHER Browser');
  try {
    if (process.platform === 'win32' && process.env.APPDATA) {
      app.setPath('userData', path.join(process.env.APPDATA, 'AETHER Browser'));
    }
  } catch (e) {}
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
  try {
    session.defaultSession.setProxy({ mode: 'system' }).catch(() => {});
  } catch (e) {}
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
