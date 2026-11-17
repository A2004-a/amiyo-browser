const { WebContentsView } = require('electron');
const navigationController = require('./navigation-controller');
const storageManager = require('./storage-manager');
const menuManager = require('./menu-manager');
const shieldsController = require('./shields-controller');

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
    this.leftOffset = 0; // Vertical tabs sidebar offset
    this.sideOffset = 0; // AI sidebar offset
    this.isViewVisible = true; // WebContentsView visibility flag
    this.splitTabId = null; // Split view dual display
    this.splitRatio = 0.5; // Split view ratio (left pane proportion, default 50/50)
    this.groups = new Map(); // groupId -> { id, title, color, isCollapsed }
    this._isSessionDirty = true;
    this._updateBoundsTimer = null;

    // Automatic Memory Saver / Inactive Tab Suspension sweep
    this._memorySaverInterval = setInterval(() => {
      this.checkAndSuspendInactiveTabs();
    }, 60000);

    // Auto-Save Session Crash Recovery Daemon
    this._sessionBackupInterval = setInterval(() => {
      this.backupSessionState();
    }, 30000);
  }

  requestUpdateActiveViewBounds(immediate = false) {
    if (immediate) {
      if (this._updateBoundsTimer) {
        clearTimeout(this._updateBoundsTimer);
        this._updateBoundsTimer = null;
      }
      this.updateActiveViewBounds();
      return;
    }
    if (this._updateBoundsTimer) return;
    this._updateBoundsTimer = setTimeout(() => {
      this._updateBoundsTimer = null;
      this.updateActiveViewBounds();
    }, 16); // 60fps frame rate throttle (16ms)
  }

  backupSessionState() {
    if (this.isPrivate || !this._isSessionDirty) return;
    this._isSessionDirty = false;
    try {
      const state = {
        timestamp: Date.now(),
        activeTabId: this.activeTabId,
        tabs: this.tabs.map(t => ({
          url: t.url,
          title: t.title,
          isPinned: t.isPinned,
          groupId: t.groupId,
          zoomFactor: t.zoomFactor
        }))
      };
      if (storageManager.saveSessionBackup) {
        storageManager.saveSessionBackup(state);
      }
    } catch (e) {}
  }

  checkAndSuspendInactiveTabs() {
    try {
      const settings = storageManager.getSettings();
      if (settings && settings.memorySaver === false) return;

      const timeoutMinutes = (settings && settings.memorySaverTimeout) ? Number(settings.memorySaverTimeout) : 15;
      const thresholdMs = timeoutMinutes * 60 * 1000;
      const now = Date.now();

      for (const tab of this.tabs) {
        if (tab.id !== this.activeTabId &&
            tab.id !== this.splitTabId &&
            !tab.isInternal &&
            !tab.isPinned &&
            !tab.isPlayingAudio &&
            !tab.isSuspended &&
            tab.view) {
          if (now - (tab.lastAccessed || 0) > thresholdMs) {
            this.suspendTab(tab.id);
          }
        }
      }
    } catch (e) {
      console.warn('Memory saver sweep error:', e.message);
    }
  }

  setTopOffset(offset) {
    this.topOffset = offset;
    this.requestUpdateActiveViewBounds(false);
  }

  setLeftOffset(offset) {
    this.leftOffset = typeof offset === 'number' && offset >= 0 ? offset : 0;
    this.requestUpdateActiveViewBounds(false);
  }

  setActiveViewVisible(visible) {
    this.isViewVisible = !!visible;
    const activeTab = this.getActiveTab();
    if (activeTab && activeTab.view && !activeTab.isInternal) {
      try {
        if (!this.isViewVisible) {
          try { activeTab.view.setVisible(false); } catch (e) {}
          activeTab.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
        } else {
          try { activeTab.view.setVisible(true); } catch (e) {}
          this.updateActiveViewBounds();
        }
      } catch (e) {
        console.error('Error setting active view bounds:', e);
      }
    }
    if (this.splitTabId) {
      const splitTab = this.getTab(this.splitTabId);
      if (splitTab && splitTab.view && !splitTab.isInternal) {
        try {
          if (!this.isViewVisible) {
            try { splitTab.view.setVisible(false); } catch (e) {}
            splitTab.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
          } else {
            try { splitTab.view.setVisible(true); } catch (e) {}
            this.updateActiveViewBounds();
          }
        } catch (e) {}
      }
    }
  }

  cycleTab(direction = 1) {
    if (this.tabs.length <= 1) return;
    const currentIndex = this.tabs.findIndex(t => t.id === this.activeTabId);
    let nextIndex = (currentIndex + direction) % this.tabs.length;
    if (nextIndex < 0) nextIndex = this.tabs.length - 1;
    this.switchTab(this.tabs[nextIndex].id);
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
      zoomFactor: t.zoomFactor,
      groupId: t.groupId || null,
      isSuspended: !!t.isSuspended,
      isMobileMode: !!t.isMobileMode,
      lastAccessed: t.lastAccessed || Date.now()
    }));
  }

  getAllTabs() {
    return this.tabs || [];
  }

  getTab(id) {
    return this.tabs.find(t => t.id === id);
  }

  getActiveTab() {
    return this.getTab(this.activeTabId);
  }

  createTab(inputUrl = 'aether://newtab', options = {}) {
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
      isPlayingAudio: false,
      isInternal: isInternal,
      zoomFactor: 1.0,
      groupId: options.groupId || null,
      isSuspended: false,
      isMobileMode: !!options.isMobileMode,
      lastAccessed: Date.now()
    };

    // Attach event listeners to WebContents
    this.setupTabListeners(tab, view.webContents);

    // Add view to window's contentView
    try {
      this.browserWindow.contentView.addChildView(view);
      try { view.setVisible(false); } catch (e) {}
      view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    } catch (e) {
      console.error('Failed to attach child view:', e);
    }

    // Insert tab in list
    this._isSessionDirty = true;
    if (options.index !== undefined && options.index >= 0) {
      this.tabs.splice(options.index, 0, tab);
    } else {
      this.tabs.push(tab);
    }

    // Load initial URL if external
    if (!isInternal) {
      view.webContents.loadURL(resolvedUrl).catch(err => {
        console.warn(`Initial load failed for ${resolvedUrl}:`, err.message);
      });
    }

    // Switch to tab if requested or if first tab
    if (options.active !== false || this.tabs.length === 1) {
      this.isViewVisible = true;
      this.switchTab(tabId);
    } else {
      this.notifyTabsList();
    }

    return tab;
  }

  setupTabListeners(tab, wc) {
    if (!wc || !tab) return;

    if (process.env.AETHER_DEBUG === '1' || process.env.AETHER_DEBUG === 'true') {
      wc.on('console-message', (event) => {
        const msg = event?.message || '';
        const lvl = event?.level || 0;
        const src = event?.sourceId || '';
        const line = event?.lineNumber || 0;
        console.log(`[Tab ${tab.id}] [${lvl}] ${msg} (${src}:${line})`);
      });
    }

    wc.on('render-process-gone', (event, details) => {
      console.error(`[Tab ${tab.id} Crash] Reason: ${details.reason}, exitCode: ${details.exitCode}`);
    });

    wc.on('did-start-loading', () => {
      tab.isLoading = true;
      tab.lastAccessed = Date.now();
      this.notifyTabUpdated(tab);
    });

    wc.on('did-stop-loading', () => {
      tab.isLoading = false;
      tab.canGoBack = this.canGoBack(wc);
      tab.canGoForward = this.canGoForward(wc);
      if (!tab.isInternal && this.activeTabId === tab.id && tab.view) {
        this.isViewVisible = true;
        try {
          if (!this.browserWindow.contentView.children.includes(tab.view)) {
            this.browserWindow.contentView.addChildView(tab.view);
          }
          try { tab.view.setVisible(true); } catch (e) {}
          this.updateActiveViewBounds();
        } catch (e) {}
      }
      this.notifyTabUpdated(tab);
    });

    wc.on('media-started-playing', () => {
      tab.isPlayingAudio = true;
      this.notifyTabUpdated(tab);
    });

    wc.on('media-paused', () => {
      tab.isPlayingAudio = false;
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
      tab.lastAccessed = Date.now();

      // Restore saved host zoom
      if (!tab.isInternal && navigatedUrl.startsWith('http')) {
        try {
          const u = new URL(navigatedUrl);
          const savedZoom = storageManager.getHostZoom(u.hostname);
          if (savedZoom && savedZoom !== 100) {
            tab.zoomFactor = savedZoom / 100;
            wc.setZoomFactor(tab.zoomFactor);
          } else if (!tab.zoomFactor) {
            tab.zoomFactor = 1.0;
          }
        } catch (e) {}
      }
      if (!tab.isInternal && this.activeTabId === tab.id && tab.view) {
        this.isViewVisible = true;
        try {
          if (!this.browserWindow.contentView.children.includes(tab.view)) {
            this.browserWindow.contentView.addChildView(tab.view);
          }
          try { tab.view.setVisible(true); } catch (e) {}
        } catch (e) {}
        this.updateActiveViewBounds();
      }
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
      tab.lastAccessed = Date.now();
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

    wc.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      // Ignore subframe/iframe failures (e.g. ad trackers or blocked scripts)
      if (isMainFrame === false) return;
      // Ignore normal aborts/redirects/clean states
      if (errorCode === -3 || errorCode === 0) return;
      if (!validatedURL || validatedURL === 'about:blank' || validatedURL.startsWith('data:')) return;

      tab.isLoading = false;
      tab.title = 'Page could not load';
      if (validatedURL && !validatedURL.startsWith('data:')) {
        tab.url = validatedURL;
      }
      this.notifyTabUpdated(tab);

      const safeUrl = (validatedURL || '').replace(/"/g, '&quot;').replace(/'/g, "\\'");
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Page could not load</title>
          <style>
            body {
              margin: 0; padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background-color: #0B0F14; color: #DCE3EB;
              display: flex; align-items: center; justify-content: center;
              height: 100vh; user-select: none;
            }
            .error-card {
              max-width: 480px; text-align: center; padding: 36px;
              background: #121B2B; border: 1px solid rgba(220, 227, 235, 0.12); border-radius: 12px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.6);
            }
            .error-icon { width: 48px; height: 48px; margin: 0 auto 16px; fill: #F43F5E; }
            h1 { font-size: 18px; margin: 0 0 10px 0; color: #DCE3EB; font-weight: 600; }
            p { font-size: 13px; color: #8FA3B8; line-height: 1.5; margin: 0 0 24px 0; word-break: break-all; }
            .btn { background: #35D8F2; color: #0B0F14; border: none; padding: 10px 24px; border-radius: 8px; font-size: 13px; cursor: pointer; font-weight: 600; transition: opacity 0.15s ease; }
            .btn:hover { opacity: 0.9; }
            .error-code { margin-top: 18px; font-size: 11px; color: #5B6E84; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="error-card">
            <svg class="error-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            <h1>This site can’t be reached</h1>
            <p>AETHER Browser could not connect to <strong>${safeUrl}</strong>.<br>Please check your connection and try again.</p>
            <button class="btn" id="retry-btn">Try Again</button>
            <div class="error-code">${errorDescription || 'Error'} (${errorCode})</div>
          </div>
          <script>
            document.getElementById('retry-btn')?.addEventListener('click', () => {
              window.location.replace('${safeUrl}');
            });
          </script>
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

    wc.on('will-navigate', (event, targetUrl) => {
      if (!targetUrl) return;
      const lower = targetUrl.toLowerCase();
      if (lower.startsWith('aether://') || lower.startsWith('amiyo://') || lower.startsWith('file://') || lower.startsWith('javascript:')) {
        console.warn(`[Security] Blocked unauthorized will-navigate to ${targetUrl} from tab ${tab.id}`);
        event.preventDefault();
        return;
      }
    });

    wc.on('will-redirect', (event, targetUrl) => {
      if (!targetUrl) return;
      const lower = targetUrl.toLowerCase();
      if (lower.startsWith('aether://') || lower.startsWith('amiyo://') || lower.startsWith('file://') || lower.startsWith('javascript:')) {
        console.warn(`[Security] Blocked unauthorized will-redirect to ${targetUrl} from tab ${tab.id}`);
        event.preventDefault();
        return;
      }
    });

    wc.setWindowOpenHandler(({ url }) => {
      if (!url) return { action: 'deny' };
      const lower = url.toLowerCase();
      if (lower.startsWith('aether://') || lower.startsWith('amiyo://') || lower.startsWith('file://') || lower.startsWith('javascript:')) {
        console.warn(`[Security] Blocked window.open attempt to ${url}`);
        return { action: 'deny' };
      }
      if (lower.startsWith('http://') || lower.startsWith('https://')) {
        this.createTab(url, { active: true });
      }
      return { action: 'deny' };
    });

    wc.on('found-in-page', (event, result) => {
      this.windowManager.broadcast('found-in-page-result', {
        tabId: tab.id,
        activeMatchOrdinal: result.activeMatchOrdinal,
        matches: result.matches,
        selectionArea: result.selectionArea,
        finalUpdate: result.finalUpdate
      });
    });

    wc.on('context-menu', (event, params) => {
      menuManager.showContextMenu(this.browserWindow, this, params);
    });

    // Brave Shields: Cosmetic Ad Hiding + YouTube Defuser + Anti-AdBlock Scriptlet
    const injectShields = () => {
      if (!tab.isInternal && shieldsController.enabled && !shieldsController.isSiteWhitelisted(tab.url)) {
        wc.insertCSS(shieldsController.getCosmeticCss(), { cssOrigin: 'user' }).catch(() => {});
        wc.executeJavaScript(shieldsController.getInPageScriptlet()).catch(() => {});
      }
    };

    wc.on('dom-ready', injectShields);
    wc.on('did-navigate-in-page', injectShields);
    wc.on('did-finish-load', injectShields);
    wc.on('did-frame-finish-load', (e, isMainFrame) => {
      if (isMainFrame) injectShields();
    });

    // Universal In-Page Keyboard Shortcuts (Forward events from webview)
    wc.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;
      const isCtrlOrCmd = input.control || input.meta;

      // Ctrl + T: New Tab
      if (isCtrlOrCmd && !input.shift && !input.alt && input.key.toLowerCase() === 't') {
        event.preventDefault();
        this.createTab('aether://newtab', { active: true });
        return;
      }

      // Ctrl + Shift + T: Restore Tab
      if (isCtrlOrCmd && input.shift && !input.alt && input.key.toLowerCase() === 't') {
        event.preventDefault();
        this.restoreClosedTab();
        return;
      }

      // Ctrl + W: Close Active Tab
      if (isCtrlOrCmd && !input.shift && !input.alt && input.key.toLowerCase() === 'w') {
        event.preventDefault();
        this.closeTab(tab.id);
        return;
      }

      // Ctrl + R / F5: Reload
      if ((isCtrlOrCmd && !input.shift && input.key.toLowerCase() === 'r') || input.key === 'F5') {
        event.preventDefault();
        this.reload(tab.id, false);
        return;
      }

      // Ctrl + Shift + R: Force Reload
      if (isCtrlOrCmd && input.shift && input.key.toLowerCase() === 'r') {
        event.preventDefault();
        this.reload(tab.id, true);
        return;
      }

      // Ctrl + F: Find in Page
      if (isCtrlOrCmd && !input.shift && input.key.toLowerCase() === 'f') {
        event.preventDefault();
        this.browserWindow.webContents.send('trigger-find-in-page');
        return;
      }

      // Ctrl + L / Alt + D / F6: Focus Omnibox
      if ((isCtrlOrCmd && input.key.toLowerCase() === 'l') || (input.alt && input.key.toLowerCase() === 'd') || input.key === 'F6') {
        event.preventDefault();
        this.browserWindow.webContents.send('trigger-focus-omnibox');
        return;
      }

      // Ctrl + H: History
      if (isCtrlOrCmd && !input.shift && input.key.toLowerCase() === 'h') {
        event.preventDefault();
        this.createTab('aether://history', { active: true });
        return;
      }

      // Ctrl + J: Downloads
      if (isCtrlOrCmd && !input.shift && input.key.toLowerCase() === 'j') {
        event.preventDefault();
        this.createTab('aether://downloads', { active: true });
        return;
      }

      // Ctrl + D: Bookmark Current Tab
      if (isCtrlOrCmd && !input.shift && input.key.toLowerCase() === 'd') {
        event.preventDefault();
        this.browserWindow.webContents.send('trigger-bookmark-current');
        return;
      }

      // Ctrl + Shift + A: Search Tabs
      if (isCtrlOrCmd && input.shift && input.key.toLowerCase() === 'a') {
        event.preventDefault();
        this.browserWindow.webContents.send('trigger-tab-search');
        return;
      }

      // Ctrl + Shift + S: Web Capture
      if (isCtrlOrCmd && input.shift && input.key.toLowerCase() === 's') {
        event.preventDefault();
        this.browserWindow.webContents.send('trigger-web-capture');
        return;
      }

      // Ctrl + P: Print Page
      if (isCtrlOrCmd && !input.shift && input.key.toLowerCase() === 'p') {
        event.preventDefault();
        wc.print();
        return;
      }

      // F11: Toggle Fullscreen
      if (input.key === 'F11') {
        event.preventDefault();
        this.browserWindow.setFullScreen(!this.browserWindow.isFullScreen());
        return;
      }

      // Ctrl + Tab / Ctrl + PageDown: Next Tab
      if (isCtrlOrCmd && !input.shift && (input.key === 'Tab' || input.key === 'PageDown')) {
        event.preventDefault();
        this.cycleTab(1);
        return;
      }

      // Ctrl + Shift + Tab / Ctrl + PageUp: Prev Tab
      if (isCtrlOrCmd && (input.shift && input.key === 'Tab' || input.key === 'PageUp')) {
        event.preventDefault();
        this.cycleTab(-1);
        return;
      }

      // Ctrl + 1..8: Jump to Tab
      if (isCtrlOrCmd && !input.shift && input.key >= '1' && input.key <= '8') {
        const idx = parseInt(input.key, 10) - 1;
        if (this.tabs[idx]) {
          event.preventDefault();
          this.switchTab(this.tabs[idx].id);
          return;
        }
      }

      // Ctrl + 9: Jump to Last Tab
      if (isCtrlOrCmd && !input.shift && input.key === '9') {
        if (this.tabs.length > 0) {
          event.preventDefault();
          this.switchTab(this.tabs[this.tabs.length - 1].id);
          return;
        }
      }

      // Ctrl + Plus / = : Zoom In
      if (isCtrlOrCmd && (input.key === '+' || input.key === '=')) {
        event.preventDefault();
        this.setZoom(tab.id, Math.min(3.0, (tab.zoomFactor || 1.0) + 0.1));
        return;
      }

      // Ctrl + - : Zoom Out
      if (isCtrlOrCmd && input.key === '-') {
        event.preventDefault();
        this.setZoom(tab.id, Math.max(0.25, (tab.zoomFactor || 1.0) - 0.1));
        return;
      }

      // Ctrl + 0 : Reset Zoom
      if (isCtrlOrCmd && input.key === '0') {
        event.preventDefault();
        this.setZoom(tab.id, 1.0);
        return;
      }
    });
  }

  getInternalTitle(url) {
    if (url === 'amiyo://newtab' || url === 'aether://newtab') return 'New Tab';
    if (url === 'amiyo://history' || url === 'aether://history') return 'History';
    if (url === 'amiyo://bookmarks' || url === 'aether://bookmarks') return 'Bookmarks';
    if (url === 'amiyo://downloads' || url === 'aether://downloads') return 'Downloads';
    if (url === 'amiyo://settings' || url === 'aether://settings') return 'Settings';
    return 'AETHER Browser';
  }

  switchTab(tabId) {
    const targetTab = this.getTab(tabId);
    if (!targetTab) return;

    targetTab.lastAccessed = Date.now();

    // If tab is suspended, automatically restore it
    if (targetTab.isSuspended) {
      this.resumeTab(tabId);
    }

    // Hide all other views except split tab
    for (const t of this.tabs) {
      if (t.id !== tabId && t.id !== this.splitTabId && t.view) {
        try {
          try { t.view.setVisible(false); } catch (e) {}
          t.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
        } catch (e) {}
      }
    }

    this.activeTabId = tabId;

    if (targetTab.isInternal) {
      try {
        if (targetTab.view) {
          try { targetTab.view.setVisible(false); } catch (e) {}
          targetTab.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
        }
      } catch (e) {}
    } else if (targetTab.view) {
      this.isViewVisible = true;
      try {
        if (!this.browserWindow.contentView.children.includes(targetTab.view)) {
          this.browserWindow.contentView.addChildView(targetTab.view);
        }
        try { targetTab.view.setVisible(true); } catch (e) {}
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
        zoomFactor: targetTab.zoomFactor,
        groupId: targetTab.groupId || null,
        isSuspended: !!targetTab.isSuspended,
        isMobileMode: !!targetTab.isMobileMode
      }
    });

    this.notifyTabsList();
  }

  suspendTab(tabId) {
    const tab = this.getTab(tabId);
    if (!tab || tab.isSuspended || tab.isInternal || tab.isPinned || tab.isPlayingAudio) {
      return false;
    }
    if (tab.id === this.activeTabId || tab.id === this.splitTabId) {
      return false;
    }

    if (tab.view) {
      try {
        this.browserWindow.contentView.removeChildView(tab.view);
        tab.view.webContents.close();
      } catch (e) {}
      tab.view = null;
    }

    tab.isSuspended = true;
    this.notifyTabUpdated(tab);
    this.notifyTabsList();
    return true;
  }

  resumeTab(tabId) {
    const tab = this.getTab(tabId);
    if (!tab || !tab.isSuspended) return;

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

    tab.view = view;
    tab.isSuspended = false;
    tab.isLoading = !tab.isInternal;
    tab.lastAccessed = Date.now();

    this.setupTabListeners(tab, view.webContents);

    try {
      this.browserWindow.contentView.addChildView(view);
      if (tab.id !== this.activeTabId && tab.id !== this.splitTabId) {
        view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
      }
    } catch (e) {}

    if (!tab.isInternal) {
      view.webContents.loadURL(tab.url).catch(() => {});
    }

    this.notifyTabUpdated(tab);
    this.notifyTabsList();
    this.updateActiveViewBounds();
  }

  // --- Tab Groups ---
  createGroup({ id, title, name, color, tabIds } = {}) {
    const groupId = id || `group_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const group = {
      id: groupId,
      title: title || name || 'New Group',
      color: color || '#6366f1',
      isCollapsed: false
    };
    this.groups.set(groupId, group);

    if (Array.isArray(tabIds)) {
      for (const tid of tabIds) {
        const tab = this.getTab(tid);
        if (tab) tab.groupId = groupId;
      }
      this.notifyTabsList();
    }

    this.notifyGroupsUpdated();
    return group;
  }

  updateGroup(groupId, updates = {}) {
    const group = this.groups.get(groupId);
    if (!group) return null;
    if (updates.title !== undefined) group.title = updates.title;
    if (updates.color !== undefined) group.color = updates.color;
    if (updates.isCollapsed !== undefined) group.isCollapsed = !!updates.isCollapsed;
    this.notifyGroupsUpdated();
    return group;
  }

  deleteGroup(groupId) {
    this.groups.delete(groupId);
    for (const t of this.tabs) {
      if (t.groupId === groupId) {
        t.groupId = null;
      }
    }
    this.notifyGroupsUpdated();
    this.notifyTabsList();
    return true;
  }

  setTabGroup(tabId, groupId) {
    const tab = this.getTab(tabId);
    if (!tab) return false;
    tab.groupId = groupId || null;
    this.notifyTabUpdated(tab);
    this.notifyTabsList();
    return true;
  }

  getGroups() {
    return Array.from(this.groups.values());
  }

  notifyGroupsUpdated() {
    this.windowManager.broadcast('tab-groups-updated', {
      groups: this.getGroups()
    });
  }

  // --- Split Screen Dual View ---
  setSplitTab(tabId) {
    if (!tabId || tabId === this.activeTabId) {
      this.closeSplitTab();
      return;
    }
    const targetTab = this.getTab(tabId);
    if (!targetTab) return;

    if (targetTab.isSuspended) {
      this.resumeTab(tabId);
    }

    if (targetTab.view && !this.browserWindow.contentView.children.includes(targetTab.view)) {
      try {
        this.browserWindow.contentView.addChildView(targetTab.view);
      } catch (e) {}
    }

    this.splitTabId = tabId;
    this.updateActiveViewBounds();
    this.windowManager.broadcast('split-view-changed', {
      splitTabId: this.splitTabId,
      ratio: this.splitRatio || 0.5,
      activeTabId: this.activeTabId
    });
  }

  setSplitRatio(ratio) {
    if (typeof ratio !== 'number' || isNaN(ratio)) return;
    this.splitRatio = Math.max(0.2, Math.min(0.8, ratio));
    this.updateActiveViewBounds();
    this.windowManager.broadcast('split-view-changed', {
      splitTabId: this.splitTabId,
      ratio: this.splitRatio,
      activeTabId: this.activeTabId
    });
  }

  swapSplitTabs() {
    if (!this.splitTabId) return;
    const oldActiveId = this.activeTabId;
    const oldSplitId = this.splitTabId;
    this.activeTabId = oldSplitId;
    this.splitTabId = oldActiveId;
    this.updateActiveViewBounds();
    const newActiveTab = this.getTab(this.activeTabId);
    this.windowManager.broadcast('tab-switched', {
      activeTabId: this.activeTabId,
      tab: newActiveTab
    });
    this.windowManager.broadcast('split-view-changed', {
      splitTabId: this.splitTabId,
      ratio: this.splitRatio || 0.5,
      activeTabId: this.activeTabId
    });
  }

  focusSplitTab(tabId) {
    if (!this.splitTabId) return;
    if (tabId === this.splitTabId) {
      this.swapSplitTabs();
    }
  }

  closeSplitTab() {
    if (!this.splitTabId) return;
    const oldSplit = this.getTab(this.splitTabId);
    if (oldSplit && oldSplit.view && oldSplit.id !== this.activeTabId) {
      try {
        oldSplit.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
      } catch (e) {}
    }
    this.splitTabId = null;
    this.updateActiveViewBounds();
    this.windowManager.broadcast('split-view-changed', {
      splitTabId: null,
      ratio: this.splitRatio || 0.5,
      activeTabId: this.activeTabId
    });
  }

  getSplitTabId() {
    return this.splitTabId;
  }

  closeTab(tabId) {
    const index = this.tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    if (this.splitTabId === tabId) {
      this.splitTabId = null;
      this.windowManager.broadcast('split-view-changed', { splitTabId: null });
    }

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

    // High-Performance V8 Memory Reclaim Engine
    if (typeof global.gc === 'function') {
      try { global.gc(); } catch (e) {}
    }

    // If no tabs left, open a new tab
    if (this.tabs.length === 0) {
      this.createTab('aether://newtab');
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
        if (tab.view) {
          try { tab.view.setVisible(false); } catch (e) {}
          tab.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
        }
      } catch (e) {}
      this.notifyTabUpdated(tab);
    } else {
      this.isViewVisible = true;
      tab.title = 'Loading...';
      tab.isLoading = true;
      if (this.activeTabId === tabId) {
        try {
          if (!this.browserWindow.contentView.children.includes(tab.view)) {
            this.browserWindow.contentView.addChildView(tab.view);
          }
          try { tab.view.setVisible(true); } catch (e) {}
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
      try {
        tab.view.webContents.setZoomFactor(tab.zoomFactor);
      } catch (e) {}

      // Persist per-host zoom
      try {
        if (tab.url && tab.url.startsWith('http')) {
          const u = new URL(tab.url);
          storageManager.setHostZoom(u.hostname, Math.round(tab.zoomFactor * 100));
        }
      } catch (e) {}

      this.notifyTabUpdated(tab);
    }
  }

  async printToPdf(tabId, customPath) {
    const tab = this.getTab(tabId || this.activeTabId);
    if (!tab || !tab.view || tab.isInternal) return { success: false, error: 'No printable tab' };
    try {
      const data = await tab.view.webContents.printToPDF({
        printBackground: true,
        margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 }
      });
      let targetPath = customPath;
      if (!targetPath) {
        const { dialog } = require('electron');
        const defaultName = `${(tab.title || 'webpage').replace(/[/\\?%*:|"<>]/g, '_')}.pdf`;
        const res = await dialog.showSaveDialog(this.browserWindow, {
          title: 'Save Webpage as PDF',
          defaultPath: defaultName,
          filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
        });
        if (res.canceled || !res.filePath) return { success: false, canceled: true };
        targetPath = res.filePath;
      }
      const fs = require('fs');
      fs.writeFileSync(targetPath, data);
      return { success: true, filePath: targetPath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  closeOtherTabs(tabId) {
    const targetId = tabId || this.activeTabId;
    const toClose = this.tabs.filter(t => t.id !== targetId && !t.isPinned);
    toClose.forEach(t => this.closeTab(t.id));
  }

  closeOthers(tabId) {
    return this.closeOtherTabs(tabId);
  }

  closeTabsToRight(tabId) {
    const targetId = tabId || this.activeTabId;
    const idx = this.tabs.findIndex(t => t.id === targetId);
    if (idx !== -1) {
      const toClose = this.tabs.slice(idx + 1).filter(t => !t.isPinned);
      toClose.forEach(t => this.closeTab(t.id));
    }
  }

  closeMultipleTabs(tabIds) {
    if (!Array.isArray(tabIds)) return;
    tabIds.forEach(id => this.closeTab(id));
  }

  muteMultipleTabs(tabIds, isMuted = true) {
    if (!Array.isArray(tabIds)) return;
    tabIds.forEach(id => this.muteTab(id, isMuted));
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

  setSideOffset(offset) {
    this.sideOffset = typeof offset === 'number' && offset >= 0 ? offset : 0;
    this.requestUpdateActiveViewBounds(false);
  }

  toggleMobileMode(tabId) {
    const tab = this.getTab(tabId || this.activeTabId);
    if (!tab || !tab.view) return false;
    return this.setMobileMode(tab.id, !tab.isMobileMode);
  }

  setMobileMode(tabId, enabled) {
    const tab = this.getTab(tabId || this.activeTabId);
    if (!tab) return false;

    tab.isMobileMode = !!enabled;
    if (tab.view && !tab.isInternal) {
      const wc = tab.view.webContents;
      if (!this.defaultUserAgent) {
        try {
          this.defaultUserAgent = this.session ? this.session.getUserAgent() : (wc.getUserAgent() || '');
        } catch (e) {
          this.defaultUserAgent = '';
        }
      }

      if (tab.isMobileMode) {
        const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
        try { wc.setUserAgent(mobileUA); } catch (e) {}
        try {
          wc.enableDeviceEmulation({
            screenPosition: 'mobile',
            screenSize: { width: 412, height: 915 },
            viewSize: { width: 412, height: 915 },
            deviceScaleFactor: 2,
            scale: 1
          });
        } catch (e) {
          console.warn('Device emulation warning:', e.message);
        }
      } else {
        try { wc.setUserAgent(this.defaultUserAgent || ''); } catch (e) {}
        try {
          wc.disableDeviceEmulation();
        } catch (e) {
          console.warn('Disable device emulation warning:', e.message);
        }
      }

      try { wc.reload(); } catch (e) {}
    }

    this.requestUpdateActiveViewBounds(true);
    this.notifyTabsList();
    return tab.isMobileMode;
  }

  isMobileMode(tabId) {
    const tab = this.getTab(tabId || this.activeTabId);
    return tab ? !!tab.isMobileMode : false;
  }

  async getActiveTabContent(tabId) {
    const tab = this.getTab(tabId || this.activeTabId);
    if (!tab || !tab.view) {
      return { title: '', url: '', text: '' };
    }
    if (tab.isInternal) {
      return {
        title: tab.title || 'AETHER Browser Internal Page',
        url: tab.url,
        text: 'AETHER Browser internal management page.'
      };
    }
    try {
      const data = await tab.view.webContents.executeJavaScript(`
        (() => {
          try {
            const title = document.title || '';
            const clone = document.body ? document.body.cloneNode(true) : null;
            if (!clone) return { title, url: window.location.href, text: '' };
            const removeTags = ['script', 'style', 'noscript', 'iframe', 'svg', 'canvas'];
            removeTags.forEach(tag => {
              clone.querySelectorAll(tag).forEach(el => el.remove());
            });
            const text = (clone.innerText || clone.textContent || '').replace(/\\s+/g, ' ').trim();
            return {
              title,
              url: window.location.href,
              text: text.slice(0, 15000)
            };
          } catch (e) {
            return { title: document.title || '', url: window.location.href, text: '' };
          }
        })()
      `);
      return data || { title: tab.title || '', url: tab.url, text: '' };
    } catch (err) {
      console.warn('Could not extract tab content:', err.message);
      return { title: tab.title || '', url: tab.url, text: '' };
    }
  }

  updateActiveViewBounds() {
    const activeTab = this.getActiveTab();
    const splitTab = this.splitTabId ? this.getTab(this.splitTabId) : null;

    try {
      if (!this.browserWindow || this.browserWindow.isDestroyed()) return;
      // Never crush view bounds or destroy surfaces when the window is minimized
      if (typeof this.browserWindow.isMinimized === 'function' && this.browserWindow.isMinimized()) {
        return;
      }

      const [width, height] = this.browserWindow.getContentSize();
      if (width <= 0 || height <= 0) return;

      const baseTopOffset = typeof this.topOffset === 'number' && this.topOffset > 0 ? this.topOffset : 84;
      const splitBarHeight = this.splitTabId ? 38 : 0;
      const topOffset = baseTopOffset + splitBarHeight;
      const leftOffset = typeof this.leftOffset === 'number' && this.leftOffset > 0 ? this.leftOffset : 0;
      const sideOffset = typeof this.sideOffset === 'number' && this.sideOffset > 0 ? this.sideOffset : 0;

      // Responsive side-offset protection: On narrow/mobile windows (< 768px), don't crush the webview
      let effectiveSideOffset = sideOffset;
      if (width < 768 && sideOffset > 0) {
        if (width < 500) {
          effectiveSideOffset = 0; // drawer overlays on mobile screen sizes
        } else if (width - sideOffset < 320) {
          effectiveSideOffset = Math.max(0, width - 320);
        }
      }

      const availableWidth = Math.max(0, width - effectiveSideOffset - leftOffset);
      const availableHeight = Math.max(0, height - topOffset);
      const ratio = typeof this.splitRatio === 'number' && this.splitRatio >= 0.2 && this.splitRatio <= 0.8 ? this.splitRatio : 0.5;
      const leftPaneWidth = Math.floor(availableWidth * ratio);
      const rightPaneWidth = availableWidth - leftPaneWidth;

      if (this.isViewVisible === false) {
        if (activeTab && activeTab.view) {
          try { activeTab.view.setVisible(false); } catch (e) {}
          activeTab.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
        }
        if (splitTab && splitTab.view) {
          try { splitTab.view.setVisible(false); } catch (e) {}
          splitTab.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
        }
        return;
      }

      // Check for active split-screen dual view
      if (this.splitTabId && splitTab && splitTab.id !== (activeTab ? activeTab.id : null)) {
        if (splitTab.view && !splitTab.isInternal && !this.browserWindow.contentView.children.includes(splitTab.view)) {
          try {
            this.browserWindow.contentView.addChildView(splitTab.view);
          } catch (e) {}
        }
        if (activeTab && activeTab.view && !activeTab.isInternal && !this.browserWindow.contentView.children.includes(activeTab.view)) {
          try {
            this.browserWindow.contentView.addChildView(activeTab.view);
          } catch (e) {}
        }

        // Left pane (activeTab)
        if (activeTab && activeTab.view && !activeTab.isInternal) {
          try { activeTab.view.setVisible(true); } catch (e) {}
          const pWidth = activeTab.isMobileMode ? Math.min(412, leftPaneWidth) : leftPaneWidth;
          const pX = activeTab.isMobileMode ? leftOffset + Math.max(0, Math.floor((leftPaneWidth - pWidth) / 2)) : leftOffset;
          activeTab.view.setBounds({
            x: pX,
            y: topOffset,
            width: pWidth,
            height: availableHeight
          });
          try { if (activeTab.view.webContents) activeTab.view.webContents.invalidate(); } catch (e) {}
        } else if (activeTab && activeTab.view) {
          try { activeTab.view.setVisible(false); } catch (e) {}
          activeTab.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
        }

        // Right pane (splitTab)
        if (splitTab && splitTab.view && !splitTab.isInternal) {
          try { splitTab.view.setVisible(true); } catch (e) {}
          const pWidth = splitTab.isMobileMode ? Math.min(412, rightPaneWidth) : rightPaneWidth;
          const pX = splitTab.isMobileMode ? (leftOffset + leftPaneWidth) + Math.max(0, Math.floor((rightPaneWidth - pWidth) / 2)) : (leftOffset + leftPaneWidth);
          splitTab.view.setBounds({
            x: pX,
            y: topOffset,
            width: pWidth,
            height: availableHeight
          });
          try { if (splitTab.view.webContents) splitTab.view.webContents.invalidate(); } catch (e) {}
        } else if (splitTab && splitTab.view) {
          try { splitTab.view.setVisible(false); } catch (e) {}
          splitTab.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
        }
        return;
      }

      // If splitTab is not active or is internal, ensure splitTab.view is hidden if it exists
      if (splitTab && splitTab.view && (splitTab.isInternal || splitTab.id === (activeTab ? activeTab.id : null))) {
        try { splitTab.view.setVisible(false); } catch (e) {}
        splitTab.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
      }

      // Single active view bounds
      if (!activeTab || !activeTab.view || activeTab.isInternal) {
        if (activeTab && activeTab.view && activeTab.isInternal) {
          try {
            try { activeTab.view.setVisible(false); } catch (e) {}
            activeTab.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
          } catch (e) {}
        }
        return;
      }

      // Ensure activeTab.view is attached to window's contentView
      if (!this.browserWindow.contentView.children.includes(activeTab.view)) {
        try {
          this.browserWindow.contentView.addChildView(activeTab.view);
        } catch (e) {}
      }

      try { activeTab.view.setVisible(true); } catch (e) {}
      if (activeTab.isMobileMode) {
        const mobileWidth = Math.min(412, availableWidth);
        const mobileX = leftOffset + Math.max(0, Math.floor((availableWidth - mobileWidth) / 2));
        activeTab.view.setBounds({
          x: mobileX,
          y: topOffset,
          width: mobileWidth,
          height: availableHeight
        });
      } else {
        activeTab.view.setBounds({
          x: leftOffset,
          y: topOffset,
          width: availableWidth,
          height: availableHeight
        });
      }

      // Force GPU compositor repaint on bounds change/window restore
      try {
        if (activeTab.view.webContents) {
          activeTab.view.webContents.invalidate();
        }
      } catch (e) {}
    } catch (e) {
      console.error('Error updating view bounds:', e);
    }
  }

  notifyTabsList() {
    this.windowManager.broadcast('tabs-updated', {
      tabs: this.getTabsSummary(),
      activeTabId: this.activeTabId,
      groups: this.getGroups(),
      splitTabId: this.splitTabId
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
      zoomFactor: tab.zoomFactor,
      groupId: tab.groupId || null,
      isSuspended: !!tab.isSuspended,
      lastAccessed: tab.lastAccessed || Date.now()
    });
  }

  destroyAll() {
    if (this._memorySaverInterval) {
      clearInterval(this._memorySaverInterval);
      this._memorySaverInterval = null;
    }
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

