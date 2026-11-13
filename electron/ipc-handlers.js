const { ipcMain, dialog, BrowserWindow, app, session } = require('electron');
const windowManager = require('./window-manager');
const storageManager = require('./storage-manager');
const navigationController = require('./navigation-controller');
const downloadController = require('./download-controller');
const permissionController = require('./permission-controller');
const menuManager = require('./menu-manager');
const aiController = require('./ai-controller');
const shieldsController = require('./shields-controller');
const readerController = require('./reader-controller');
const captureController = require('./capture-controller');

function getTabControllerForSender(event) {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return null;
  // Security guard: verify that the caller is the trusted browser UI window
  if (win.webContents !== event.sender) {
    console.warn('[IPC Security Alert] Rejected privileged call from untrusted view/frame');
    return null;
  }
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

  ipcMain.handle('window:set-left-offset', (event, offset) => {
    if (typeof offset !== 'number' || offset < 0) return;
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) {
      tabCtrl.setLeftOffset(offset);
    }
  });

  ipcMain.handle('window:print', (event, tabId) => {
    const tabCtrl = getTabControllerForSender(event);
    if (!tabCtrl) return false;
    const tab = tabCtrl.getTab(tabId || tabCtrl.activeTabId);
    if (tab && tab.view && !tab.isInternal) {
      tab.view.webContents.print();
      return true;
    }
    return false;
  });

  ipcMain.handle('tabs:set-view-visible', (event, visible) => {
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) {
      tabCtrl.setActiveViewVisible(visible);
    }
  });

  // --- Tab Management ---
  ipcMain.handle('tab:create', (event, url, options = {}) => {
    const tabCtrl = getTabControllerForSender(event);
    if (!tabCtrl) return null;
    const safeUrl = typeof url === 'string' ? url : 'aether://newtab';
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
    if (typeof url !== 'string') return;
    const tabCtrl = getTabControllerForSender(event);
    if (!tabCtrl) return;
    const targetId = (typeof tabId === 'string' && tabId) ? tabId : tabCtrl.activeTabId;
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

  ipcMain.handle('session:clear-data', async (event, options = {}) => {
    try {
      const storages = [];
      if (options.cookies) storages.push('cookies');
      if (options.cache) storages.push('cache', 'shadercache');
      if (options.storage) storages.push('localstorage', 'indexdb', 'websql', 'serviceworkers');
      if (storages.length > 0) {
        await session.defaultSession.clearStorageData({ storages });
      }
      if (options.cache) {
        await session.defaultSession.clearCache();
      }
      return { success: true };
    } catch (e) {
      console.warn('clear-data error:', e);
      return { success: false, error: e.message };
    }
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

  // --- App / Nexus Menu ---
  ipcMain.handle('menu:show-app-menu', (event, coords) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const tabCtrl = getTabControllerForSender(event);
    if (win && tabCtrl) {
      menuManager.showAppMenu(win, tabCtrl, coords);
      return true;
    }
    return false;
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

  // --- AMIYO Shields ---
  ipcMain.handle('shields:get-status', () => {
    return shieldsController.getStats();
  });

  ipcMain.handle('shields:toggle', (event, enabled) => {
    return shieldsController.toggle(enabled);
  });

  ipcMain.handle('shields:get-tab-stats', (event, tabId) => {
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) {
      const tab = tabCtrl.getTab(tabId || tabCtrl.activeTabId);
      if (tab && tab.view && !tab.view.webContents.isDestroyed()) {
        const wcStats = shieldsController.getTabStats(`wc_${tab.view.webContents.id}`);
        if (wcStats && (wcStats.total > 0 || wcStats.blockedCount > 0)) {
          return wcStats;
        }
      }
    }
    return shieldsController.getTabStats(tabId);
  });

  ipcMain.handle('shields:toggle-whitelist', (event, domain, allow) => {
    return shieldsController.toggleSiteWhitelist(domain, allow);
  });

  // --- Tab Suspension / Memory Saver ---
  ipcMain.handle('tabs:suspend', (event, tabId) => {
    const tabCtrl = getTabControllerForSender(event);
    return tabCtrl ? tabCtrl.suspendTab(tabId) : false;
  });

  ipcMain.handle('tabs:resume', (event, tabId) => {
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) tabCtrl.resumeTab(tabId);
    return true;
  });

  // --- Tab Groups ---
  ipcMain.handle('tabs:create-group', (event, data) => {
    const tabCtrl = getTabControllerForSender(event);
    return tabCtrl ? tabCtrl.createGroup(data) : null;
  });

  ipcMain.handle('tabs:update-group', (event, groupId, updates) => {
    const tabCtrl = getTabControllerForSender(event);
    return tabCtrl ? tabCtrl.updateGroup(groupId, updates) : null;
  });

  ipcMain.handle('tabs:delete-group', (event, groupId) => {
    const tabCtrl = getTabControllerForSender(event);
    return tabCtrl ? tabCtrl.deleteGroup(groupId) : false;
  });

  ipcMain.handle('tabs:set-group', (event, tabId, groupId) => {
    const tabCtrl = getTabControllerForSender(event);
    return tabCtrl ? tabCtrl.setTabGroup(tabId, groupId) : false;
  });

  ipcMain.handle('tabs:get-groups', (event) => {
    const tabCtrl = getTabControllerForSender(event);
    return tabCtrl ? tabCtrl.getGroups() : [];
  });

  // --- Split Screen Dual View ---
  ipcMain.handle('tabs:set-split', (event, tabId) => {
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) tabCtrl.setSplitTab(tabId);
    return true;
  });

  ipcMain.handle('tabs:close-split', (event) => {
    const tabCtrl = getTabControllerForSender(event);
    if (tabCtrl) tabCtrl.closeSplitTab();
    return true;
  });

  ipcMain.handle('tabs:get-split', (event) => {
    const tabCtrl = getTabControllerForSender(event);
    return tabCtrl ? tabCtrl.getSplitTabId() : null;
  });

  // --- Reading Mode ---
  ipcMain.handle('reader:extract', async (event, tabId) => {
    const tabCtrl = getTabControllerForSender(event);
    if (!tabCtrl) return { success: false, error: 'Tab controller not found' };
    const tab = tabCtrl.getTab(tabId || tabCtrl.activeTabId);
    if (!tab || !tab.view) return { success: false, error: 'Tab not found' };
    return await readerController.extractArticle(tab.view.webContents);
  });

  // --- Web Capture / Screenshot ---
  ipcMain.handle('capture:viewport', async (event, tabId) => {
    const tabCtrl = getTabControllerForSender(event);
    if (!tabCtrl) return { success: false, error: 'Tab controller not found' };
    const tab = tabCtrl.getTab(tabId || tabCtrl.activeTabId);
    if (!tab || !tab.view) return { success: false, error: 'Tab not found' };
    return await captureController.captureViewport(tab.view.webContents);
  });

  ipcMain.handle('capture:clipboard', async (event, tabId) => {
    const tabCtrl = getTabControllerForSender(event);
    if (!tabCtrl) return false;
    const tab = tabCtrl.getTab(tabId || tabCtrl.activeTabId);
    if (!tab || !tab.view) return false;
    return await captureController.copyToClipboard(tab.view.webContents);
  });

  ipcMain.handle('capture:save', async (event, tabId, defaultName) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const tabCtrl = getTabControllerForSender(event);
    if (!win || !tabCtrl) return false;
    const tab = tabCtrl.getTab(tabId || tabCtrl.activeTabId);
    if (!tab || !tab.view) return false;
    return await captureController.saveToFile(win, tab.view.webContents, defaultName);
  });

  // --- Browser Task Manager ---
  ipcMain.handle('system:get-tasks', (event) => {
    const tabCtrl = getTabControllerForSender(event);
    const metrics = app.getAppMetrics ? app.getAppMetrics() : [];
    const tabs = tabCtrl ? tabCtrl.tabs : [];

    return metrics.map(m => {
      let name = m.type;
      let tabId = null;

      if (m.type === 'Tab' || m.type === 'Renderer') {
        const matchingTab = tabs.find(t => t.view && !t.view.webContents.isDestroyed() && t.view.webContents.getOSProcessId() === m.pid);
        if (matchingTab) {
          name = `Tab: ${matchingTab.title || matchingTab.url}`;
          tabId = matchingTab.id;
        } else {
          name = 'Renderer (Browser Shell)';
        }
      } else if (m.type === 'Browser') {
        name = 'AETHER Browser (Main Process)';
      } else if (m.type === 'GPU') {
        name = 'GPU Process';
      }

      return {
        pid: m.pid,
        type: m.type,
        name,
        tabId,
        cpu: (m.cpu && m.cpu.percentCPUUsage) ? m.cpu.percentCPUUsage.toFixed(1) : '0.0',
        memoryMB: m.memory ? (m.memory.workingSetSize / 1024).toFixed(1) : '0.0'
      };
    });
  });

  ipcMain.handle('system:kill-process', (event, pid, tabId) => {
    const tabCtrl = getTabControllerForSender(event);
    if (tabId && tabCtrl) {
      tabCtrl.closeTab(tabId);
      return true;
    }
    if (pid && pid !== process.pid) {
      try {
        process.kill(pid);
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  });
}

module.exports = { registerIpcHandlers };

