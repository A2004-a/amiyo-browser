const App = {
  findBarActive: false,

  async init() {
    console.log('[App] Starting initialization...');
    try {
      // 1. Initialize UI DOM components and listeners IMMEDIATELY (zero lag)
      this.initWindowControls();
      TabManager.init();
      Navigation.init();
      Omnibox.init();
      BookmarksBar.init();
      DownloadManager.init();
      KeyboardShortcuts.init();
      this.initFindBar();
      this.initChromeMenu();
      this.initModals();
      this.updateTopOffset();

      window.addEventListener('resize', () => {
        this.updateTopOffset();
      });

      console.log('[App] Loading state from IPC...');
      // 2. Fetch state in parallel (5x faster startup)
      const [settings, bookmarks, history, downloads, permissions, initialTabs] = await Promise.all([
        IpcClient.getSettings(),
        IpcClient.getBookmarks(),
        IpcClient.getHistory(),
        IpcClient.getDownloads(),
        IpcClient.getPermissions(),
        IpcClient.getTabs()
      ]);

      console.log('[App] State loaded. Initial tabs count:', initialTabs ? initialTabs.length : 0);

      State.settings = settings || {};
      State.bookmarks = bookmarks || [];
      State.history = history || [];
      State.downloads = downloads || [];
      State.permissions = permissions || {};

      // Check if private window
      const title = document.title;
      if (title.includes('Private')) {
        State.isPrivate = true;
        document.documentElement.setAttribute('data-private', 'true');
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
        const created = await IpcClient.createTab('amiyo://newtab');
        if (created) {
          State.setTabs([created], created.id);
          TabManager.render();
          Navigation.updateToolbar();
          Omnibox.update();
          this.handleInternalPage(created);
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
      return;
    }

    container.classList.remove('hidden');

    if (tab.url === 'amiyo://newtab') {
      Homepage.render(container);
    } else if (tab.url === 'amiyo://bookmarks') {
      BookmarkManager.render(container);
    } else if (tab.url === 'amiyo://history') {
      HistoryManager.render(container);
    } else if (tab.url === 'amiyo://downloads') {
      DownloadManager.render(container);
    } else if (tab.url === 'amiyo://settings') {
      SettingsManager.render(container);
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
        await IpcClient.maximize();
        const isMax = await IpcClient.isMaximized();
        maxBtn.innerHTML = isMax ? Utils.icons.restore : Utils.icons.maximize;
      });
    }

    if (closeBtn) {
      closeBtn.innerHTML = Utils.icons.close;
      closeBtn.addEventListener('click', () => {
        if (State.tabs.length > 1) {
          this.showModal('Close Browser?', `
            <p style="font-size:14px;color:var(--text-secondary);line-height:1.5;">You have <strong>${State.tabs.length} tabs</strong> open. Are you sure you want to close AMIYO Browser?</p>
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

    window.amiyoAPI.window.onMaximizedChanged((isMax) => {
      if (maxBtn) {
        maxBtn.innerHTML = isMax ? Utils.icons.restore : Utils.icons.maximize;
      }
    });

    // History button in toolbar
    document.getElementById('history-tool-btn')?.addEventListener('click', () => {
      IpcClient.createTab('amiyo://history');
    });

    // Bookmarks button in toolbar
    document.getElementById('bookmarks-tool-btn')?.addEventListener('click', () => {
      IpcClient.createTab('amiyo://bookmarks');
    });

    // Settings button in toolbar
    document.getElementById('settings-tool-btn')?.addEventListener('click', () => {
      IpcClient.createTab('amiyo://settings');
    });
  },

  initChromeMenu() {
    const menuBtn = document.getElementById('chrome-menu-btn');
    const menuEl = document.getElementById('chrome-app-menu');
    if (!menuBtn || !menuEl) return;

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menuEl.classList.toggle('hidden');
      const zoomValEl = document.getElementById('menu-zoom-val');
      const tab = State.getActiveTab();
      if (zoomValEl && tab) {
        zoomValEl.textContent = `${Math.round((tab.zoomFactor || 1) * 100)}%`;
      }
    });

    document.addEventListener('click', (e) => {
      if (!menuEl.contains(e.target) && e.target !== menuBtn) {
        menuEl.classList.add('hidden');
      }
    });

    document.getElementById('menu-new-tab')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      IpcClient.createTab('amiyo://newtab');
    });

    document.getElementById('menu-new-window')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      IpcClient.newWindow(false);
    });

    document.getElementById('menu-new-incognito')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      IpcClient.newWindow(true);
    });

    document.getElementById('menu-bookmarks')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      IpcClient.createTab('amiyo://bookmarks');
    });

    document.getElementById('menu-history')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      IpcClient.createTab('amiyo://history');
    });

    document.getElementById('menu-downloads')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      IpcClient.createTab('amiyo://downloads');
    });

    document.getElementById('menu-find')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      this.toggleFindBar(true);
    });

    document.getElementById('menu-print')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      IpcClient.api.print?.(State.activeTabId);
    });

    document.getElementById('menu-settings')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      IpcClient.createTab('amiyo://settings');
    });

    document.getElementById('menu-exit')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
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
      menuEl.classList.add('hidden');
      IpcClient.maximize();
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

    window.amiyoAPI.find.onResult((res) => {
      if (res.matches !== undefined) {
        countEl.textContent = res.matches > 0
          ? `${res.activeMatchOrdinal} / ${res.matches}`
          : 'No match';
      }
    });
  },

  toggleFindBar(forceState) {
    const bar = document.getElementById('find-bar');
    const input = document.getElementById('find-input');
    if (!bar) return;

    this.findBarActive = forceState !== undefined ? forceState : !this.findBarActive;

    if (this.findBarActive) {
      bar.classList.remove('hidden');
      input?.focus();
      input?.select();
    } else {
      bar.classList.add('hidden');
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

  showModal(title, bodyHtml, buttons = []) {
    const backdrop = document.getElementById('overlay-backdrop');
    const dialog = document.getElementById('modal-dialog-content');
    if (!backdrop || !dialog) return;

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
  }
};

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});

