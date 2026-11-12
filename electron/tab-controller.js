const { WebContentsView } = require('electron');
const navigationController = require('./navigation-controller');
const storageManager = require('./storage-manager');
const menuManager = require('./menu-manager');

class TabController {
  constructor(windowManager, browserWindow, sessionInstance, isPrivate = false) {
    this.windowManager = windowManager;
    this.browserWindow = browserWindow;
    this.session = sessionInstance;
    this.isPrivate = isPrivate;

    this.tabs = [];
    this.activeTabId = null;
    this.recentlyClosed = [];
    this.topOffset = 84; // Header height
  }

  setTopOffset(offset) {
    this.topOffset = offset;
    this.updateActiveViewBounds();
  }

  getTabsSummary() {
    return this.tabs.map(t => ({
      id: t.id,
      url: t.url,
      title: t.title,
      favicon: t.favicon,
      isLoading: t.isLoading,
      canGoBack: t.canGoBack,
      canGoForward: t.canGoForward,
      isPinned: t.isPinned,
      isMuted: t.isMuted,
      isInternal: t.isInternal,
      zoomFactor: t.zoomFactor
    }));
  }

  getTab(id) {
    return this.tabs.find(t => t.id === id);
  }

  getActiveTab() {
    return this.getTab(this.activeTabId);
  }

