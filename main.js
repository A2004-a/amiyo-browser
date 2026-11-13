const { app, BrowserWindow } = require('electron');
if (app && typeof app.setName === 'function') {
  app.setName('AETHER Browser');
}
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
