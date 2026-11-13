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
      this.initIpcTriggers();
      this.initShareSheet();
      this.initQuickNotes();
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
    if (!menuBtn) return;

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = menuBtn.getBoundingClientRect();
      if (IpcClient.showAppMenu) {
        IpcClient.showAppMenu({
          x: Math.round(rect.right),
          y: Math.round(rect.bottom + 4)
        });
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
      if (IpcClient.print) {
        IpcClient.print(State.activeTabId);
      } else if (IpcClient.api?.print) {
        IpcClient.api.print(State.activeTabId);
      }
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

    document.getElementById('menu-share')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      this.openShareSheet();
    });

    document.getElementById('menu-quick-notes')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      this.toggleQuickNotes();
    });

    document.getElementById('menu-clear-browsing-data')?.addEventListener('click', () => {
      menuEl.classList.add('hidden');
      this.showClearBrowsingDataDialog();
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
    const tab = State.getActiveTab();
    if (tab && !tab.isInternal && IpcClient.setViewVisible) {
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
      alert('Internal browser pages cannot be shared.');
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
    const notesBtn = document.getElementById('notes-tool-btn');
    const panel = document.getElementById('quick-notes-panel');
    const textarea = document.getElementById('quick-notes-textarea');
    const countInfo = document.getElementById('notes-count-info');
    const closeBtn = document.getElementById('notes-close-btn');
    const insertLinkBtn = document.getElementById('notes-insert-link-btn');
    const copyBtn = document.getElementById('notes-copy-btn');
    const exportBtn = document.getElementById('notes-export-btn');
    const clearBtn = document.getElementById('notes-clear-btn');

    if (!panel || !textarea) return;

    // Load saved notes
    textarea.value = localStorage.getItem('aether_quick_notes') || '';
    const updateCounts = () => {
      const val = textarea.value;
      const chars = val.length;
      const words = val.trim() ? val.trim().split(/\s+/).length : 0;
      if (countInfo) countInfo.textContent = `${words} words • ${chars} chars`;
    };
    updateCounts();

    textarea.addEventListener('input', () => {
      localStorage.setItem('aether_quick_notes', textarea.value);
      updateCounts();
    });

    notesBtn?.addEventListener('click', () => {
      this.toggleQuickNotes();
    });

    closeBtn?.addEventListener('click', () => {
      panel.classList.add('hidden');
      notesBtn?.classList.remove('active');
      if (IpcClient.setSideOffset) {
        IpcClient.setSideOffset(0);
      }
    });

    insertLinkBtn?.addEventListener('click', () => {
      const tab = State.getActiveTab();
      if (!tab) return;
      const snippet = `\n[${tab.title || 'Link'}](${tab.url})\n`;
      const pos = textarea.selectionStart || textarea.value.length;
      textarea.value = textarea.value.slice(0, pos) + snippet + textarea.value.slice(pos);
      localStorage.setItem('aether_quick_notes', textarea.value);
      updateCounts();
      textarea.focus();
    });

    copyBtn?.addEventListener('click', async () => {
      await navigator.clipboard.writeText(textarea.value);
      copyBtn.textContent = '✓';
      setTimeout(() => { copyBtn.textContent = '📋'; }, 1500);
    });

    exportBtn?.addEventListener('click', () => {
      const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `aether-quick-notes-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
    });

    clearBtn?.addEventListener('click', () => {
      if (textarea.value && confirm('Are you sure you want to clear your scratchpad notes?')) {
        textarea.value = '';
        localStorage.setItem('aether_quick_notes', '');
        updateCounts();
      }
    });
  },

  toggleQuickNotes() {
    const panel = document.getElementById('quick-notes-panel');
    const notesBtn = document.getElementById('notes-tool-btn');
    if (!panel) return;
    const isHidden = panel.classList.toggle('hidden');
    notesBtn?.classList.toggle('active', !isHidden);
    if (IpcClient.setSideOffset) {
      IpcClient.setSideOffset(!isHidden ? 320 : 0);
    }
    if (!isHidden) {
      document.getElementById('quick-notes-textarea')?.focus();
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
  }
};

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});

