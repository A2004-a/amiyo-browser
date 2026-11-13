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
      if (typeof AiPanel !== 'undefined') AiPanel.init();
      KeyboardShortcuts.init();
      this.initFindBar();
      this.initChromeMenu();
      this.initModals();
      this.initReaderOverlay();
      this.updateTopOffset();

      document.getElementById('split-screen-btn')?.addEventListener('click', () => {
        this.toggleSplitScreen();
      });

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

      if (typeof Omnibox !== 'undefined' && Omnibox.updateSearchEngine) {
        Omnibox.updateSearchEngine(State.settings.searchEngine);
      }
      if (typeof Homepage !== 'undefined' && Homepage.updateSearchPlaceholder) {
        Homepage.updateSearchPlaceholder(State.settings.searchEngine);
      }

      // Listen for settings updates from any window or modal
      const settingsBridge = window.amiyoAPI?.settings || window.amiyoApi?.settings;
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
          if (newSettings.theme) {
            ThemeManager.setTheme(newSettings.theme);
          }
        });
      }

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
        const created = await IpcClient.createTab('aether://newtab');
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

    if (tab.url === 'aether://newtab' || tab.url === 'amiyo://newtab') {
      Homepage.render(container);
    } else if (tab.url === 'aether://bookmarks' || tab.url === 'amiyo://bookmarks') {
      BookmarkManager.render(container);
    } else if (tab.url === 'aether://history' || tab.url === 'amiyo://history') {
      HistoryManager.render(container);
    } else if (tab.url === 'aether://downloads' || tab.url === 'amiyo://downloads') {
      DownloadManager.render(container);
    } else if (tab.url === 'aether://settings' || tab.url === 'amiyo://settings') {
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

    window.amiyoAPI.window.onMaximizedChanged((isMax) => {
      if (maxBtn) {
        maxBtn.innerHTML = isMax ? Utils.icons.restore : Utils.icons.maximize;
      }
    });

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

    document.getElementById('menu-ai')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      if (typeof AiPanel !== 'undefined') AiPanel.toggle(true);
    });

    document.getElementById('menu-new-tab')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      IpcClient.createTab('aether://newtab');
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
      IpcClient.createTab('aether://bookmarks');
    });

    document.getElementById('menu-history')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      IpcClient.createTab('aether://history');
    });

    document.getElementById('menu-downloads')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      IpcClient.createTab('aether://downloads');
    });

    document.getElementById('menu-find')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      this.toggleFindBar(true);
    });

    document.getElementById('menu-print')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      IpcClient.api.print?.(State.activeTabId);
    });

    document.getElementById('menu-capture')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      this.openWebCapture();
    });

    document.getElementById('menu-split')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      this.toggleSplitScreen();
    });

    document.getElementById('menu-task-manager')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      this.openTaskManager();
    });

    document.getElementById('menu-settings')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      IpcClient.createTab('aether://settings');
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
    });

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
      return;
    }

    const targetTabId = tabId || State.activeTabId;
    if (!targetTabId || !IpcClient.api?.reader?.extract) return;

    try {
      const res = await IpcClient.api.reader.extract(targetTabId);
      if (res && res.content) {
        article.innerHTML = `
          <h1>${Utils.escapeHtml(res.title || 'Untitled Article')}</h1>
          <div class="reader-meta">
            ${res.byline ? `<span>By ${Utils.escapeHtml(res.byline)}</span> • ` : ''}
            <span>${res.readingTime} min read</span> • 
            <span>${res.wordCount} words</span>
          </div>
          ${res.content}
        `;
        overlay.classList.remove('hidden');
      }
    } catch (e) {
      console.warn('Reader mode extraction failed:', e);
    }
  },

  async toggleSplitScreen() {
    if (!IpcClient.api?.tabs?.setSplit) return;
    const splitBtn = document.getElementById('split-screen-btn');

    // If already split, close it
    const activeSplit = await IpcClient.api.tabs.getSplitId?.();
    if (activeSplit) {
      await IpcClient.api.tabs.closeSplit();
      splitBtn?.classList.remove('active');
      return;
    }

    // Otherwise, pick another tab to split with
    const otherTabs = State.tabs.filter(t => t.id !== State.activeTabId);
    if (otherTabs.length === 0) {
      // Create a new tab to split with
      const newT = await IpcClient.createTab('https://www.google.com', { active: false });
      if (newT) {
        await IpcClient.api.tabs.setSplit(newT.id);
        splitBtn?.classList.add('active');
      }
      return;
    }

    // Split with the most recent other tab
    await IpcClient.api.tabs.setSplit(otherTabs[0].id);
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
            <td><strong>${task.cpu.toFixed(1)}%</strong></td>
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
      const dataUrl = await IpcClient.api.capture.viewport(tabId);
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
  }
};

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});