  createTab(inputUrl = 'amiyo://newtab', options = {}) {
    const tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const resolvedUrl = navigationController.resolveUrl(inputUrl);
    const isInternal = navigationController.isInternalUrl(resolvedUrl);

    // Create the isolated WebContentsView
    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        session: this.session,
        backgroundThrottling: false
      }
    });

    const tab = {
      id: tabId,
      view: view,
      url: resolvedUrl,
      title: isInternal ? this.getInternalTitle(resolvedUrl) : 'Loading...',
      favicon: '',
      isLoading: !isInternal,
      canGoBack: false,
      canGoForward: false,
      isPinned: !!options.isPinned,
      isMuted: false,
      isInternal: isInternal,
      zoomFactor: 1.0
    };

    // Attach event listeners to WebContents
    const wc = view.webContents;

    wc.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[Tab ${tab.id}] [${level}] ${message} (${sourceId}:${line})`);
    });

    wc.on('render-process-gone', (event, details) => {
      console.error(`[Tab ${tab.id} Crash] Reason: ${details.reason}, exitCode: ${details.exitCode}`);
    });

    wc.on('did-start-loading', () => {
      tab.isLoading = true;
      this.notifyTabUpdated(tab);
    });

    wc.on('did-stop-loading', () => {
      tab.isLoading = false;
      tab.canGoBack = this.canGoBack(wc);
      tab.canGoForward = this.canGoForward(wc);
      this.notifyTabUpdated(tab);
    });

    wc.on('did-navigate', (event, navigatedUrl) => {
      if (navigatedUrl.startsWith('data:text/html')) {
        tab.canGoBack = this.canGoBack(wc);
        tab.canGoForward = this.canGoForward(wc);
        this.notifyTabUpdated(tab);
        return;
      }
      tab.url = navigatedUrl;
      tab.isInternal = navigationController.isInternalUrl(navigatedUrl);
      tab.canGoBack = this.canGoBack(wc);
      tab.canGoForward = this.canGoForward(wc);
      if (!tab.isInternal && !this.isPrivate) {
        storageManager.addHistory({
          title: tab.title || navigatedUrl,
          url: navigatedUrl,
          favicon: tab.favicon
        });
      }
      this.notifyTabUpdated(tab);
    });

    wc.on('did-navigate-in-page', (event, navigatedUrl) => {
      if (navigatedUrl.startsWith('data:text/html')) return;
      tab.url = navigatedUrl;
      tab.canGoBack = this.canGoBack(wc);
      tab.canGoForward = this.canGoForward(wc);
      this.notifyTabUpdated(tab);
    });

    wc.on('page-title-updated', (event, title) => {
      tab.title = title || 'Untitled';
      this.notifyTabUpdated(tab);
    });

    wc.on('page-favicon-updated', (event, favicons) => {
      if (favicons && favicons.length > 0) {
        tab.favicon = favicons[0];
        this.notifyTabUpdated(tab);
      }
    });

    wc.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      if (errorCode === -3) return; // ABORTED (e.g. redirected)
      tab.isLoading = false;
      tab.title = 'Page could not load';
      if (validatedURL && !validatedURL.startsWith('data:')) {
        tab.url = validatedURL;
      }
      this.notifyTabUpdated(tab);

      const safeUrl = (validatedURL || '').replace(/"/g, '&quot;');
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Page could not load</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background-color: #121316;
              color: #f3f4f6;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              user-select: none;
            }
            .error-card {
              max-width: 480px;
              text-align: center;
              padding: 36px;
              background: #18191d;
              border: 1px solid #292c34;
              border-radius: 12px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            }
            .error-icon {
              width: 48px;
              height: 48px;
              margin: 0 auto 16px;
              fill: #ef4444;
            }
            h1 {
              font-size: 18px;
              margin: 0 0 10px 0;
              color: #f3f4f6;
            }
            p {
              font-size: 13px;
              color: #9ca3af;
              line-height: 1.5;
              margin: 0 0 24px 0;
            }
            .btn {
              background: #6366f1;
              color: #fff;
              border: none;
              padding: 9px 20px;
              border-radius: 6px;
              font-size: 13px;
              cursor: pointer;
              font-weight: 500;
            }
            .btn:hover {
              background: #4f46e5;
            }
            .error-code {
              margin-top: 18px;
              font-size: 11px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="error-card">
            <svg class="error-icon" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <h1>This site can’t be reached</h1>
            <p>AMIYO Browser could not connect to <strong>${safeUrl}</strong>.<br>Please check your connection and try again.</p>
            <button class="btn" onclick="window.location.href='${safeUrl}'">Try Again</button>
            <div class="error-code">${errorDescription || 'Error'} (${errorCode})</div>
          </div>
        </body>
        </html>
      `;
      const base64Html = Buffer.from(errorHtml).toString('base64');
      setImmediate(() => {
        if (!wc.isDestroyed()) {
          wc.loadURL(`data:text/html;base64,${base64Html}`).catch(() => {});
        }
      });
    });

    // Handle new-window / target="_blank"
    wc.setWindowOpenHandler(({ url }) => {
      this.createTab(url, { active: true });
      return { action: 'deny' };
    });

    // Handle Find in Page
    wc.on('found-in-page', (event, result) => {
      this.windowManager.broadcast('found-in-page-result', {
        tabId: tab.id,
        activeMatchOrdinal: result.activeMatchOrdinal,
        matches: result.matches,
        selectionArea: result.selectionArea,
        finalUpdate: result.finalUpdate
      });
    });

    // Handle Context Menu on Web Content
    wc.on('context-menu', (event, params) => {
      menuManager.showContextMenu(this.browserWindow, this, params);
    });

    // Add view to window's contentView
    try {
      this.browserWindow.contentView.addChildView(view);
      view.setVisible(false);
    } catch (e) {
      console.error('Failed to attach child view:', e);
    }

    // Insert tab in list
    if (options.index !== undefined && options.index >= 0) {
      this.tabs.splice(options.index, 0, tab);
    } else {
      this.tabs.push(tab);
    }

    // Load initial URL if external
    if (!isInternal) {
      wc.loadURL(resolvedUrl).catch(err => {
        console.warn(`Initial load failed for ${resolvedUrl}:`, err.message);
      });
    }

    // Switch to tab if requested or if first tab
    if (options.active !== false || this.tabs.length === 1) {
      this.switchTab(tabId);
    } else {
      this.notifyTabsList();
    }

    return tab;
  }

  getInternalTitle(url) {
    if (url === 'amiyo://newtab') return 'New Tab';
    if (url === 'amiyo://history') return 'History';
    if (url === 'amiyo://bookmarks') return 'Bookmarks';
    if (url === 'amiyo://downloads') return 'Downloads';
    if (url === 'amiyo://settings') return 'Settings';
    return 'AMIYO Browser';
  }

  switchTab(tabId) {
    const targetTab = this.getTab(tabId);
    if (!targetTab) return;

    // Hide all other views
    for (const t of this.tabs) {
      if (t.id !== tabId && t.view) {
        try {
          t.view.setVisible(false);
        } catch (e) {}
      }
    }

    this.activeTabId = tabId;

    if (targetTab.isInternal) {
      try {
        targetTab.view.setVisible(false);
      } catch (e) {}
    } else {
      try {
        if (!this.browserWindow.contentView.children.includes(targetTab.view)) {
          this.browserWindow.contentView.addChildView(targetTab.view);
        }
        targetTab.view.setVisible(true);
        this.updateActiveViewBounds();
      } catch (e) {}
    }

    this.windowManager.broadcast('tab-switched', {
      activeTabId: tabId,
      tab: {
        id: targetTab.id,
        url: targetTab.url,
        title: targetTab.title,
        favicon: targetTab.favicon,
        isLoading: targetTab.isLoading,
        canGoBack: targetTab.canGoBack,
        canGoForward: targetTab.canGoForward,
        isPinned: targetTab.isPinned,
        isMuted: targetTab.isMuted,
        isInternal: targetTab.isInternal,
        zoomFactor: targetTab.zoomFactor
      }
    });

    this.notifyTabsList();
  }

  closeTab(tabId) {
    const index = this.tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    const [closedTab] = this.tabs.splice(index, 1);

    // Record for restore
    if (closedTab.url) {
      this.recentlyClosed.push({
        url: closedTab.url,
        title: closedTab.title,
        favicon: closedTab.favicon
      });
      if (this.recentlyClosed.length > 20) {
        this.recentlyClosed.shift();
      }
    }

    // Remove view from window and destroy
    if (closedTab.view) {
      try {
        this.browserWindow.contentView.removeChildView(closedTab.view);
        closedTab.view.webContents.close();
      } catch (e) {}
    }

    // If no tabs left, open a new tab
    if (this.tabs.length === 0) {
      this.createTab('amiyo://newtab');
      return;
    }

    // If active tab was closed, select adjacent tab
    if (this.activeTabId === tabId) {
      const nextIndex = Math.min(index, this.tabs.length - 1);
      this.switchTab(this.tabs[nextIndex].id);
    } else {
      this.notifyTabsList();
    }
  }

  restoreClosedTab() {
    if (this.recentlyClosed.length > 0) {
      const lastClosed = this.recentlyClosed.pop();
      return this.createTab(lastClosed.url, { active: true });
    }
    return null;
  }

  duplicateTab(tabId) {
    const tab = this.getTab(tabId);
    if (tab) {
      const index = this.tabs.findIndex(t => t.id === tabId);
      return this.createTab(tab.url, { index: index + 1, active: true });
    }
    return null;
  }

  reorderTabs(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.tabs.length || toIndex < 0 || toIndex >= this.tabs.length) {
      return;
    }
    const [movedTab] = this.tabs.splice(fromIndex, 1);
    this.tabs.splice(toIndex, 0, movedTab);
    this.notifyTabsList();
  }

  pinTab(tabId, isPinned) {
    const tab = this.getTab(tabId);
    if (tab) {
      tab.isPinned = isPinned !== undefined ? isPinned : !tab.isPinned;
      this.notifyTabUpdated(tab);
      this.notifyTabsList();
    }
  }

  muteTab(tabId, isMuted) {
    const tab = this.getTab(tabId);
    if (tab && tab.view) {
      tab.isMuted = isMuted !== undefined ? isMuted : !tab.isMuted;
      tab.view.webContents.setAudioMuted(tab.isMuted);
      this.notifyTabUpdated(tab);
    }
  }

  navigateTab(tabId, inputUrl) {
    const tab = this.getTab(tabId);
    if (!tab) return;

    const resolvedUrl = navigationController.resolveUrl(inputUrl);
    const isInternal = navigationController.isInternalUrl(resolvedUrl);

    tab.url = resolvedUrl;
    tab.isInternal = isInternal;

    if (isInternal) {
      tab.title = this.getInternalTitle(resolvedUrl);
      tab.isLoading = false;
      try {
        tab.view.setVisible(false);
      } catch (e) {}
      this.notifyTabUpdated(tab);
    } else {
      tab.title = 'Loading...';
      tab.isLoading = true;
      if (this.activeTabId === tabId) {
        try {
          if (!this.browserWindow.contentView.children.includes(tab.view)) {
            this.browserWindow.contentView.addChildView(tab.view);
          }
          tab.view.setVisible(true);
          this.updateActiveViewBounds();
        } catch (e) {}
      }
      this.notifyTabUpdated(tab);
      tab.view.webContents.loadURL(resolvedUrl).catch(err => {
        console.warn(`Failed loading ${resolvedUrl}:`, err.message);
      });
    }
  }

  canGoBack(wc) {
    if (!wc) return false;
    return wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack();
  }

  canGoForward(wc) {
    if (!wc) return false;
    return wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward();
  }

  goBack(tabId) {
    const tab = this.getTab(tabId || this.activeTabId);
    if (tab && tab.view && !tab.isInternal && this.canGoBack(tab.view.webContents)) {
      tab.view.webContents.goBack();
    }
  }

  goForward(tabId) {
    const tab = this.getTab(tabId || this.activeTabId);
    if (tab && tab.view && !tab.isInternal && this.canGoForward(tab.view.webContents)) {
      tab.view.webContents.goForward();
    }
  }

  reload(tabId, ignoreCache = false) {
    const tab = this.getTab(tabId || this.activeTabId);
    if (tab && tab.view && !tab.isInternal) {
      if (ignoreCache) {
        tab.view.webContents.reloadIgnoringCache();
      } else {
        tab.view.webContents.reload();
      }
    }
  }

  stop(tabId) {
    const tab = this.getTab(tabId || this.activeTabId);
    if (tab && tab.view && !tab.isInternal) {
      tab.view.webContents.stop();
      tab.isLoading = false;
      this.notifyTabUpdated(tab);
    }
  }

  setZoom(tabId, zoomFactor) {
    const tab = this.getTab(tabId || this.activeTabId);
    if (tab && tab.view && !tab.isInternal) {
      tab.zoomFactor = Math.max(0.25, Math.min(3.0, zoomFactor));
      tab.view.webContents.setZoomFactor(tab.zoomFactor);
      this.notifyTabUpdated(tab);
    }
  }

  findInPage(tabId, text, options = {}) {
    const tab = this.getTab(tabId || this.activeTabId);
    if (tab && tab.view && !tab.isInternal) {
      return tab.view.webContents.findInPage(text, options);
    }
  }

  stopFindInPage(tabId, action = 'clearSelection') {
    const tab = this.getTab(tabId || this.activeTabId);
    if (tab && tab.view && !tab.isInternal) {
      tab.view.webContents.stopFindInPage(action);
    }
  }

  updateActiveViewBounds() {
    const activeTab = this.getActiveTab();
    if (!activeTab || !activeTab.view || activeTab.isInternal) {
      return;
    }

    try {
      const [width, height] = this.browserWindow.getContentSize();
      const offset = typeof this.topOffset === 'number' && this.topOffset > 0 ? this.topOffset : 84;
      const viewBounds = {
        x: 0,
        y: offset,
        width: width,
        height: Math.max(0, height - offset)
      };
      activeTab.view.setBounds(viewBounds);
    } catch (e) {
      console.error('Error updating view bounds:', e);
    }
  }

  notifyTabsList() {
    this.windowManager.broadcast('tabs-updated', {
      tabs: this.getTabsSummary(),
      activeTabId: this.activeTabId
    });
  }

  notifyTabUpdated(tab) {
    this.windowManager.broadcast('tab-updated', {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      favicon: tab.favicon,
      isLoading: tab.isLoading,
      canGoBack: tab.canGoBack,
      canGoForward: tab.canGoForward,
      isPinned: tab.isPinned,
      isMuted: tab.isMuted,
      isInternal: tab.isInternal,
      zoomFactor: tab.zoomFactor
    });
  }

  destroyAll() {
    for (const tab of this.tabs) {
      if (tab.view) {
        try {
          this.browserWindow.contentView.removeChildView(tab.view);
          tab.view.webContents.close();
        } catch (e) {}
      }
    }
    this.tabs = [];
  }
}

module.exports = TabController;

