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
      trafficLightPosition: process.platform === 'darwin' ? { x: 14, y: 14 } : undefined,
      title: isPrivate ? 'AETHER Browser (Private)' : 'AETHER Browser',
      backgroundColor: '#0B0F14',
      icon: path.join(__dirname, '..', 'assets', 'branding', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
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
        tabController.createTab('aether://newtab');
      }
    } else {
      tabController.createTab('aether://newtab');
    }

    this.windows.set(winId, {
      id: winId,
      window: win,
      tabController,
      isPrivate
    });

    // Window events
    if (process.env.AETHER_DEBUG === '1' || process.env.AETHER_DEBUG === 'true') {
      win.webContents.on('console-message', (event) => {
        const msg = event?.message || '';
        const lvl = event?.level || 0;
        const src = event?.sourceId || '';
        const line = event?.lineNumber || 0;
        console.log(`[Renderer] [${lvl}] ${msg} (${src}:${line})`);
      });
    }

    win.webContents.on('render-process-gone', (event, details) => {
      console.error(`[Renderer Crash] Reason: ${details.reason}, exitCode: ${details.exitCode}`);
    });

    win.on('resize', () => {
      if (tabController.requestUpdateActiveViewBounds) {
        tabController.requestUpdateActiveViewBounds(false);
      } else {
        tabController.updateActiveViewBounds();
      }
    });

    win.on('maximize', () => {
      if (tabController.requestUpdateActiveViewBounds) {
        tabController.requestUpdateActiveViewBounds(true);
      } else {
        tabController.updateActiveViewBounds();
      }
      win.webContents.send('window-maximized-changed', true);
    });

    win.on('unmaximize', () => {
      if (tabController.requestUpdateActiveViewBounds) {
        tabController.requestUpdateActiveViewBounds(true);
      } else {
        tabController.updateActiveViewBounds();
      }
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

    // Load shell HTML (with query param for immediate private mode detection)
    win.loadFile(path.join(__dirname, '..', 'src', 'index.html'), {
      query: isPrivate ? { private: '1' } : {}
    });

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
        tabController.createTab(payload.url || 'aether://newtab');
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
        tabController.createTab('aether://history');
        break;
      case 'open-bookmarks':
        tabController.createTab('aether://bookmarks');
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

  snapWindow(win, layout, workAreaOverride = null) {
    if (!win || (typeof win.isDestroyed === 'function' && win.isDestroyed())) return null;
    let screenModule = null;
    try {
      screenModule = require('electron').screen;
    } catch (e) {}

    let workArea = workAreaOverride || { x: 0, y: 0, width: 1920, height: 1040 };
    if (!workAreaOverride && screenModule && typeof screenModule.getDisplayMatching === 'function') {
      try {
        const currentBounds = win.getBounds ? win.getBounds() : { x: 0, y: 0, width: 1200, height: 800 };
        const display = screenModule.getDisplayMatching(currentBounds);
        if (display && display.workArea) {
          workArea = display.workArea;
        }
      } catch (e) {}
    }

    if (win.isMaximized && win.isMaximized()) {
      try { win.unmaximize(); } catch (e) {}
    }

    const { x, y, width, height } = workArea;
    const halfW = Math.round(width / 2);
    const halfH = Math.round(height / 2);
    const thirdW = Math.round(width / 3);
    const twoThirdsW = Math.round(width * 2 / 3);

    let targetBounds = null;
    switch (layout) {
      case 'left-half':
        targetBounds = { x, y, width: halfW, height };
        break;
      case 'right-half':
        targetBounds = { x: x + halfW, y, width: width - halfW, height };
        break;
      case 'left-two-thirds':
        targetBounds = { x, y, width: twoThirdsW, height };
        break;
      case 'right-one-third':
        targetBounds = { x: x + twoThirdsW, y, width: width - twoThirdsW, height };
        break;
      case 'left-third':
        targetBounds = { x, y, width: thirdW, height };
        break;
      case 'center-third':
        targetBounds = { x: x + thirdW, y, width: thirdW, height };
        break;
      case 'right-third':
        targetBounds = { x: x + 2 * thirdW, y, width: width - 2 * thirdW, height };
        break;
      case 'top-left':
        targetBounds = { x, y, width: halfW, height: halfH };
        break;
      case 'top-right':
        targetBounds = { x: x + halfW, y, width: width - halfW, height: halfH };
        break;
      case 'bottom-left':
        targetBounds = { x, y: y + halfH, width: halfW, height: height - halfH };
        break;
      case 'bottom-right':
        targetBounds = { x: x + halfW, y: y + halfH, width: width - halfW, height: height - halfH };
        break;
      case 'right-top-quarter':
        targetBounds = { x: x + halfW, y, width: width - halfW, height: halfH };
        break;
      case 'right-bottom-quarter':
        targetBounds = { x: x + halfW, y: y + halfH, width: width - halfW, height: height - halfH };
        break;
      case 'top-half':
        targetBounds = { x, y, width, height: halfH };
        break;
      case 'bottom-half':
        targetBounds = { x, y: y + halfH, width, height: height - halfH };
        break;
      case 'maximize':
        if (typeof win.maximize === 'function') win.maximize();
        return { layout, maximized: true };
      default:
        return null;
    }

    if (targetBounds && typeof win.setBounds === 'function') {
      win.setBounds(targetBounds, true);
      const info = this.getWindowInfo(win);
      if (info && info.tabController) {
        info.tabController.updateActiveViewBounds();
      }
    }
    return { layout, bounds: targetBounds };
  }
}

module.exports = new WindowManager();

