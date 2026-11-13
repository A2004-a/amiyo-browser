const { BrowserWindow, app } = require('electron');
const path = require('path');
const sessionManager = require('./session-manager');
const downloadController = require('./download-controller');
const storageManager = require('./storage-manager');
const TabController = require('./tab-controller');

class WindowManager {
  constructor() {
    this.windows = new Map(); // windowId -> { window, tabController, isPrivate }
    this.nextWindowId = 1;
    downloadController.setWindowManager(this);
  }

  createWindow(isPrivate = false) {
    const winId = this.nextWindowId++;
    const sessionInstance = isPrivate
      ? sessionManager.createPrivateSession(winId)
      : sessionManager.initDefaultSession();

    const win = new BrowserWindow({
      width: 1280,
      height: 840,
      minWidth: 600,
      minHeight: 400,
      frame: false, // Custom sleek modern window chrome
      titleBarStyle: 'hidden',
      title: isPrivate ? 'AETHER Browser (Private)' : 'AETHER Browser',
      backgroundColor: '#0B0F14',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: path.join(__dirname, '..', 'preload.js'),
        session: sessionInstance
      },
      show: false
    });

    const tabController = new TabController(this, win, sessionInstance, isPrivate);
    
    // Initialize tabs: check if session restore is enabled in settings
    const settings = storageManager.getSettings();
    if (!isPrivate && settings.restoreTabsOnStartup) {
      const savedSession = storageManager.getSession();
      if (savedSession && savedSession.length > 0) {
        savedSession.forEach((t, idx) => {
          tabController.createTab(t.url, { isPinned: t.isPinned, active: idx === 0 });
        });
      } else {
        tabController.createTab('amiyo://newtab');
      }
    } else {
      tabController.createTab('amiyo://newtab');
    }

    this.windows.set(winId, {
      id: winId,
      window: win,
      tabController,
      isPrivate
    });

    // Window events
    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[Renderer] [${level}] ${message} (${sourceId}:${line})`);
    });

    win.webContents.on('render-process-gone', (event, details) => {
      console.error(`[Renderer Crash] Reason: ${details.reason}, exitCode: ${details.exitCode}`);
    });

    win.on('resize', () => {
      tabController.updateActiveViewBounds();
    });

    win.on('maximize', () => {
      tabController.updateActiveViewBounds();
      win.webContents.send('window-maximized-changed', true);
    });

    win.on('unmaximize', () => {
      tabController.updateActiveViewBounds();
      win.webContents.send('window-maximized-changed', false);
    });

    win.on('close', () => {
      if (!isPrivate) {
        storageManager.saveSession(tabController.tabs);
      }
    });

    win.on('closed', () => {
      tabController.destroyAll();
      if (isPrivate) {
        sessionManager.destroyPrivateSession(winId);
      }
      this.windows.delete(winId);
      if (this.windows.size === 0) {
        app.quit();
      }
    });

    // Load shell HTML
    win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

    win.once('ready-to-show', () => {
      win.show();
      tabController.updateActiveViewBounds();
    });

    return win;
  }

  getWindowInfo(win) {
    for (const [id, info] of this.windows.entries()) {
      if (info.window === win) return info;
    }
    return null;
  }

  getWindowInfoById(id) {
    return this.windows.get(id);
  }

  getFocusedWindowInfo() {
    const focused = BrowserWindow.getFocusedWindow();
    if (focused) {
      return this.getWindowInfo(focused);
    }
    // Return first window if none focused
    if (this.windows.size > 0) {
      return this.windows.values().next().value;
    }
    return null;
  }

  broadcast(channel, data) {
    for (const { window } of this.windows.values()) {
      if (window && !window.isDestroyed()) {
        window.webContents.send(channel, data);
      }
    }
  }

  handleAction(action, payload = {}) {
    const winInfo = this.getFocusedWindowInfo();
    if (!winInfo) return;
    const { window, tabController } = winInfo;

    switch (action) {
      case 'new-tab':
        tabController.createTab(payload.url || 'amiyo://newtab');
        break;
      case 'close-tab':
        tabController.closeTab(payload.tabId || tabController.activeTabId);
        break;
      case 'restore-closed-tab':
        tabController.restoreClosedTab();
        break;
      case 'open-find-in-page':
        window.webContents.send('trigger-find-in-page');
        break;
      case 'reload':
        tabController.reload(payload.tabId, false);
        break;
      case 'force-reload':
        tabController.reload(payload.tabId, true);
        break;
      case 'zoom-in': {
        const t = tabController.getActiveTab();
        if (t) tabController.setZoom(t.id, (t.zoomFactor || 1) + 0.1);
        break;
      }
      case 'zoom-out': {
        const t = tabController.getActiveTab();
        if (t) tabController.setZoom(t.id, (t.zoomFactor || 1) - 0.1);
        break;
      }
      case 'zoom-reset': {
        const t = tabController.getActiveTab();
        if (t) tabController.setZoom(t.id, 1.0);
        break;
      }
      case 'open-history':
        tabController.createTab('amiyo://history');
        break;
      case 'open-bookmarks':
        tabController.createTab('amiyo://bookmarks');
        break;
      case 'bookmark-current-tab':
        window.webContents.send('trigger-bookmark-current');
        break;
      case 'go-back':
        tabController.goBack();
        break;
      case 'go-forward':
        tabController.goForward();
        break;
    }
  }
}

module.exports = new WindowManager();

