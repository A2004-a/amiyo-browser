const { ipcMain, dialog, BrowserWindow } = require('electron');
const windowManager = require('./window-manager');
const storageManager = require('./storage-manager');
const navigationController = require('./navigation-controller');
const downloadController = require('./download-controller');
const permissionController = require('./permission-controller');
const menuManager = require('./menu-manager');
const aiController = require('./ai-controller');

function getTabControllerForSender(event) {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return null;
  const winInfo = windowManager.getWindowInfo(win);
  return winInfo ? winInfo.tabController : null;
}

function registerIpcHandlers() {
  // --- Window Controls ---
  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
  });

  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });

  ipcMain.handle('window:is-maximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win ? win.isMaximized() : false;
  });

  ipcMain.handle('window:create-new', () => {
    windowManager.createWindow(false);
  });

  ipcMain.handle('window:create-private', () => {
    windowManager.createWindow(true);
  });

  ipcMain.handle('window:toggle-fullscreen', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setFullScreen(!win.isFullScreen());
    }
  });

  ipcMain.handle('window:set-top-offset', (event, offset) => {
    if (typeof offset !== 'number' || offset < 0) return;
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) {
      tabCtrl.setTopOffset(offset);
    }
  });

  // --- Tab Management ---
  ipcMain.handle('tab:create', (event, url, options = {}) => {
    const tabCtrl = getTabControllerForSender(event);
    if (!tabCtrl) return null;
    const safeUrl = typeof url === 'string' ? url : 'amiyo://newtab';
    const tab = tabCtrl.createTab(safeUrl, options);
    return {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      favicon: tab.favicon,
      isInternal: tab.isInternal,
      isLoading: tab.isLoading
    };
  });

  ipcMain.handle('tab:switch', (event, tabId) => {
    if (typeof tabId !== 'string') return;
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) tabCtrl.switchTab(tabId);
  });

  ipcMain.handle('tab:close', (event, tabId) => {
    if (typeof tabId !== 'string') return;
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) tabCtrl.closeTab(tabId);
  });

  ipcMain.handle('tab:duplicate', (event, tabId) => {
    if (typeof tabId !== 'string') return;
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) tabCtrl.duplicateTab(tabId);
  });

  ipcMain.handle('tab:pin', (event, tabId, isPinned) => {
    if (typeof tabId !== 'string') return;
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) tabCtrl.pinTab(tabId, isPinned);
  });

  ipcMain.handle('tab:mute', (event, tabId, isMuted) => {
    if (typeof tabId !== 'string') return;
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) tabCtrl.muteTab(tabId, isMuted);
  });

  ipcMain.handle('tab:reorder', (event, fromIndex, toIndex) => {
    if (typeof fromIndex !== 'number' || typeof toIndex !== 'number') return;
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) tabCtrl.reorderTabs(fromIndex, toIndex);
  });

  ipcMain.handle('tab:restore', (event) => {
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) tabCtrl.restoreClosedTab();
  });

  ipcMain.handle('tab:navigate', (event, tabId, url) => {
    console.log('[IPC] tab:navigate received tabId:', tabId, 'url:', url);
    if (typeof url !== 'string') return;
    const tabCtrl = getTabControllerForSender(event);
    if (!tabCtrl) {
      console.log('[IPC] tab:navigate - no tabCtrl found for sender!');
      return;
    }
    const targetId = (typeof tabId === 'string' && tabId) ? tabId : tabCtrl.activeTabId;
    console.log('[IPC] tab:navigate targetId:', targetId);
    if (targetId) {
      tabCtrl.navigateTab(targetId, url);
    } else {
      tabCtrl.createTab(url, { active: true });
    }
  });

  ipcMain.handle('tab:list', (event) => {
    const tabCtrl = getTabControllerForSender(event);
    return tabCtrl ? tabCtrl.getTabsSummary() : [];
  });

  // --- Navigation Controls ---
  ipcMain.handle('nav:back', (event, tabId) => {
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) tabCtrl.goBack(tabId || tabCtrl.activeTabId);
  });

  ipcMain.handle('nav:forward', (event, tabId) => {
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) tabCtrl.goForward(tabId || tabCtrl.activeTabId);
  });

  ipcMain.handle('nav:reload', (event, tabId, ignoreCache = false) => {
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) tabCtrl.reload(tabId || tabCtrl.activeTabId, ignoreCache);
  });

  ipcMain.handle('nav:stop', (event, tabId) => {
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) tabCtrl.stop(tabId || tabCtrl.activeTabId);
  });

  ipcMain.handle('nav:suggestions', async (event, query) => {
    if (typeof query !== 'string') return [];
    return navigationController.getSuggestionsAsync(query);
  });

  ipcMain.handle('nav:security-status', (event, url) => {
    return navigationController.getSecurityStatus(url);
  });

  // --- Bookmarks ---
  ipcMain.handle('bookmarks:get', () => {
    return storageManager.getBookmarks();
  });

  ipcMain.handle('bookmarks:add', (event, item) => {
    if (!item || typeof item.url !== 'string') return null;
    return storageManager.addBookmark(item);
  });

  ipcMain.handle('bookmarks:remove', (event, id) => {
    if (typeof id !== 'string') return false;
    return storageManager.removeBookmark(id);
  });

  ipcMain.handle('bookmarks:update', (event, id, updates) => {
    if (typeof id !== 'string' || typeof updates !== 'object') return null;
    return storageManager.updateBookmark(id, updates);
  });

  ipcMain.handle('bookmarks:export', () => {
    return JSON.stringify(storageManager.getBookmarks(), null, 2);
  });

  ipcMain.handle('bookmarks:import', (event, jsonString) => {
    try {
      const items = JSON.parse(jsonString);
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.url) storageManager.addBookmark(item);
        }
        return true;
      }
    } catch (e) {
      console.error('Failed to import bookmarks:', e);
    }
    return false;
  });

  // --- History ---
  ipcMain.handle('history:get', () => {
    return storageManager.getHistory();
  });

  ipcMain.handle('history:delete', (event, id) => {
    if (typeof id !== 'string') return false;
    return storageManager.deleteHistoryItem(id);
  });

  ipcMain.handle('history:clear', (event, range) => {
    return storageManager.clearHistory(range || 'all');
  });

  // --- Downloads ---
  ipcMain.handle('downloads:get', () => {
    return storageManager.getDownloads();
  });

  ipcMain.handle('downloads:pause', (event, id) => {
    return downloadController.pauseDownload(id);
  });

  ipcMain.handle('downloads:resume', (event, id) => {
    return downloadController.resumeDownload(id);
  });

  ipcMain.handle('downloads:cancel', (event, id) => {
    return downloadController.cancelDownload(id);
  });

  ipcMain.handle('downloads:open-file', async (event, savePath) => {
    if (typeof savePath !== 'string') return false;
    return await downloadController.openFile(savePath);
  });

  ipcMain.handle('downloads:show-in-folder', (event, savePath) => {
    if (typeof savePath !== 'string') return false;
    return downloadController.showInFolder(savePath);
  });

  ipcMain.handle('downloads:clear', () => {
    return storageManager.clearDownloads();
  });

  // --- Settings ---
  ipcMain.handle('settings:get', () => {
    return storageManager.getSettings();
  });

  ipcMain.handle('settings:save', (event, updates) => {
    if (typeof updates !== 'object') return null;
    const newSettings = storageManager.saveSettings(updates);
    try {
      BrowserWindow.getAllWindows().forEach(win => {
        if (!win.isDestroyed()) {
          win.webContents.send('settings-updated', newSettings);
        }
      });
    } catch (e) {}
    return newSettings;
  });

  ipcMain.handle('settings:select-download-dir', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const res = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory']
    });
    if (!res.canceled && res.filePaths.length > 0) {
      return res.filePaths[0];
    }
    return null;
  });

  // --- Permissions ---
  ipcMain.handle('permissions:get', () => {
    return permissionController.getPermissions();
  });

  ipcMain.handle('permissions:set', (event, origin, permission, allowed) => {
    return permissionController.setPermission(origin, permission, allowed);
  });

  // --- Find in Page ---
  ipcMain.handle('find:start', (event, tabId, text, options) => {
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl && typeof text === 'string') {
      return tabCtrl.findInPage(tabId, text, options);
    }
  });

  ipcMain.handle('find:stop', (event, tabId, action) => {
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) {
      tabCtrl.stopFindInPage(tabId, action);
    }
  });

  // --- Zoom ---
  ipcMain.handle('zoom:set', (event, tabId, factor) => {
    if (typeof factor !== 'number') return;
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) {
      tabCtrl.setZoom(tabId, factor);
    }
  });

  // --- Context Menu ---
  ipcMain.handle('context-menu:show', (event, params) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const tabCtrl = getTabControllerForSender(event);
    if (win && tabCtrl) {
      menuManager.showContextMenu(win, tabCtrl, params);
    }
  });

  // --- Window Side Offset for AI Panel ---
  ipcMain.handle('window:set-side-offset', (event, offset) => {
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) {
      tabCtrl.setSideOffset(offset);
    }
  });

  // --- AI Assistant ---
  ipcMain.handle('ai:chat', async (event, data) => {
    return await aiController.chat(data);
  });

  ipcMain.handle('ai:summarize', async (event, tabId) => {
    const tabCtrl = getTabControllerForSender(event);
    if (!tabCtrl) return { summary: 'Tab controller not available', takeaways: [] };
    const pageContent = await tabCtrl.getActiveTabContent(tabId);
    return await aiController.summarizePage(pageContent);
  });

  ipcMain.handle('ai:get-page-content', async (event, tabId) => {
    const tabCtrl = getTabControllerForSender(event);
    if (!tabCtrl) return { title: '', url: '', text: '' };
    return await tabCtrl.getActiveTabContent(tabId);
  });
}

module.exports = { registerIpcHandlers };

