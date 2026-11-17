const App = {
  findBarActive: false,
  _initialized: false,

  async init() {
    if (this._initialized) return;
    this._initialized = true;

    console.log('[App] Starting initialization...');
    try {
      // macOS platform integration
      const isDarwin = (window.aetherAPI && window.aetherAPI.platform === 'darwin') ||
        (window.amiyoAPI && window.amiyoAPI.platform === 'darwin') ||
        navigator.userAgent.includes('Macintosh') ||
        navigator.platform.includes('Mac');
      if (isDarwin) {
        document.documentElement.classList.add('platform-darwin');
      }

      // 1. Initialize UI DOM components and listeners IMMEDIATELY (zero lag)
      try { this.initWindowControls(); } catch (e) { console.warn('initWindowControls error:', e); }
      try { TabManager.init(); } catch (e) { console.warn('TabManager.init error:', e); }
      try { Navigation.init(); } catch (e) { console.warn('Navigation.init error:', e); }
      try { Omnibox.init(); } catch (e) { console.warn('Omnibox.init error:', e); }
      try { BookmarksBar.init(); } catch (e) { console.warn('BookmarksBar.init error:', e); }
      try { DownloadManager.init(); } catch (e) { console.warn('DownloadManager.init error:', e); }
      if (typeof AiPanel !== 'undefined') {
        try { AiPanel.init(); } catch (e) { console.warn('AiPanel.init error:', e); }
      }
      if (typeof CommandPalette !== 'undefined') {
        try { CommandPalette.init(); } catch (e) { console.warn('CommandPalette.init error:', e); }
      }
      try { KeyboardShortcuts.init(); } catch (e) { console.warn('KeyboardShortcuts.init error:', e); }
      try { this.initFindBar(); } catch (e) { console.warn('initFindBar error:', e); }
      try { this.initChromeMenu(); } catch (e) { console.warn('initChromeMenu error:', e); }
      try { this.initIpcTriggers(); } catch (e) { console.warn('initIpcTriggers error:', e); }
      try { this.initSplitScreenControls(); } catch (e) { console.warn('initSplitScreenControls error:', e); }
      try { this.updateTopOffset(); } catch (e) {}

      // Defer secondary non-critical overlays to idle cycle to maximize initial launch speed
      const scheduleIdle = window.requestIdleCallback || ((cb) => setTimeout(cb, 40));
      scheduleIdle(() => {
        try { this.initModals(); } catch (e) {}
        try { this.initReaderOverlay(); } catch (e) {}
        try { this.initShareSheet(); } catch (e) {}
        try { this.initQuickNotes(); } catch (e) {}
      });

      let resizeRaf = null;
      window.addEventListener('resize', () => {
        if (resizeRaf) return;
        resizeRaf = requestAnimationFrame(() => {
          resizeRaf = null;
          this.updateTopOffset();
          // Keep side drawer offsets responsive: Overlay on mobile (< 768px), docked on desktop
          const isMobile = window.innerWidth < 768;
          const isNotesOpen = typeof KeepNotes !== 'undefined' && KeepNotes.isOpen && KeepNotes.isOpen();
          const isAiOpen = typeof AiPanel !== 'undefined' && AiPanel.isOpen;
          if (isNotesOpen) {
            IpcClient.setSideOffset(isMobile ? 0 : 360);
          } else if (isAiOpen) {
            IpcClient.setSideOffset(isMobile ? 0 : 380);
          }
        });
      });

      // Window Reopen / Unminimize Watchdog: Restore webview bounds on document visibility
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.updateTopOffset();
          const activeTab = typeof TabManager !== 'undefined' && TabManager.getActiveTab ? TabManager.getActiveTab() : null;
          if (activeTab && !activeTab.isInternal && IpcClient.setViewVisible) {
            IpcClient.setViewVisible(true);
          }
        }
      });
      window.addEventListener('focus', () => {
        this.updateTopOffset();
      });

      console.log('[App] Loading critical state from IPC...');
      // High-speed critical path: Fetch settings and initial tabs first to mount UI instantly
      const [settingsRes, initialTabsRes] = await Promise.allSettled([
        IpcClient.getSettings(),
        IpcClient.getTabs()
      ]);

      const settings = settingsRes.status === 'fulfilled' && settingsRes.value ? settingsRes.value : {};
      const initialTabs = initialTabsRes.status === 'fulfilled' && initialTabsRes.value ? initialTabsRes.value : [];

      console.log('[App] Critical state loaded. Initial tabs count:', initialTabs.length);

      State.settings = settings;
      State.bookmarks = [];
      State.history = [];
      State.downloads = [];
      State.permissions = {};

      // Background non-blocking fetch of heavy auxiliary stores (history, bookmarks, downloads, permissions)
      Promise.allSettled([
        IpcClient.getBookmarks(),
        IpcClient.getHistory(),
        IpcClient.getDownloads(),
        IpcClient.getPermissions()
      ]).then(([bookmarksRes, historyRes, downloadsRes, permissionsRes]) => {
        if (bookmarksRes.status === 'fulfilled') {
          State.bookmarks = bookmarksRes.value || [];
          if (typeof BookmarksBar !== 'undefined' && BookmarksBar.render) BookmarksBar.render();
        }
        if (historyRes.status === 'fulfilled') {
          State.history = historyRes.value || [];
        }
        if (downloadsRes.status === 'fulfilled') {
          State.downloads = downloadsRes.value || [];
          if (typeof DownloadManager !== 'undefined' && DownloadManager.updateBadge) DownloadManager.updateBadge();
        }
        if (permissionsRes.status === 'fulfilled') {
          State.permissions = permissionsRes.value || {};
        }
      });

      if (typeof Omnibox !== 'undefined' && Omnibox.updateSearchEngine) {
        Omnibox.updateSearchEngine(State.settings.searchEngine);
      }
      if (typeof Homepage !== 'undefined' && Homepage.updateSearchPlaceholder) {
        Homepage.updateSearchPlaceholder(State.settings.searchEngine);
      }

      // Listen for settings updates from any window or modal
      const settingsBridge = window.aetherAPI?.settings || window.amiyoAPI?.settings;
      if (settingsBridge?.onUpdated) {
        settingsBridge.onUpdated((newSettings) => {
          State.settings = { ...State.settings, ...newSettings };
          if (newSettings.searchEngine) {
            if (typeof Omnibox !== 'undefined' && Omnibox.updateSearchEngine) {
              Omnibox.updateSearchEngine(newSettings.searchEngine);
            }
            if (typeof Homepage !== 'undefined' && Homepage.updateSearchPlaceholder) {
              Homepage.updateSearchPlaceholder(newSettings.searchEngine);
            }
          }
          if (newSettings.theme && newSettings.theme !== ThemeManager.currentTheme) {
            ThemeManager.applyTheme(newSettings.theme);
          }
        });
      }

      // Listen for split screen view changes
      const tabsBridge = window.aetherAPI?.tabs || window.amiyoAPI?.tabs;
      if (tabsBridge?.onSplitViewChanged) {
        tabsBridge.onSplitViewChanged(({ splitTabId, ratio, activeTabId }) => {
          State.splitTabId = splitTabId;
          const splitBtn = document.getElementById('split-screen-btn');
          const app = document.getElementById('app');
          const splitBar = document.getElementById('split-screen-bar');
          const splitDivider = document.getElementById('split-divider');
          if (splitTabId) {
            splitBtn?.classList.add('active');
            app?.classList.add('split-view-mode');
            splitBar?.classList.remove('hidden');
            splitDivider?.classList.remove('hidden');
            this.updateSplitViewUI(splitTabId, ratio, activeTabId);
          } else {
            splitBtn?.classList.remove('active');
            app?.classList.remove('split-view-mode');
            splitBar?.classList.add('hidden');
            splitDivider?.classList.add('hidden');
            const internalContainer = document.getElementById('internal-page-container');
            if (internalContainer) {
              internalContainer.style.left = '';
              internalContainer.style.width = '';
              internalContainer.style.right = '';
            }
            this.closeSplitPopover();
          }
          if (typeof TabManager !== 'undefined') {
            TabManager.render();
          }
        });
      }

      // Check if private window via URL parameter, IPC query, or document title
      const urlParams = new URLSearchParams(window.location.search);
      const isPrivateFromUrl = urlParams.get('private') === '1' || urlParams.get('private') === 'true';
      let isPrivate = isPrivateFromUrl || document.title.includes('Private');
      if (!isPrivate && IpcClient.isPrivate) {
        try {
          isPrivate = await IpcClient.isPrivate();
        } catch (e) {}
      }

      if (isPrivate) {
        State.isPrivate = true;
        document.documentElement.setAttribute('data-private', 'true');
        document.body.classList.add('private-window');
        const badge = document.getElementById('private-badge');
        if (badge) badge.style.display = 'inline-flex';
      }

      ThemeManager.init(State.settings);
      BookmarksBar.render();
      DownloadManager.updateBadge();

      // 3. Mount initial tab
      if (initialTabs && initialTabs.length > 0) {
        console.log('[App] Mounting initial tab:', initialTabs[0]);
        State.setTabs(initialTabs, initialTabs[0].id);
        TabManager.render();
        Navigation.updateToolbar();
        Omnibox.update();
        this.handleInternalPage(initialTabs[0]);
      } else {
        console.log('[App] No initial tabs found, requesting new tab creation...');
        let created = null;
        try {
          created = await IpcClient.createTab('aether://newtab');
        } catch (e) {
          console.warn('Failed to create tab via IPC:', e);
        }
        if (created) {
          State.setTabs([created], created.id);
          TabManager.render();
          Navigation.updateToolbar();
          Omnibox.update();
          this.handleInternalPage(created);
        } else {
          // Emergency local fallback tab so browser is never black
          const fallbackTab = {
            id: `tab_fallback_${Date.now()}`,
            url: 'aether://newtab',
            title: 'New Tab',
            isInternal: true
          };
          State.setTabs([fallbackTab], fallbackTab.id);
          TabManager.render();
          Navigation.updateToolbar();
          Omnibox.update();
          this.handleInternalPage(fallbackTab);
        }
      }
      console.log('[App] Initialization complete.');
    } catch (err) {
      console.error('[App] Initialization error:', err);
    }
  },

  updateTopOffset() {
    const header = document.getElementById('browser-header');
    if (header) {
      const height = header.offsetHeight;
      IpcClient.setTopOffset(height);
    }
  },

  handleInternalPage(tab) {
    const container = document.getElementById('internal-page-container');
    if (!container) return;

    if (!tab || !tab.isInternal) {
      container.classList.add('hidden');
      container.dataset.currentPage = '';
      if (IpcClient.setViewVisible) {
        IpcClient.setViewVisible(true);
      }
      return;
    }

    container.classList.remove('hidden');

    const targetUrl = tab.url || 'aether://newtab';
    // If the page is already rendered and active, avoid re-rendering to prevent any DOM blinking / flashing
    if (container.dataset.currentPage === targetUrl && container.children.length > 0) {
      return;
    }
    container.dataset.currentPage = targetUrl;

    if (targetUrl === 'aether://newtab' || targetUrl === 'amiyo://newtab') {
      Homepage.render(container);
    } else if (targetUrl === 'aether://bookmarks' || targetUrl === 'amiyo://bookmarks') {
      BookmarkManager.render(container);
    } else if (targetUrl === 'aether://history' || targetUrl === 'amiyo://history') {
      HistoryManager.render(container);
    } else if (targetUrl === 'aether://downloads' || targetUrl === 'amiyo://downloads') {
      DownloadManager.render(container);
    } else if (targetUrl === 'aether://settings' || targetUrl === 'amiyo://settings') {
      SettingsManager.render(container);
    } else if (targetUrl.startsWith('aether://source') || targetUrl.startsWith('amiyo://source')) {
      this.renderPageSource(container, targetUrl);
    } else {
      Homepage.render(container);
    }
  },

  initWindowControls() {
    const minBtn = document.getElementById('window-min-btn');
    const maxBtn = document.getElementById('window-max-btn');
    const closeBtn = document.getElementById('window-close-btn');

    if (minBtn) {
      minBtn.innerHTML = Utils.icons.minimize;
      minBtn.addEventListener('click', () => IpcClient.minimize());
    }

    if (maxBtn) {
      maxBtn.innerHTML = Utils.icons.maximize;
      maxBtn.addEventListener('click', async () => {
        if (typeof hideSnapFlyout === 'function') hideSnapFlyout();
        await IpcClient.maximize();
        const isMax = await IpcClient.isMaximized();
        maxBtn.innerHTML = isMax ? Utils.icons.restore : Utils.icons.maximize;
      });

      // Windows 11 Snap Layouts Flyout on Hover / Context Menu
      const snapFlyout = document.getElementById('snap-layouts-flyout');
      let snapHoverTimer = null;
      let hideSnapFlyout = null;

      if (snapFlyout) {
        let isFlyoutOpen = false;

        const showFlyout = async () => {
          clearTimeout(snapHoverTimer);
          if (isFlyoutOpen) return;
          isFlyoutOpen = true;

          // Suppress native OS tooltip from covering the flyout
          maxBtn.removeAttribute('title');

          // Freeze-frame snapshot backdrop to prevent WebContentsView from clipping the flyout
          const tab = typeof State !== 'undefined' && State.getActiveTab ? State.getActiveTab() : null;
          const isWeb = tab && !tab.isInternal && tab.url && tab.url.startsWith('http');
          if (isWeb) {
            try {
              const res = await IpcClient.captureViewport(tab.id);
              if (res && res.dataUrl) {
                const freeze = document.getElementById('freeze-backdrop');
                if (freeze) {
                  freeze.style.backgroundImage = `url(${res.dataUrl})`;
                  freeze.classList.remove('hidden');
                }
              }
            } catch (e) {}
            if (IpcClient.setViewVisible) {
              await IpcClient.setViewVisible(false);
            }
          }

          snapFlyout.classList.remove('hidden');
        };

        hideSnapFlyout = () => {
          clearTimeout(snapHoverTimer);
          if (!isFlyoutOpen && snapFlyout.classList.contains('hidden')) return;
          isFlyoutOpen = false;
          snapFlyout.classList.add('hidden');

          // Restore native tooltip
          maxBtn.setAttribute('title', 'Maximize / Snap Layouts');

          // Restore WebContentsView
          const freeze = document.getElementById('freeze-backdrop');
          if (freeze) {
            freeze.classList.add('hidden');
            freeze.style.backgroundImage = '';
          }
          const tab = typeof State !== 'undefined' && State.getActiveTab ? State.getActiveTab() : null;
          if (tab && !tab.isInternal && IpcClient.setViewVisible) {
            IpcClient.setViewVisible(true);
          }
        };

        const hideFlyoutWithDelay = () => {
          clearTimeout(snapHoverTimer);
          snapHoverTimer = setTimeout(hideSnapFlyout, 240);
        };

        maxBtn.addEventListener('mouseenter', () => {
          clearTimeout(snapHoverTimer);
          snapHoverTimer = setTimeout(showFlyout, 150);
        });

        maxBtn.addEventListener('mouseleave', hideFlyoutWithDelay);

        snapFlyout.addEventListener('mouseenter', () => {
          clearTimeout(snapHoverTimer);
        });

        snapFlyout.addEventListener('mouseleave', hideFlyoutWithDelay);

        maxBtn.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          if (snapFlyout.classList.contains('hidden')) {
            showFlyout();
          } else {
            hideSnapFlyout();
          }
        });

        snapFlyout.querySelectorAll('.snap-zone').forEach((zone) => {
          zone.addEventListener('click', async (e) => {
            e.stopPropagation();
            const layout = zone.dataset.snap;
            hideSnapFlyout();
            if (layout && IpcClient.snapWindow) {
              await IpcClient.snapWindow(layout);
            }
          });
        });

        document.addEventListener('click', (e) => {
          if (!snapFlyout.contains(e.target) && e.target !== maxBtn && !maxBtn.contains(e.target)) {
            hideSnapFlyout();
          }
        });

        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && isFlyoutOpen) {
            hideSnapFlyout();
          }
        });
      }
    }

    if (closeBtn) {
      closeBtn.innerHTML = Utils.icons.close;
      closeBtn.addEventListener('click', () => {
        if (State.tabs.length > 1) {
          this.showModal('Close Browser?', `
            <p style="font-size:14px;color:var(--text-secondary);line-height:1.5;">You have <strong>${State.tabs.length} tabs</strong> open. Are you sure you want to close AETHER Browser?</p>
          `, [
            { label: 'Cancel', class: 'btn-secondary', click: () => this.closeModal() },
            {
              label: 'Close All Tabs',
              class: 'btn-danger',
              click: () => {
                this.closeModal();
                IpcClient.close();
              }
            }
          ]);
        } else {
          IpcClient.close();
        }
      });
    }

    const winBridge = window.aetherAPI?.window || window.amiyoAPI?.window;
    if (winBridge?.onMaximizedChanged) {
      winBridge.onMaximizedChanged((isMax) => {
        if (maxBtn) {
          maxBtn.innerHTML = isMax ? Utils.icons.restore : Utils.icons.maximize;
        }
      });
    }

    // History button in toolbar
    document.getElementById('history-tool-btn')?.addEventListener('click', () => {
      IpcClient.createTab('aether://history');
    });

    // Bookmarks button in toolbar
    document.getElementById('bookmarks-tool-btn')?.addEventListener('click', () => {
      IpcClient.createTab('aether://bookmarks');
    });

    // Settings button in toolbar
    document.getElementById('settings-tool-btn')?.addEventListener('click', () => {
      IpcClient.createTab('aether://settings');
    });
  },

  async toggleChromeMenu() {
    const menuBtn = document.getElementById('chrome-menu-btn');
    const menuEl = document.getElementById('chrome-app-menu');
    if (!menuBtn || !menuEl) return;

    const isHidden = menuEl.classList.contains('hidden');
    if (!isHidden) {
      this.closeChromeMenu();
      return;
    }

    // Close any other open popovers (VPN, Shields, etc.)
    if (typeof Omnibox !== 'undefined') {
      if (typeof Omnibox.closeVpnPopover === 'function') Omnibox.closeVpnPopover();
      if (typeof Omnibox.closeShieldsPopover === 'function') Omnibox.closeShieldsPopover();
    }

    // Freeze-frame snapshot backdrop to prevent WebContentsView clipping
    const tab = State.getActiveTab();
    const isWeb = tab && !tab.isInternal && tab.url && tab.url.startsWith('http');
    if (isWeb) {
      try {
        const res = await IpcClient.captureViewport(tab.id);
        if (res && res.dataUrl) {
          const freeze = document.getElementById('freeze-backdrop');
          if (freeze) {
            freeze.style.backgroundImage = `url(${res.dataUrl})`;
            freeze.classList.remove('hidden');
          }
        }
      } catch (e) {}
      if (IpcClient.setViewVisible) {
        await IpcClient.setViewVisible(false);
      }
    }

    const tabZoom = tab?.zoomFactor || 1;
    const zoomValEl = document.getElementById('menu-zoom-val');
    if (zoomValEl) {
      zoomValEl.textContent = `${Math.round(tabZoom * 100)}%`;
    }

    // Dynamically calculate exact available height within window to strictly avoid screen/taskbar overlap
    const updateMenuMaxHeight = () => {
      const btnRect = menuBtn.getBoundingClientRect();
      const availableHeight = window.innerHeight - btnRect.bottom - 16;
      menuEl.style.maxHeight = `${Math.max(200, Math.floor(availableHeight))}px`;
    };
    updateMenuMaxHeight();

    menuEl.classList.remove('hidden');
    menuBtn.classList.add('active');

    if (!this._chromeMenuResizeListener) {
      this._chromeMenuResizeListener = () => {
        if (!menuEl.classList.contains('hidden')) {
          updateMenuMaxHeight();
        }
      };
      window.addEventListener('resize', this._chromeMenuResizeListener);
    }

    if (!this._chromeMenuCloseListener) {
      this._chromeMenuCloseListener = (e) => {
        if (!menuEl.contains(e.target) && !menuBtn.contains(e.target)) {
          this.closeChromeMenu();
        }
      };
      setTimeout(() => {
        document.addEventListener('click', this._chromeMenuCloseListener);
      }, 0);
    }

    if (!this._chromeMenuEscListener) {
      this._chromeMenuEscListener = (e) => {
        if (e.key === 'Escape') {
          this.closeChromeMenu();
        }
      };
      document.addEventListener('keydown', this._chromeMenuEscListener);
    }
  },

  closeChromeMenu() {
    const menuEl = document.getElementById('chrome-app-menu');
    const menuBtn = document.getElementById('chrome-menu-btn');
    if (!menuEl || menuEl.classList.contains('hidden')) return;

    menuEl.classList.add('hidden');
    menuEl.style.maxHeight = '';
    if (menuBtn) menuBtn.classList.remove('active');

    if (this._chromeMenuResizeListener) {
      window.removeEventListener('resize', this._chromeMenuResizeListener);
      this._chromeMenuResizeListener = null;
    }

    if (this._chromeMenuCloseListener) {
      document.removeEventListener('click', this._chromeMenuCloseListener);
      this._chromeMenuCloseListener = null;
    }
    if (this._chromeMenuEscListener) {
      document.removeEventListener('keydown', this._chromeMenuEscListener);
      this._chromeMenuEscListener = null;
    }

    const freeze = document.getElementById('freeze-backdrop');
    if (freeze) {
      freeze.classList.add('hidden');
      freeze.style.backgroundImage = '';
    }
    const tab = State.getActiveTab();
    if (tab && !tab.isInternal && IpcClient.setViewVisible) {
      IpcClient.setViewVisible(true);
    }
  },

  initChromeMenu() {
    const menuBtn = document.getElementById('chrome-menu-btn');
    const menuEl = document.getElementById('chrome-app-menu');
    if (!menuBtn || !menuEl) return;

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleChromeMenu();
    });

    document.getElementById('menu-ai')?.addEventListener('click', () => {
      this.closeChromeMenu();
      if (typeof AiPanel !== 'undefined') AiPanel.toggle(true);
    });

    document.getElementById('menu-command-palette')?.addEventListener('click', () => {
      this.closeChromeMenu();
      if (typeof CommandPalette !== 'undefined') CommandPalette.toggle();
    });

    document.getElementById('menu-new-tab')?.addEventListener('click', () => {
      this.closeChromeMenu();
      IpcClient.createTab('aether://newtab');
    });

    document.getElementById('menu-new-window')?.addEventListener('click', () => {
      this.closeChromeMenu();
      IpcClient.newWindow(false);
    });

    document.getElementById('menu-new-incognito')?.addEventListener('click', () => {
      this.closeChromeMenu();
      IpcClient.newWindow(true);
    });

    document.getElementById('menu-bookmarks')?.addEventListener('click', () => {
      this.closeChromeMenu();
      IpcClient.createTab('aether://bookmarks');
    });

    document.getElementById('menu-history')?.addEventListener('click', () => {
      this.closeChromeMenu();
      IpcClient.createTab('aether://history');
    });

    document.getElementById('menu-downloads')?.addEventListener('click', () => {
      this.closeChromeMenu();
      IpcClient.createTab('aether://downloads');
    });

    document.getElementById('menu-find')?.addEventListener('click', () => {
      this.closeChromeMenu();
      this.toggleFindBar(true);
    });

    document.getElementById('menu-print')?.addEventListener('click', () => {
      this.closeChromeMenu();
      if (IpcClient.print) {
        IpcClient.print(State.activeTabId);
      } else if (IpcClient.api?.print) {
        IpcClient.api.print(State.activeTabId);
      }
    });

    document.getElementById('menu-capture')?.addEventListener('click', () => {
      this.closeChromeMenu();
      this.openWebCapture();
    });

    document.getElementById('menu-split')?.addEventListener('click', () => {
      this.closeChromeMenu();
      this.toggleSplitScreen();
    });

    document.getElementById('menu-device-mode')?.addEventListener('click', () => {
      this.closeChromeMenu();
      this.toggleDeviceMode();
    });

    document.getElementById('menu-reading-list')?.addEventListener('click', () => {
      this.closeChromeMenu();
      this.openReadingList();
    });

    document.getElementById('menu-passwords')?.addEventListener('click', () => {
      this.closeChromeMenu();
      this.openPasswordsVault();
    });

    document.getElementById('menu-task-manager')?.addEventListener('click', () => {
      this.closeChromeMenu();
      this.openTaskManager();
    });

    document.getElementById('menu-share')?.addEventListener('click', () => {
      this.closeChromeMenu();
      this.openShareSheet();
    });

    document.getElementById('menu-quick-notes')?.addEventListener('click', () => {
      this.closeChromeMenu();
      this.toggleQuickNotes();
    });

    document.getElementById('menu-eyedropper')?.addEventListener('click', () => {
      this.closeChromeMenu();
      this.openEyedropper();
    });

    document.getElementById('menu-diagnostics')?.addEventListener('click', () => {
      this.closeChromeMenu();
      this.openNetworkDiagnostics();
    });

    document.getElementById('menu-shortcuts')?.addEventListener('click', () => {
      this.closeChromeMenu();
      this.openKeyboardShortcuts();
    });

    document.getElementById('menu-clear-browsing-data')?.addEventListener('click', () => {
      this.closeChromeMenu();
      this.showClearBrowsingDataDialog();
    });

    document.getElementById('menu-settings')?.addEventListener('click', () => {
      this.closeChromeMenu();
      IpcClient.createTab('aether://settings');
    });

    document.getElementById('menu-exit')?.addEventListener('click', () => {
      this.closeChromeMenu();
      IpcClient.close();
    });

    document.getElementById('menu-zoom-in')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const tab = State.getActiveTab();
      if (tab) {
        const factor = Math.min(3.0, (tab.zoomFactor || 1) + 0.1);
        IpcClient.api.zoom.set(tab.id, factor);
        const zEl = document.getElementById('menu-zoom-val');
        if (zEl) zEl.textContent = `${Math.round(factor * 100)}%`;
      }
    });

    document.getElementById('menu-zoom-out')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const tab = State.getActiveTab();
      if (tab) {
        const factor = Math.max(0.25, (tab.zoomFactor || 1) - 0.1);
        IpcClient.api.zoom.set(tab.id, factor);
        const zEl = document.getElementById('menu-zoom-val');
        if (zEl) zEl.textContent = `${Math.round(factor * 100)}%`;
      }
    });

    document.getElementById('menu-zoom-full')?.addEventListener('click', () => {
      this.closeChromeMenu();
      IpcClient.toggleFullscreen();
    });
  },

  initFindBar() {
    const bar = document.getElementById('find-bar');
    const input = document.getElementById('find-input');
    const prevBtn = document.getElementById('find-prev-btn');
    const nextBtn = document.getElementById('find-next-btn');
    const closeBtn = document.getElementById('find-close-btn');
    const countEl = document.getElementById('find-results-count');

    if (!bar) return;

    if (prevBtn) prevBtn.innerHTML = Utils.icons.back;
    if (nextBtn) nextBtn.innerHTML = Utils.icons.forward;
    if (closeBtn) closeBtn.innerHTML = Utils.icons.close;

    const executeFind = (forward = true) => {
      const text = input.value.trim();
      if (text) {
        IpcClient.find(State.activeTabId, text, { forward, findNext: true });
      }
    };

    input.addEventListener('input', () => {
      const text = input.value.trim();
      if (text) {
        IpcClient.find(State.activeTabId, text, {});
      } else {
        IpcClient.stopFind(State.activeTabId, 'clearSelection');
        countEl.textContent = '';
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeFind(!e.shiftKey);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.toggleFindBar(false);
      }
    });

    prevBtn?.addEventListener('click', () => executeFind(false));
    nextBtn?.addEventListener('click', () => executeFind(true));
    closeBtn?.addEventListener('click', () => this.toggleFindBar(false));

    const findBridge = window.aetherAPI?.find || window.amiyoAPI?.find;
    if (findBridge?.onResult) {
      findBridge.onResult((res) => {
        if (res.matches !== undefined) {
          countEl.textContent = res.matches > 0
            ? `${res.activeMatchOrdinal} / ${res.matches}`
            : 'No match';
        }
      });
    }
  },

  toggleFindBar(forceState) {
    const bar = document.getElementById('find-bar');
    const input = document.getElementById('find-input');
    if (!bar) return;

    this.findBarActive = forceState !== undefined ? forceState : !this.findBarActive;

    if (this.findBarActive) {
      bar.classList.remove('hidden');
      if (IpcClient.setTopOffset) IpcClient.setTopOffset(84 + 38);
      input?.focus();
      input?.select();
    } else {
      bar.classList.add('hidden');
      if (IpcClient.setTopOffset) IpcClient.setTopOffset(84);
      IpcClient.stopFind(State.activeTabId, 'clearSelection');
    }
  },

  initModals() {
    const backdrop = document.getElementById('overlay-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.closeModal();
        }
      });
    }
  },

  async showModal(title, bodyHtml, buttons = []) {
    const backdrop = document.getElementById('overlay-backdrop');
    const dialog = document.getElementById('modal-dialog-content');
    if (!backdrop || !dialog) return;

    const tab = State.getActiveTab();
    if (tab && !tab.isInternal && tab.url && tab.url.startsWith('http')) {
      try {
        const res = await IpcClient.captureViewport(tab.id);
        if (res && res.dataUrl) {
          const freeze = document.getElementById('freeze-backdrop');
          if (freeze) {
            freeze.style.backgroundImage = `url(${res.dataUrl})`;
            freeze.classList.remove('hidden');
          }
        }
      } catch (e) {}
    }

    if (IpcClient.setViewVisible) {
      IpcClient.setViewVisible(false);
    }

    dialog.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${Utils.escapeHtml(title)}</h3>
        <button class="modal-close-btn" id="modal-close-icon-btn">${Utils.icons.close}</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-footer" id="modal-footer-btns"></div>
    `;

    dialog.querySelector('#modal-close-icon-btn').addEventListener('click', () => {
      this.closeModal();
    });

    const footer = dialog.querySelector('#modal-footer-btns');
    buttons.forEach(btn => {
      const buttonEl = document.createElement('button');
      buttonEl.className = btn.class || 'btn-secondary';
      buttonEl.textContent = btn.label;
      buttonEl.addEventListener('click', () => btn.click());
      footer.appendChild(buttonEl);
    });

    backdrop.classList.add('active');
  },

  closeModal() {
    const backdrop = document.getElementById('overlay-backdrop');
    if (backdrop) {
      backdrop.classList.remove('active');
    }
    const freeze = document.getElementById('freeze-backdrop');
    if (freeze) {
      freeze.classList.add('hidden');
      freeze.style.backgroundImage = '';
    }
    if (IpcClient.setViewVisible) {
      IpcClient.setViewVisible(true);
    }
  },

  initReaderOverlay() {
    const overlay = document.getElementById('reader-mode-overlay');
    const closeBtn = document.getElementById('reader-close-btn');
    const article = document.getElementById('reader-article-content');
    if (!overlay) return;

    let fontSize = 17;
    let isSerif = true;

    closeBtn?.addEventListener('click', () => {
      overlay.classList.add('hidden');
      if (typeof SpeechEngine !== 'undefined') {
        SpeechEngine.stop(true);
      }
      document.getElementById('reader-speech-bar')?.classList.add('hidden');
      if (IpcClient.setViewVisible) {
        IpcClient.setViewVisible(true);
      }
    });

    // Microsoft Edge Read Aloud Engine integration
    if (typeof SpeechEngine !== 'undefined') {
      SpeechEngine.init();

      const speechBar = document.getElementById('reader-speech-bar');
      const speechBtn = document.getElementById('reader-speech-btn');
      const playBtn = document.getElementById('speech-play-btn');
      const stopBtn = document.getElementById('speech-stop-btn');
      const rateSelect = document.getElementById('speech-rate-select');
      const voiceSelect = document.getElementById('speech-voice-select');
      const statusLabel = document.getElementById('speech-status-label');

      const populateVoices = () => {
        if (!voiceSelect) return;
        const voices = SpeechEngine.getVoices();
        if (voices.length > 0 && voiceSelect.options.length <= 1) {
          voiceSelect.innerHTML = voices.map(v => `
            <option value="${v.name}" ${SpeechEngine.selectedVoice?.name === v.name ? 'selected' : ''}>
              ${v.name} (${v.lang})
            </option>
          `).join('');
        }
      };

      populateVoices();
      SpeechEngine.onStateChange = () => {
        if (playBtn) playBtn.textContent = SpeechEngine.isPlaying && !SpeechEngine.isPaused ? '⏸ Pause' : '▶ Play';
        if (statusLabel) {
          statusLabel.textContent = SpeechEngine.isPlaying && !SpeechEngine.isPaused ? 'Reading aloud...' :
                                    SpeechEngine.isPaused ? 'Paused' : 'Ready to read';
        }
        populateVoices();
      };

      speechBtn?.addEventListener('click', () => {
        speechBar?.classList.toggle('hidden');
        if (!speechBar?.classList.contains('hidden')) {
          populateVoices();
          if (!SpeechEngine.isPlaying) {
            SpeechEngine.start(article);
          }
        } else {
          SpeechEngine.stop(true);
        }
      });

      playBtn?.addEventListener('click', () => {
        if (!SpeechEngine.isPlaying) {
          SpeechEngine.start(article);
        } else if (SpeechEngine.isPaused) {
          SpeechEngine.resume();
        } else {
          SpeechEngine.pause();
        }
      });

      stopBtn?.addEventListener('click', () => {
        SpeechEngine.stop(true);
      });

      rateSelect?.addEventListener('change', (e) => {
        SpeechEngine.setRate(e.target.value);
      });

      voiceSelect?.addEventListener('change', (e) => {
        SpeechEngine.setVoice(e.target.value);
      });
    }

    document.querySelectorAll('.reader-theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.readerTheme;
        overlay.classList.remove('theme-sepia', 'theme-light');
        if (t === 'sepia') overlay.classList.add('theme-sepia');
        else if (t === 'light') overlay.classList.add('theme-light');
      });
    });

    document.getElementById('reader-font-smaller')?.addEventListener('click', () => {
      fontSize = Math.max(13, fontSize - 2);
      if (article) article.style.fontSize = `${fontSize}px`;
    });

    document.getElementById('reader-font-larger')?.addEventListener('click', () => {
      fontSize = Math.min(28, fontSize + 2);
      if (article) article.style.fontSize = `${fontSize}px`;
    });

    document.getElementById('reader-font-family')?.addEventListener('click', () => {
      isSerif = !isSerif;
      if (article) article.style.fontFamily = isSerif ? 'Georgia, serif' : 'Inter, -apple-system, sans-serif';
    });
  },

  async toggleReaderMode(tabId) {
    const overlay = document.getElementById('reader-mode-overlay');
    const article = document.getElementById('reader-article-content');
    if (!overlay || !article) return;

    if (!overlay.classList.contains('hidden')) {
      overlay.classList.add('hidden');
      if (typeof SpeechEngine !== 'undefined') {
        SpeechEngine.stop(true);
      }
      document.getElementById('reader-speech-bar')?.classList.add('hidden');
      if (IpcClient.setViewVisible) {
        IpcClient.setViewVisible(true);
      }
      return;
    }

    const targetTabId = tabId || State.activeTabId;
    if (!targetTabId || !IpcClient.api?.reader?.extract) return;

    try {
      const res = await IpcClient.api.reader.extract(targetTabId);
      if (res && res.content) {
        const readTime = res.readingTime || res.readingTimeMinutes || 1;
        article.innerHTML = `
          <h1>${Utils.escapeHtml(res.title || 'Untitled Article')}</h1>
          <div class="reader-meta">
            ${res.byline ? `<span>By ${Utils.escapeHtml(res.byline)}</span> • ` : ''}
            <span>${readTime} min read</span> • 
            <span>${res.wordCount || 0} words</span>
          </div>
          ${res.content}
        `;
        overlay.classList.remove('hidden');
        if (IpcClient.setViewVisible) {
          IpcClient.setViewVisible(false);
        }
      }
    } catch (e) {
      console.warn('Reader mode extraction failed:', e);
    }
  },

  updateSplitViewUI(splitTabId, ratio, activeTabId) {
    const app = document.getElementById('app');
    const r = typeof ratio === 'number' ? ratio : 0.5;
    if (app) {
      app.style.setProperty('--split-left-width', `${(r * 100).toFixed(1)}%`);
    }

    const leftTab = State.tabs.find(t => t.id === (activeTabId || State.activeTabId));
    const rightTab = State.tabs.find(t => t.id === splitTabId);

    const internalContainer = document.getElementById('internal-page-container');
    if (internalContainer) {
      if (leftTab && leftTab.isInternal && (!rightTab || !rightTab.isInternal)) {
        internalContainer.style.left = '0px';
        internalContainer.style.width = 'var(--split-left-width, 50%)';
        internalContainer.style.right = 'auto';
      } else if (rightTab && rightTab.isInternal && (!leftTab || !leftTab.isInternal)) {
        internalContainer.style.left = 'var(--split-left-width, 50%)';
        internalContainer.style.width = 'calc(100% - var(--split-left-width, 50%))';
        internalContainer.style.right = '0px';
      } else {
        internalContainer.style.left = '0px';
        internalContainer.style.width = 'var(--split-left-width, 50%)';
        internalContainer.style.right = 'auto';
      }
    }

    const leftTitle = document.getElementById('split-left-title');
    const rightTitle = document.getElementById('split-right-title');
    if (leftTitle) leftTitle.textContent = leftTab?.title || 'Left Pane';
    if (rightTitle) rightTitle.textContent = rightTab?.title || 'Right Pane';

    const headerLeft = document.getElementById('split-header-left');
    const headerRight = document.getElementById('split-header-right');
    const isLeftActive = (activeTabId || State.activeTabId) !== splitTabId;
    headerLeft?.classList.toggle('active', isLeftActive);
    headerRight?.classList.toggle('active', !isLeftActive);

    // Sync ratio pills
    document.querySelectorAll('.split-pill-btn').forEach(btn => {
      const btnRatio = parseFloat(btn.dataset.ratio);
      btn.classList.toggle('active', Math.abs(btnRatio - r) < 0.05);
    });
  },

  toggleSplitPopover() {
    const popover = document.getElementById('split-screen-popover');
    const btn = document.getElementById('split-screen-btn');
    if (!popover) return;
    const isHidden = popover.classList.contains('hidden');
    if (!isHidden) {
      this.closeSplitPopover();
      return;
    }

    // Update status badge dynamically
    const statusBadge = document.getElementById('split-popover-status');
    if (statusBadge) {
      const isActive = !!State.splitTabId;
      statusBadge.textContent = isActive ? 'Active' : 'Inactive';
      statusBadge.className = `split-popover-badge ${isActive ? 'active' : ''}`;
    }

    // Populate tabs list
    const tabList = document.getElementById('split-popover-tab-list');
    if (tabList) {
      const otherTabs = State.tabs.filter(t => t.id !== State.activeTabId);
      if (otherTabs.length === 0) {
        tabList.innerHTML = `<div style="font-size:11px;color:var(--text-muted);padding:6px;">No other open tabs</div>`;
      } else {
        tabList.innerHTML = otherTabs.map(t => `
          <button class="split-tab-item ${t.id === State.splitTabId ? 'selected' : ''}" data-tab-id="${t.id}">
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escapeHtml(t.title || 'New Tab')}</span>
          </button>
        `).join('');

        tabList.querySelectorAll('.split-tab-item').forEach(item => {
          item.onclick = async () => {
            const tid = item.dataset.tabId;
            await IpcClient.setSplitTab(tid);
            this.closeSplitPopover();
          };
        });
      }
    }

    popover.classList.remove('hidden');

    if (!this._splitCloseHandler) {
      this._splitCloseHandler = (e) => {
        if (!popover.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
          this.closeSplitPopover();
        }
      };
      setTimeout(() => document.addEventListener('click', this._splitCloseHandler), 0);
    }
  },

  closeSplitPopover() {
    const popover = document.getElementById('split-screen-popover');
    if (!popover || popover.classList.contains('hidden')) return;
    popover.classList.add('hidden');

    if (this._splitCloseHandler) {
      document.removeEventListener('click', this._splitCloseHandler);
      this._splitCloseHandler = null;
    }
  },

  initSplitScreenControls() {
    const splitBtn = document.getElementById('split-screen-btn');
    splitBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!State.splitTabId) {
        this.toggleSplitScreen();
      } else {
        this.toggleSplitPopover();
      }
    });
    splitBtn?.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleSplitPopover();
    });

    const deviceModeBtn = document.getElementById('device-mode-btn');
    deviceModeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDeviceMode();
    });

    document.getElementById('split-swap-btn')?.addEventListener('click', () => IpcClient.swapSplit());
    document.getElementById('popover-split-swap')?.addEventListener('click', () => {
      IpcClient.swapSplit();
      this.closeSplitPopover();
    });

    document.getElementById('split-close-bar-btn')?.addEventListener('click', () => IpcClient.closeSplitTab());
    document.getElementById('popover-split-close')?.addEventListener('click', () => {
      IpcClient.closeSplitTab();
      this.closeSplitPopover();
    });
    document.getElementById('split-right-close-tab')?.addEventListener('click', () => IpcClient.closeSplitTab());

    document.getElementById('split-header-left')?.addEventListener('click', () => {
      const leftTabId = State.activeTabId;
      if (leftTabId) IpcClient.focusSplit(leftTabId);
    });

    document.getElementById('split-header-right')?.addEventListener('click', () => {
      if (State.splitTabId) IpcClient.focusSplit(State.splitTabId);
    });

    document.querySelectorAll('.split-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ratio = parseFloat(e.currentTarget.dataset.ratio);
        if (!isNaN(ratio)) {
          IpcClient.setSplitRatio(ratio);
        }
      });
    });

    // Draggable Divider
    const divider = document.getElementById('split-divider');
    const viewContainer = document.getElementById('view-container');
    const app = document.getElementById('app');

    if (divider && viewContainer && app) {
      let isDragging = false;
      let dragRaf = null;

      divider.addEventListener('mousedown', (e) => {
        isDragging = true;
        divider.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (moveEvent) => {
          if (!isDragging) return;
          const rect = viewContainer.getBoundingClientRect();
          const clientX = moveEvent.clientX;
          const ratio = Math.max(0.2, Math.min(0.8, (clientX - rect.left) / rect.width));
          app.style.setProperty('--split-left-width', `${(ratio * 100).toFixed(1)}%`);
          if (!dragRaf) {
            dragRaf = requestAnimationFrame(() => {
              dragRaf = null;
              if (isDragging) IpcClient.setSplitRatio(ratio);
            });
          }
        };

        const onMouseUp = (upEvent) => {
          if (!isDragging) return;
          isDragging = false;
          if (dragRaf) {
            cancelAnimationFrame(dragRaf);
            dragRaf = null;
          }
          divider.classList.remove('dragging');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);

          const rect = viewContainer.getBoundingClientRect();
          const ratio = Math.max(0.2, Math.min(0.8, (upEvent.clientX - rect.left) / rect.width));
          IpcClient.setSplitRatio(ratio);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });

      divider.addEventListener('dblclick', () => {
        IpcClient.setSplitRatio(0.5);
      });
    }
  },

  async toggleSplitScreen() {
    const splitBtn = document.getElementById('split-screen-btn');

    // If already split, close it
    const activeSplit = IpcClient.getSplitTab ? await IpcClient.getSplitTab() : (await IpcClient.api?.tabs?.getSplit?.());
    if (activeSplit) {
      if (IpcClient.closeSplitTab) await IpcClient.closeSplitTab();
      else if (IpcClient.api?.tabs?.closeSplit) await IpcClient.api.tabs.closeSplit();
      splitBtn?.classList.remove('active');
      return;
    }

    // Otherwise, pick another tab to split with
    const otherTabs = State.tabs.filter(t => t.id !== State.activeTabId);
    if (otherTabs.length === 0) {
      // Create a new tab to split with
      const newT = await IpcClient.createTab('https://www.google.com', { active: false });
      if (newT) {
        if (IpcClient.setSplitTab) await IpcClient.setSplitTab(newT.id);
        else if (IpcClient.api?.tabs?.setSplit) await IpcClient.api.tabs.setSplit(newT.id);
        splitBtn?.classList.add('active');
      }
      return;
    }

    // Split with the most recent other tab
    if (IpcClient.setSplitTab) await IpcClient.setSplitTab(otherTabs[0].id);
    else if (IpcClient.api?.tabs?.setSplit) await IpcClient.api.tabs.setSplit(otherTabs[0].id);
    splitBtn?.classList.add('active');
  },

  openTabSearch() {
    const openTabs = State.tabs;
    const bodyHtml = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <input type="text" id="tab-search-filter" class="tab-search-input" placeholder="Search open tabs (type title or URL)..." autofocus />
        <div class="tab-search-list" id="tab-search-results">
          ${openTabs.map((t, idx) => `
            <div class="tab-search-row ${t.id === State.activeTabId ? 'selected' : ''}" data-tab-id="${t.id}" data-idx="${idx}">
              <div style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                ${t.favicon ? `<img src="${Utils.escapeHtml(t.favicon)}" style="width:16px;height:16px;" onerror="this.style.display='none'" />` : Utils.icons.globe}
              </div>
              <span class="tab-search-title">${Utils.escapeHtml(t.title || 'New Tab')}</span>
              <span class="tab-search-url">${Utils.escapeHtml(t.url || '')}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.showModal('Search Open Tabs', bodyHtml, [
      { label: 'Close', class: 'btn-secondary', click: () => this.closeModal() }
    ]);

    const input = document.getElementById('tab-search-filter');
    const resultsContainer = document.getElementById('tab-search-results');

    const bindRows = () => {
      resultsContainer?.querySelectorAll('.tab-search-row').forEach(row => {
        row.addEventListener('click', () => {
          const tid = row.dataset.tabId;
          if (tid) IpcClient.switchTab(tid);
          this.closeModal();
        });
      });
    };
    bindRows();

    input?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = openTabs.filter(t => 
        (t.title && t.title.toLowerCase().includes(q)) || 
        (t.url && t.url.toLowerCase().includes(q))
      );

      if (resultsContainer) {
        resultsContainer.innerHTML = filtered.map(t => `
          <div class="tab-search-row ${t.id === State.activeTabId ? 'selected' : ''}" data-tab-id="${t.id}">
            <div style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              ${t.favicon ? `<img src="${Utils.escapeHtml(t.favicon)}" style="width:16px;height:16px;" onerror="this.style.display='none'" />` : Utils.icons.globe}
            </div>
            <span class="tab-search-title">${Utils.escapeHtml(t.title || 'New Tab')}</span>
            <span class="tab-search-url">${Utils.escapeHtml(t.url || '')}</span>
          </div>
        `).join('');
        bindRows();
      }
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const firstRow = resultsContainer?.querySelector('.tab-search-row');
        if (firstRow) {
          const tid = firstRow.dataset.tabId;
          if (tid) IpcClient.switchTab(tid);
          this.closeModal();
        }
      }
    });
  },

  async openTaskManager() {
    let interval = null;
    const renderTable = async () => {
      try {
        const tasks = await IpcClient.api.system.getTasks();
        const tbody = document.getElementById('task-manager-tbody');
        if (!tbody) return;

        tbody.innerHTML = (tasks || []).map(task => `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:8px;">
                <span>${task.type === 'browser' ? '🌐' : task.type === 'tab' ? '📄' : task.type === 'ai' ? '✨' : '⚙️'}</span>
                <div>
                  <div style="font-weight:600;">${Utils.escapeHtml(task.title || task.name)}</div>
                  <div style="font-size:10px;color:var(--text-muted);">${Utils.escapeHtml(task.name)}</div>
                </div>
              </div>
            </td>
            <td><code>${task.pid}</code></td>
            <td><strong>${(parseFloat(task.cpu) || 0).toFixed(1)}%</strong></td>
            <td>${task.memoryMB} MB</td>
            <td>
              ${task.type !== 'browser' ? `
                <button class="task-btn-kill" data-pid="${task.pid}" data-tab-id="${task.tabId || ''}">End Process</button>
              ` : '<span style="color:var(--text-muted);font-size:10px;">Core</span>'}
            </td>
          </tr>
        `).join('');

        tbody.querySelectorAll('.task-btn-kill').forEach(btn => {
          btn.addEventListener('click', async () => {
            const pid = parseInt(btn.dataset.pid, 10);
            const tabId = btn.dataset.tabId;
            await IpcClient.api.system.killProcess(pid, tabId);
            renderTable();
          });
        });
      } catch (err) {
        console.warn('Failed fetching task metrics:', err);
      }
    };

    const bodyHtml = `
      <div style="max-height:400px;overflow-y:auto;">
        <table class="task-manager-table">
          <thead>
            <tr>
              <th>Task / Process</th>
              <th>PID</th>
              <th>CPU</th>
              <th>Memory</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="task-manager-tbody">
            <tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);">Loading system metrics...</td></tr>
          </tbody>
        </table>
      </div>
    `;

    this.showModal('Browser Task Manager', bodyHtml, [
      { label: 'Close', class: 'btn-secondary', click: () => {
        if (interval) clearInterval(interval);
        this.closeModal();
      }}
    ]);

    await renderTable();
    interval = setInterval(renderTable, 2000);
  },

  async openWebCapture() {
    const tabId = State.activeTabId;
    if (!tabId || !IpcClient.api?.capture) return;

    try {
      const res = await IpcClient.api.capture.viewport(tabId);
      const dataUrl = (typeof res === 'object' && res?.dataUrl) ? res.dataUrl : res;
      if (!dataUrl || typeof dataUrl !== 'string') {
        console.warn('Capture returned empty or invalid data');
        return;
      }
      const bodyHtml = `
        <div style="display:flex;flex-direction:column;gap:14px;align-items:center;">
          <div style="max-height:300px;overflow:hidden;border-radius:8px;border:1px solid var(--border-subtle);box-shadow:var(--shadow-md);">
            <img src="${dataUrl}" style="width:100%;height:auto;display:block;" />
          </div>
          <div style="display:flex;gap:10px;width:100%;justify-content:flex-end;">
            <button class="btn-secondary" id="cap-copy-btn">📋 Copy to Clipboard</button>
            <button class="btn-primary" id="cap-save-btn">💾 Save Image (.png)</button>
          </div>
        </div>
      `;

      this.showModal('Web Capture / Screenshot', bodyHtml, [
        { label: 'Done', class: 'btn-secondary', click: () => this.closeModal() }
      ]);

      document.getElementById('cap-copy-btn')?.addEventListener('click', async () => {
        await IpcClient.api.capture.clipboard(tabId);
        const b = document.getElementById('cap-copy-btn');
        if (b) b.textContent = '✔ Copied!';
      });

      document.getElementById('cap-save-btn')?.addEventListener('click', async () => {
        await IpcClient.api.capture.save(tabId, `aether-capture-${Date.now()}.png`);
        const b = document.getElementById('cap-save-btn');
        if (b) b.textContent = '✔ Saved!';
      });
    } catch (e) {
      console.warn('Capture failed:', e);
    }
  },

  promptCreateTabGroup(tabId) {
    const targetId = tabId || State.activeTabId;
    const colors = ['#35d8f2', '#ff5722', '#4caf50', '#9c27b0', '#ff9800', '#e91e63', '#2196f3'];
    let selectedColor = colors[0];

    const bodyHtml = `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <label style="font-size:12px;color:var(--text-secondary);font-weight:500;display:block;margin-bottom:6px;">Group Name</label>
          <input type="text" id="tab-group-name-input" class="tab-search-input" placeholder="e.g. Work, Research, Dev" value="New Group" autofocus />
        </div>
        <div>
          <label style="font-size:12px;color:var(--text-secondary);font-weight:500;display:block;margin-bottom:6px;">Group Color</label>
          <div style="display:flex;gap:10px;" id="tab-group-color-picker">
            ${colors.map((c, i) => `
              <div class="color-swatch ${i === 0 ? 'selected' : ''}" data-color="${c}" style="width:26px;height:26px;border-radius:50%;background:${c};cursor:pointer;box-sizing:border-box;border:2px solid ${i === 0 ? '#fff' : 'transparent'};"></div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    this.showModal('Create Tab Group', bodyHtml, [
      { label: 'Cancel', class: 'btn-secondary', click: () => this.closeModal() },
      {
        label: 'Create Group',
        class: 'btn-primary',
        click: async () => {
          const name = document.getElementById('tab-group-name-input')?.value.trim() || 'Group';
          const createFn = IpcClient.createTabGroup || IpcClient.api?.tabs?.createTabGroup || IpcClient.api?.tabs?.createGroup;
          if (createFn) {
            await createFn.call(IpcClient, { name, title: name, color: selectedColor, tabIds: targetId ? [targetId] : [] });
            const tabs = await IpcClient.getTabs();
            State.setTabs(tabs, State.activeTabId);
            TabManager.render();
          }
          this.closeModal();
        }
      }
    ]);

    const swatches = document.querySelectorAll('#tab-group-color-picker .color-swatch');
    swatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        swatches.forEach(s => {
          s.classList.remove('selected');
          s.style.borderColor = 'transparent';
        });
        swatch.classList.add('selected');
        swatch.style.borderColor = '#fff';
        selectedColor = swatch.dataset.color;
      });
    });
  },

  initIpcTriggers() {
    const winBridge = window.aetherAPI?.window || window.amiyoAPI?.window;
    if (winBridge?.onTabSearch) {
      winBridge.onTabSearch(() => this.openTabSearch());
    }
    if (winBridge?.onWebCapture) {
      winBridge.onWebCapture(() => this.openWebCapture());
    }
    if (winBridge?.onFocusOmnibox) {
      winBridge.onFocusOmnibox(() => {
        if (typeof Omnibox !== 'undefined' && Omnibox.focus) {
          Omnibox.focus();
        }
      });
    }
    if (winBridge?.onCreateTabGroup) {
      winBridge.onCreateTabGroup((tabId) => this.promptCreateTabGroup(tabId));
    }

    const triggers = window.aetherAPI?.triggers || window.amiyoAPI?.triggers;
    if (triggers?.onAiPanel) {
      triggers.onAiPanel(() => {
        if (typeof AiPanel !== 'undefined') AiPanel.toggle(true);
      });
    }
    if (triggers?.onSplitScreen) {
      triggers.onSplitScreen(() => this.toggleSplitScreen());
    }
    if (triggers?.onTaskManager) {
      triggers.onTaskManager(() => this.openTaskManager());
    }
    if (triggers?.onShareSheet) {
      triggers.onShareSheet(() => this.openShareSheet());
    }
    if (triggers?.onQuickNotes) {
      triggers.onQuickNotes(() => this.toggleQuickNotes());
    }
    if (triggers?.onClearBrowsingData) {
      triggers.onClearBrowsingData(() => this.showClearBrowsingDataDialog());
    }
  },

  initShareSheet() {
    const shareBtn = document.getElementById('share-tool-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        this.openShareSheet();
      });
    }
  },

  openShareSheet() {
    const tab = State.getActiveTab();
    if (!tab) return;
    const rawUrl = tab.url || '';
    if (!rawUrl || rawUrl.startsWith('amiyo://') || rawUrl.startsWith('aether://')) {
      this.showModal('Share Page & QR Code', `
        <div style="padding: 24px; text-align: center;">
          <div style="font-size: 38px; margin-bottom: 12px;">📱</div>
          <h3 style="margin-bottom: 8px; color: var(--text-primary);">External Web Page Required</h3>
          <p style="color: var(--text-muted); font-size: 13px; line-height: 1.5; max-width: 320px; margin: 0 auto;">
            Mobile Handoff and QR sharing work with live web destinations (news, articles, videos). Open any website and try sharing again!
          </p>
        </div>
      `, [
        { label: 'Close', class: 'btn-secondary', click: () => this.closeModal() }
      ]);
      return;
    }

    let cleanUrl = rawUrl;
    try {
      const u = new URL(rawUrl);
      const trackers = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', '_ga', '_gl', 'ref'];
      trackers.forEach(t => u.searchParams.delete(t));
      cleanUrl = u.toString();
    } catch (e) {}

    const bodyHtml = `
      <div class="share-sheet-body">
        <div class="share-target-card">
          <div class="share-target-info">
            <div class="share-target-title">${Utils.escapeHtml(tab.title || 'Web Page')}</div>
            <div class="share-target-url">${Utils.escapeHtml(cleanUrl)}</div>
          </div>
        </div>

        <div class="share-qr-section">
          <canvas id="share-qr-canvas" width="180" height="180" class="share-qr-canvas"></canvas>
          <div class="share-qr-caption">
            <span>📱 <strong>Scan with Phone Camera</strong></span>
            <span style="font-size:11px;color:var(--text-muted);">Instant Mobile Handoff to Safari / Chrome</span>
          </div>
        </div>

        <div class="share-action-list">
          <button class="share-action-btn" id="share-btn-copy-clean">
            <span class="share-action-icon">🔗</span>
            <div class="share-action-text">
              <div class="share-action-label" id="share-copy-label">Copy Clean Link (Safari Advanced Tracking Protection)</div>
              <div class="share-action-desc">Strips UTM parameters, click IDs &amp; trackers from URL</div>
            </div>
          </button>

          <button class="share-action-btn" id="share-btn-reading-list">
            <span class="share-action-icon">📖</span>
            <div class="share-action-text">
              <div class="share-action-label" id="share-reading-label">Add to Safari Reading List</div>
              <div class="share-action-desc">Save offline for reading anytime</div>
            </div>
          </button>

          <button class="share-action-btn" id="share-btn-email">
            <span class="share-action-icon">✉️</span>
            <div class="share-action-text">
              <div class="share-action-label">Email Link</div>
              <div class="share-action-desc">Open default email client with page title and link</div>
            </div>
          </button>
        </div>
      </div>
    `;

    this.showModal('Safari Share Sheet', bodyHtml, [
      { label: 'Done', class: 'btn-secondary', click: () => this.closeModal() }
    ]);

    // Draw QR Code
    setTimeout(() => {
      const canvas = document.getElementById('share-qr-canvas');
      if (canvas && typeof QRCode !== 'undefined') {
        QRCode.draw(canvas, cleanUrl, {
          size: 180,
          margin: 2,
          foreground: '#0df2c9',
          background: '#0a0f1d'
        });
      }
    }, 50);

    // Copy clean link
    document.getElementById('share-btn-copy-clean')?.addEventListener('click', async () => {
      await navigator.clipboard.writeText(cleanUrl);
      const label = document.getElementById('share-copy-label');
      if (label) {
        label.textContent = '✓ Copied Clean Link!';
        label.style.color = 'var(--accent)';
        setTimeout(() => {
          label.textContent = 'Copy Clean Link (Safari Advanced Tracking Protection)';
          label.style.color = '';
        }, 2000);
      }
    });

    // Add to Safari Reading List
    document.getElementById('share-btn-reading-list')?.addEventListener('click', () => {
      const readingList = State.readingList || [];
      const exists = readingList.some(item => item.url === tab.url);
      if (!exists) {
        readingList.unshift({
          id: 'rl_' + Date.now(),
          title: tab.title || tab.url,
          url: tab.url,
          favicon: tab.favicon || '',
          dateAdded: Date.now(),
          isRead: false
        });
        State.readingList = readingList;
        localStorage.setItem('aether_reading_list', JSON.stringify(readingList));
      }
      const label = document.getElementById('share-reading-label');
      if (label) {
        label.textContent = '✓ Added to Reading List!';
        label.style.color = 'var(--accent)';
      }
    });

    // Email link
    document.getElementById('share-btn-email')?.addEventListener('click', () => {
      const mailto = `mailto:?subject=${encodeURIComponent(tab.title || 'Check this out')}&body=${encodeURIComponent(cleanUrl)}`;
      window.open(mailto, '_blank');
    });
  },

  initQuickNotes() {
    if (typeof KeepNotes !== 'undefined' && KeepNotes.init) {
      KeepNotes.init();
    }
  },

  toggleQuickNotes() {
    if (typeof KeepNotes !== 'undefined' && KeepNotes.toggle) {
      KeepNotes.toggle();
    }
  },

  async toggleDeviceMode() {
    const tab = State.getActiveTab();
    if (!tab || tab.isInternal) return;
    const isMobile = await IpcClient.toggleMobileMode(tab.id);
    tab.isMobileMode = isMobile;
    this.updateDeviceModeUI(isMobile);
  },

  updateDeviceModeUI(isMobile) {
    const btn = document.getElementById('device-mode-btn');
    const label = document.getElementById('menu-device-label');
    if (btn) {
      btn.classList.toggle('active-tool', !!isMobile);
      btn.title = isMobile ? 'Request Desktop Site (Ctrl+Shift+M)' : 'Request Mobile Site (Ctrl+Shift+M)';
    }
    if (label) {
      label.textContent = isMobile ? '💻 Request Desktop Site' : '📱 Request Mobile Site';
    }
  },

  showClearBrowsingDataDialog(onSuccess) {
    const bodyHtml = `
      <div class="clear-data-body">
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;">
          Select the data types and time range to remove from AETHER Browser:
        </p>

        <div style="margin-bottom:16px;">
          <label style="font-size:12px;font-weight:600;color:var(--text-primary);display:block;margin-bottom:6px;">Time Range</label>
          <select id="clear-range-select" class="settings-select" style="width:100%;">
            <option value="hour">Last hour</option>
            <option value="today" selected>Last 24 hours</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 4 weeks</option>
            <option value="all">All time</option>
          </select>
        </div>

        <div class="clear-data-options">
          <label class="clear-data-row">
            <input type="checkbox" id="chk-clear-history" checked />
            <div class="clear-data-desc">
              <strong>Browsing history</strong>
              <span>Clears pages from history, omnibox suggestions, and visited URLs</span>
            </div>
          </label>

          <label class="clear-data-row">
            <input type="checkbox" id="chk-clear-downloads" checked />
            <div class="clear-data-desc">
              <strong>Download history</strong>
              <span>Clears completed and cancelled downloads list (does not delete downloaded files)</span>
            </div>
          </label>

          <label class="clear-data-row">
            <input type="checkbox" id="chk-clear-cookies" checked />
            <div class="clear-data-desc">
              <strong>Cookies and site data</strong>
              <span>Signs you out of most websites and clears site preferences</span>
            </div>
          </label>

          <label class="clear-data-row">
            <input type="checkbox" id="chk-clear-cache" checked />
            <div class="clear-data-desc">
              <strong>Cached images and files</strong>
              <span>Frees up disk cache and forces fresh assets on subsequent visits</span>
            </div>
          </label>
        </div>
      </div>
    `;

    this.showModal('Clear Browsing Data', bodyHtml, [
      { label: 'Cancel', class: 'btn-secondary', click: () => this.closeModal() },
      {
        label: 'Clear Data',
        class: 'btn-danger',
        click: async () => {
          const range = document.getElementById('clear-range-select')?.value || 'all';
          const doHistory = document.getElementById('chk-clear-history')?.checked;
          const doDownloads = document.getElementById('chk-clear-downloads')?.checked;
          const doCookies = document.getElementById('chk-clear-cookies')?.checked;
          const doCache = document.getElementById('chk-clear-cache')?.checked;

          if (doHistory) {
            await IpcClient.clearHistory(range);
            State.history = await IpcClient.getHistory();
          }
          if (doDownloads) {
            await IpcClient.clearDownloads();
            State.downloads = [];
            DownloadManager.updateBadge();
          }
          if (doCookies || doCache) {
            await IpcClient.clearData({ cookies: doCookies, cache: doCache });
          }

          this.closeModal();
          if (onSuccess) onSuccess();
        }
      }
    ]);
  },

  async renderPageSource(container, sourceUrl) {
    let target = '';
    try {
      const parsed = new URL(sourceUrl);
      target = parsed.searchParams.get('url') || '';
    } catch (e) {
      target = sourceUrl.replace(/^(aether|amiyo):\/\/source\?url=/, '');
    }
    
    container.innerHTML = `
      <div class="view-source-container">
        <div class="view-source-header">
          <div class="view-source-title">
            <span class="view-source-tag">SOURCE</span>
            <span class="view-source-url">${Utils.escapeHtml(target || 'Current Document')}</span>
          </div>
          <button class="btn-secondary" id="vs-copy-btn">📋 Copy Source</button>
        </div>
        <div class="view-source-code-wrap">
          <pre id="view-source-pre"><code>Loading document source...</code></pre>
        </div>
      </div>
    `;

    try {
      let html = '';
      if (target) {
        const resp = await fetch(target).catch(() => null);
        if (resp && resp.ok) {
          html = await resp.text();
        }
      }
      if (!html) {
        const activeTab = State.getActiveTab();
        const pageContent = await IpcClient.aiGetPageContent(activeTab?.id);
        html = pageContent?.text ? `<!-- Extracted DOM content -->\n${pageContent.text}` : '<!DOCTYPE html>\n<html>\n<head><title>Source</title></head>\n<body>No source available</body>\n</html>';
      }

      const pre = container.querySelector('#view-source-pre code');
      if (pre) {
        pre.textContent = html;
      }
      container.querySelector('#vs-copy-btn')?.addEventListener('click', () => {
        navigator.clipboard.writeText(html);
        const b = container.querySelector('#vs-copy-btn');
        if (b) b.textContent = '✔ Copied!';
      });
    } catch (err) {
      const pre = container.querySelector('#view-source-pre code');
      if (pre) pre.textContent = `Error loading source: ${err.message}`;
    }
  },

  async openReadingList() {
    let items = await IpcClient.getReadingList();
    const renderList = () => {
      const listEl = document.getElementById('reading-list-items');
      if (!listEl) return;
      if (!items || items.length === 0) {
        listEl.innerHTML = `
          <div style="text-align:center;padding:40px 20px;color:var(--text-muted);">
            <div style="font-size:32px;margin-bottom:12px;">📖</div>
            <div style="font-weight:600;font-size:14px;color:var(--text-secondary);">Your reading list is empty</div>
            <div style="font-size:12px;margin-top:4px;">Use the Share icon (↗️) in the address bar to save pages for later.</div>
          </div>
        `;
        return;
      }

      listEl.innerHTML = items.map(item => `
        <div class="reading-list-card ${item.isRead ? 'read' : ''}" data-id="${item.id}">
          <div class="rl-info">
            <div class="rl-title">${Utils.escapeHtml(item.title || 'Untitled')}</div>
            <div class="rl-url">${Utils.escapeHtml(item.url)}</div>
            <div class="rl-meta">Saved ${new Date(item.addedAt).toLocaleDateString()}</div>
          </div>
          <div class="rl-actions">
            <button class="rl-btn-toggle" data-id="${item.id}" title="${item.isRead ? 'Mark as unread' : 'Mark as read'}">
              ${item.isRead ? '✓ Read' : '○ Unread'}
            </button>
            <button class="rl-btn-del" data-id="${item.id}" title="Remove from reading list">✕</button>
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('.rl-info').forEach(info => {
        info.addEventListener('click', () => {
          const card = info.closest('.reading-list-card');
          const id = card?.dataset.id;
          const found = items.find(it => it.id === id);
          if (found) {
            IpcClient.createTab(found.url, { active: true });
            this.closeModal();
          }
        });
      });

      listEl.querySelectorAll('.rl-btn-toggle').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          items = await IpcClient.toggleReadingListItem(id);
          renderList();
        });
      });

      listEl.querySelectorAll('.rl-btn-del').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          items = await IpcClient.removeReadingListItem(id);
          renderList();
        });
      });
    };

    const bodyHtml = `
      <div style="display:flex;flex-direction:column;gap:12px;max-height:450px;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-subtle);padding-bottom:10px;">
          <span style="font-size:12px;color:var(--text-muted);">${items.length} saved article${items.length === 1 ? '' : 's'}</span>
          <button class="btn-secondary" id="rl-add-current-btn">+ Add Current Page</button>
        </div>
        <div id="reading-list-items" style="overflow-y:auto;max-height:380px;display:flex;flex-direction:column;gap:8px;"></div>
      </div>
    `;

    this.showModal('Reading List (Read Later)', bodyHtml, [
      { label: 'Close', class: 'btn-secondary', click: () => this.closeModal() }
    ]);

    renderList();

    document.getElementById('rl-add-current-btn')?.addEventListener('click', async () => {
      const activeTab = State.getActiveTab();
      if (activeTab && activeTab.url && !activeTab.isInternal) {
        items = await IpcClient.addReadingListItem({
          title: activeTab.title || 'Saved Page',
          url: activeTab.url
        });
        renderList();
      }
    });
  },

  async openPasswordsVault() {
    let passwords = await IpcClient.getPasswords();
    const renderTable = (filter = '') => {
      const tbody = document.getElementById('pw-tbody');
      if (!tbody) return;
      const q = filter.toLowerCase().trim();
      const filtered = (passwords || []).filter(p => 
        (p.url && p.url.toLowerCase().includes(q)) || 
        (p.username && p.username.toLowerCase().includes(q))
      );

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted);">No passwords saved.</td></tr>`;
        return;
      }

      tbody.innerHTML = filtered.map(p => `
        <tr>
          <td><strong style="color:var(--text-primary);">${Utils.escapeHtml(p.url)}</strong></td>
          <td>${Utils.escapeHtml(p.username)}</td>
          <td>
            <div style="display:flex;align-items:center;gap:6px;">
              <input type="password" readonly value="${Utils.escapeHtml(p.password)}" class="pw-input-mask" style="background:transparent;border:none;color:var(--text-primary);font-family:monospace;width:110px;" />
              <button class="btn-icon pw-reveal-btn" title="Toggle password visibility">👁️</button>
              <button class="btn-icon pw-copy-btn" data-pw="${Utils.escapeHtml(p.password)}" title="Copy password">📋</button>
            </div>
          </td>
          <td>
            <button class="task-btn-kill pw-del-btn" data-id="${p.id}">Delete</button>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('.pw-reveal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const inp = btn.parentElement.querySelector('input');
          if (inp) {
            inp.type = inp.type === 'password' ? 'text' : 'password';
          }
        });
      });

      tbody.querySelectorAll('.pw-copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(btn.dataset.pw || '');
          btn.textContent = '✔';
          setTimeout(() => { btn.textContent = '📋'; }, 1500);
        });
      });

      tbody.querySelectorAll('.pw-del-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          await IpcClient.deletePassword(id);
          passwords = await IpcClient.getPasswords();
          renderTable(filter);
        });
      });
    };

    const generatePassword = (len = 16) => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
      const arr = new Uint32Array(len);
      window.crypto.getRandomValues(arr);
      return Array.from(arr, val => chars[val % chars.length]).join('');
    };

    const bodyHtml = `
      <div style="display:flex;flex-direction:column;gap:14px;max-height:480px;">
        <div style="display:flex;gap:10px;justify-content:space-between;align-items:center;">
          <input type="text" id="pw-search" placeholder="Search saved passwords..." class="settings-input" style="flex:1;" />
          <button class="btn-primary" id="pw-gen-btn">⚡ Generate Password</button>
        </div>

        <div id="pw-gen-box" class="hidden" style="background:var(--bg-tertiary);padding:10px 14px;border-radius:8px;border:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:space-between;">
          <div style="font-family:monospace;font-size:14px;font-weight:700;color:var(--accent);" id="pw-gen-val"></div>
          <button class="btn-secondary" id="pw-gen-copy">Copy</button>
        </div>

        <div style="overflow-y:auto;max-height:300px;">
          <table class="task-manager-table">
            <thead>
              <tr>
                <th>Website / Domain</th>
                <th>Username / Email</th>
                <th>Password</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="pw-tbody">
              <tr><td colspan="4" style="text-align:center;padding:12px;color:var(--text-muted);">Loading passwords...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.showModal('Passwords Vault & Generator', bodyHtml, [
      { label: 'Done', class: 'btn-secondary', click: () => this.closeModal() }
    ]);

    renderTable();

    document.getElementById('pw-search')?.addEventListener('input', (e) => {
      renderTable(e.target.value);
    });

    document.getElementById('pw-gen-btn')?.addEventListener('click', () => {
      const box = document.getElementById('pw-gen-box');
      const valEl = document.getElementById('pw-gen-val');
      if (box && valEl) {
        const pw = generatePassword(16);
        valEl.textContent = pw;
        box.classList.remove('hidden');
      }
    });

    document.getElementById('pw-gen-copy')?.addEventListener('click', () => {
      const val = document.getElementById('pw-gen-val')?.textContent;
      if (val) {
        navigator.clipboard.writeText(val);
        const b = document.getElementById('pw-gen-copy');
        if (b) b.textContent = '✔ Copied!';
        setTimeout(() => { if (b) b.textContent = 'Copy'; }, 1500);
      }
    });
  },

  async openEyedropper() {
    if (!window.EyeDropper) {
      alert('The EyeDropper API is available on Chromium desktop browsers.');
      return;
    }
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      if (result && result.sRGBHex) {
        await navigator.clipboard.writeText(result.sRGBHex);
        this.showModal('Eyedropper Color Picker', `
          <div style="display:flex;align-items:center;gap:16px;padding:16px;">
            <div style="width:48px;height:48px;border-radius:8px;background:${result.sRGBHex};border:2px solid var(--border-subtle);box-shadow:var(--shadow-md);"></div>
            <div>
              <div style="font-size:18px;font-weight:700;font-family:monospace;color:var(--text-primary);">${result.sRGBHex}</div>
              <div style="font-size:12px;color:var(--success);margin-top:4px;">✓ Copied color code to clipboard!</div>
            </div>
          </div>
        `, [
          { label: 'Done', class: 'btn-secondary', click: () => this.closeModal() }
        ]);
      }
    } catch (e) {
      console.log('Eyedropper cancelled or dismissed');
    }
  },

  async openNetworkDiagnostics() {
    const bodyHtml = `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--bg-tertiary);border-radius:8px;border:1px solid var(--border-subtle);">
          <div id="diag-status-icon" style="font-size:24px;">🔄</div>
          <div>
            <div id="diag-status-title" style="font-weight:700;color:var(--text-primary);">Pinging network endpoints...</div>
            <div id="diag-status-sub" style="font-size:12px;color:var(--text-muted);">Testing DNS resolution and round-trip latency to Cloudflare 1.1.1.1</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div style="background:var(--bg-secondary);padding:12px;border-radius:8px;border:1px solid var(--border-subtle);">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Round-Trip Latency</div>
            <div id="diag-latency" style="font-size:20px;font-weight:700;color:var(--accent);margin-top:4px;">-- ms</div>
          </div>
          <div style="background:var(--bg-secondary);padding:12px;border-radius:8px;border:1px solid var(--border-subtle);">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Network Adapter State</div>
            <div id="diag-adapter" style="font-size:20px;font-weight:700;color:var(--text-primary);margin-top:4px;">${navigator.onLine ? 'Connected' : 'Offline'}</div>
          </div>
        </div>
      </div>
    `;

    this.showModal('Network Latency & Connectivity Diagnostics', bodyHtml, [
      { label: 'Re-test', class: 'btn-secondary', click: () => this.openNetworkDiagnostics() },
      { label: 'Close', class: 'btn-primary', click: () => this.closeModal() }
    ]);

    try {
      const res = await IpcClient.pingDiagnostics();
      const icon = document.getElementById('diag-status-icon');
      const title = document.getElementById('diag-status-title');
      const sub = document.getElementById('diag-status-sub');
      const lat = document.getElementById('diag-latency');

      if (res && res.online) {
        if (icon) icon.textContent = '🟢';
        if (title) title.textContent = 'Internet Connection Operational';
        if (sub) sub.textContent = `HTTP ${res.status || 200} OK via DNS over HTTPS`;
        if (lat) lat.textContent = `${res.latencyMs} ms`;
      } else {
        if (icon) icon.textContent = '🔴';
        if (title) title.textContent = 'Network Offline or Unreachable';
        if (sub) sub.textContent = res.error || 'Connection timed out';
        if (lat) lat.textContent = 'Timeout';
      }
    } catch (err) {
      console.warn('Diagnostics ping failed:', err);
    }
  },

  openKeyboardShortcuts() {
    const shortcuts = [
      { cat: 'Tab Navigation', key: 'Ctrl + T', desc: 'Open new tab' },
      { cat: 'Tab Navigation', key: 'Ctrl + W', desc: 'Close active tab' },
      { cat: 'Tab Navigation', key: 'Ctrl + Shift + T', desc: 'Restore closed tab' },
      { cat: 'Tab Navigation', key: 'Ctrl + Tab', desc: 'Cycle to next tab' },
      { cat: 'Tab Navigation', key: 'Ctrl + Shift + Tab', desc: 'Cycle to previous tab' },
      { cat: 'Tab Navigation', key: 'Ctrl + 1-8', desc: 'Switch directly to tab 1 through 8' },
      { cat: 'Tab Navigation', key: 'Ctrl + 9', desc: 'Switch to rightmost tab' },
      { cat: 'Page Navigation', key: 'Ctrl + L', desc: 'Focus address bar (Omnibox)' },
      { cat: 'Page Navigation', key: 'Ctrl + R', desc: 'Reload active page' },
      { cat: 'Page Navigation', key: 'Ctrl + Shift + R', desc: 'Force hard reload (bypass cache)' },
      { cat: 'Page Navigation', key: 'Alt + Left / Right', desc: 'Navigate backward / forward in history' },
      { cat: 'Page Tools', key: 'Ctrl + F', desc: 'Find in page' },
      { cat: 'Page Tools', key: 'Ctrl + P', desc: 'Print active page' },
      { cat: 'Page Tools', key: 'Ctrl + Shift + P', desc: 'Save page directly to PDF' },
      { cat: 'Page Tools', key: 'Ctrl + Shift + S', desc: 'AETHER Prism Web Capture / Screenshot' },
      { cat: 'Page Tools', key: 'Ctrl + Alt + R', desc: 'Toggle Distraction-Free Reader Mode' },
      { cat: 'Page Tools', key: 'Ctrl + Shift + U', desc: 'Microsoft Edge Read Aloud Speech Synthesizer' },
      { cat: 'System & Power', key: 'Shift + Esc', desc: 'AETHER Pulse Task Manager (CPU & RAM per tab)' },
      { cat: 'System & Power', key: 'Ctrl + Shift + A', desc: 'Tab Search across all open tabs' },
      { cat: 'System & Power', key: 'Ctrl + Alt + N', desc: 'Edge Quick Notes / Scratchpad' },
      { cat: 'System & Power', key: 'Ctrl + Shift + Del', desc: 'Clear browsing data (cache, cookies, history)' },
      { cat: 'System & Power', key: 'F11', desc: 'Toggle Fullscreen view' }
    ];

    const bodyHtml = `
      <div style="display:flex;flex-direction:column;gap:12px;max-height:480px;">
        <input type="text" id="ks-filter" placeholder="Search shortcuts..." class="settings-input" />
        <div style="overflow-y:auto;max-height:400px;">
          <table class="task-manager-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Shortcut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="ks-tbody">
              ${shortcuts.map(s => `
                <tr class="ks-row" data-text="${s.cat.toLowerCase()} ${s.key.toLowerCase()} ${s.desc.toLowerCase()}">
                  <td><span class="badge" style="background:var(--bg-tertiary);color:var(--text-secondary);padding:3px 6px;border-radius:4px;font-size:11px;">${s.cat}</span></td>
                  <td><kbd style="background:var(--bg-secondary);padding:3px 8px;border-radius:4px;border:1px solid var(--border-subtle);font-family:monospace;font-size:12px;font-weight:600;color:var(--accent);">${s.key}</kbd></td>
                  <td style="color:var(--text-primary);">${s.desc}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.showModal('Keyboard Shortcuts Cheatsheet', bodyHtml, [
      { label: 'Close', class: 'btn-secondary', click: () => this.closeModal() }
    ]);

    document.getElementById('ks-filter')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('.ks-row').forEach(row => {
        const text = row.dataset.text || '';
        row.style.display = text.includes(q) ? '' : 'none';
      });
    });
  }
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    App.init();
  });
} else {
  App.init();
}

