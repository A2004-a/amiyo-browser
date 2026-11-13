const Omnibox = {
  inputEl: null,
  containerEl: null,
  suggestionsEl: null,
  securityBadgeEl: null,
  bookmarkBtnEl: null,
  selectedIndex: -1,
  currentSuggestions: [],

  init() {
    this.inputEl = document.getElementById('url-input');
    this.containerEl = document.getElementById('omnibox-container');
    this.suggestionsEl = document.getElementById('omnibox-suggestions');
    this.securityBadgeEl = document.getElementById('security-badge');
    this.bookmarkBtnEl = document.getElementById('bookmark-tool-btn');
    this.clearBtnEl = document.getElementById('clear-input-btn');
    this.zoomBadgeEl = document.getElementById('zoom-badge');

    if (this.clearBtnEl) {
      this.clearBtnEl.innerHTML = Utils.icons.close;
      this.clearBtnEl.addEventListener('click', () => {
        if (this.inputEl) {
          this.inputEl.value = '';
          this.inputEl.focus();
          this.clearBtnEl.classList.add('hidden');
          this.closeSuggestions();
        }
      });
    }

    if (this.zoomBadgeEl) {
      this.zoomBadgeEl.addEventListener('click', () => {
        IpcClient.api.zoom.set(State.activeTabId, 1.0);
      });
    }

    if (State.settings && State.settings.searchEngine) {
      this.updateSearchEngine(State.settings.searchEngine);
    }

    if (this.bookmarkBtnEl) {
      this.bookmarkBtnEl.innerHTML = Utils.icons.star;
      this.bookmarkBtnEl.addEventListener('click', () => {
        this.toggleBookmarkCurrentTab();
      });
    }

    if (this.securityBadgeEl) {
      this.securityBadgeEl.innerHTML = Utils.icons.lock;
      this.securityBadgeEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showSecurityDetails();
      });
    }

    this.shieldsBtnEl = document.getElementById('shields-tool-btn');
    this.shieldsBadgeEl = document.getElementById('shields-badge');
    this.shieldsPopoverEl = document.getElementById('shields-popover');
    this.readerBtnEl = document.getElementById('reader-tool-btn');

    if (this.shieldsBtnEl) {
      this.shieldsBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleShieldsPopover();
      });
    }

    if (this.readerBtnEl) {
      this.readerBtnEl.addEventListener('click', () => {
        if (typeof App !== 'undefined' && App.toggleReaderMode) {
          App.toggleReaderMode(State.activeTabId);
        }
      });
    }

    if (this.inputEl) {
      // Auto select text on focus
      this.inputEl.addEventListener('focus', () => {
        this.inputEl.select();
        this.fetchSuggestions(this.inputEl.value);
        if (this.clearBtnEl && this.inputEl.value) {
          this.clearBtnEl.classList.remove('hidden');
        }
      });

      // Keydown handling: Enter, Escape, Arrow Up, Arrow Down
      this.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13 || e.which === 13) {
          e.preventDefault();
          this.handleEnter();
        } else if (e.key === 'Escape' || e.keyCode === 27) {
          e.preventDefault();
          this.closeSuggestions();
          this.update();
          this.inputEl.blur();
        } else if (e.key === 'ArrowDown' || e.keyCode === 40) {
          e.preventDefault();
          this.moveSelection(1);
        } else if (e.key === 'ArrowUp' || e.keyCode === 38) {
          e.preventDefault();
          this.moveSelection(-1);
        }
      });

      // Input changes -> fetch suggestions (debounced)
      const debouncedSuggestions = Utils.debounce((val) => {
        this.fetchSuggestions(val);
      }, 150);

      this.inputEl.addEventListener('input', (e) => {
        if (this.clearBtnEl) {
          this.clearBtnEl.classList.toggle('hidden', !e.target.value);
        }
        debouncedSuggestions(e.target.value);
      });
    }

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.containerEl.contains(e.target)) {
        this.closeSuggestions();
      }
    });
  },

  update() {
    const tab = State.getActiveTab();
    if (!tab || !this.inputEl) return;

    // Do not overwrite input if currently focused by user
    if (document.activeElement !== this.inputEl) {
      if (tab.url === 'amiyo://newtab' || tab.url === 'aether://newtab') {
        this.inputEl.value = '';
        const engineMap = {
          google: 'Google',
          duckduckgo: 'DuckDuckGo',
          bing: 'Bing',
          yahoo: 'Yahoo',
          ecosia: 'Ecosia',
          yandex: 'Yandex'
        };
        const current = (State.settings && State.settings.searchEngine) ? State.settings.searchEngine.toLowerCase() : 'google';
        const label = engineMap[current] || 'the web';
        this.inputEl.placeholder = `Search with ${label} or enter address`;
      } else {
        this.inputEl.value = tab.url;
      }
    }

    // Update Security Badge
    this.updateSecurityBadge(tab.url);

    // Update Bookmark Star
    this.updateBookmarkButton(tab.url);

    // Update Zoom Badge
    if (this.zoomBadgeEl) {
      const zoom = Math.round((tab.zoomFactor || 1.0) * 100);
      if (zoom !== 100) {
        this.zoomBadgeEl.textContent = `${zoom}%`;
        this.zoomBadgeEl.classList.remove('hidden');
      } else {
        this.zoomBadgeEl.classList.add('hidden');
      }
    }

    // Update Reader Mode button visibility
    if (this.readerBtnEl) {
      const isWeb = tab && !tab.isInternal && tab.url && tab.url.startsWith('http');
      this.readerBtnEl.classList.toggle('hidden', !isWeb);
    }

    // Update Shields badge
    this.updateShieldsBadge(tab);
  },

  async updateShieldsBadge(tab) {
    if (!this.shieldsBadgeEl || !tab || !IpcClient.api?.shields?.getTabStats) return;
    try {
      const stats = await IpcClient.api.shields.getTabStats(tab.id);
      const count = stats?.blockedCount || stats?.total || 0;
      if (count > 0) {
        this.shieldsBadgeEl.textContent = count > 99 ? '99+' : count;
        this.shieldsBadgeEl.classList.remove('hidden');
      } else {
        this.shieldsBadgeEl.classList.add('hidden');
      }
    } catch (e) {
      this.shieldsBadgeEl.classList.add('hidden');
    }
  },

  focus() {
    if (this.inputEl) {
      this.inputEl.focus();
      this.inputEl.select();
    }
  },

  closeShieldsPopover() {
    if (!this.shieldsPopoverEl) return;
    this.shieldsPopoverEl.classList.add('hidden');
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

  async toggleShieldsPopover() {
    if (!this.shieldsPopoverEl) return;
    const isHidden = this.shieldsPopoverEl.classList.contains('hidden');
    if (!isHidden) {
      this.closeShieldsPopover();
      return;
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

    // Populate data
    let hostname = 'this site';
    if (tab && tab.url && tab.url.startsWith('http')) {
      try {
        hostname = new URL(tab.url).hostname;
      } catch (e) {}
    }

    const domainEl = document.getElementById('shields-site-domain');
    const blockedCountEl = document.getElementById('shields-blocked-count');
    const masterToggle = document.getElementById('shields-master-toggle');
    const siteBtn = document.getElementById('shields-toggle-site-btn');

    if (domainEl) domainEl.textContent = hostname;

    try {
      if (IpcClient.api?.shields) {
        const status = await IpcClient.api.shields.getStatus();
        const tabStats = tab ? await IpcClient.api.shields.getTabStats(tab.id) : null;
        const count = tabStats?.blockedCount || tabStats?.total || 0;
        if (blockedCountEl) blockedCountEl.textContent = count;
        const bwEl = document.getElementById('shields-bandwidth-saved');
        if (bwEl) {
          bwEl.textContent = count < 8 ? `${Math.round(count * 128)} KB` : `${(count * 128 / 1024).toFixed(1)} MB`;
        }
        const timeEl = document.getElementById('shields-time-saved');
        if (timeEl) {
          timeEl.textContent = `${(count * 0.055).toFixed(1)} s`;
        }
        if (masterToggle) masterToggle.checked = status?.enabled !== false;
        
        const isWhitelisted = status?.whitelist?.includes(hostname);
        if (siteBtn) {
          siteBtn.textContent = isWhitelisted ? `Turn Shields ON for ${hostname}` : `Turn Shields OFF for ${hostname}`;
        }

        // Shields Mode Selector (Standard vs Aggressive)
        const stdBtn = document.getElementById('shields-mode-standard');
        const aggBtn = document.getElementById('shields-mode-aggressive');
        const currentMode = status?.mode || 'standard';
        if (stdBtn && aggBtn) {
          stdBtn.classList.toggle('active', currentMode === 'standard');
          aggBtn.classList.toggle('active', currentMode === 'aggressive');

          stdBtn.onclick = async () => {
            stdBtn.classList.add('active');
            aggBtn.classList.remove('active');
            if (IpcClient.api?.shields?.setMode) await IpcClient.api.shields.setMode('standard');
          };
          aggBtn.onclick = async () => {
            aggBtn.classList.add('active');
            stdBtn.classList.remove('active');
            if (IpcClient.api?.shields?.setMode) await IpcClient.api.shields.setMode('aggressive');
          };
        }

        // Blocked Items List (Brave Advanced View)
        const viewItemsBtn = document.getElementById('shields-view-items-btn');
        const itemsListEl = document.getElementById('shields-blocked-items-list');
        const itemsCountEl = document.getElementById('shields-items-btn-count');
        const blockedUrls = tabStats?.blockedUrls || [];
        if (itemsCountEl) itemsCountEl.textContent = blockedUrls.length;

        if (viewItemsBtn && itemsListEl) {
          itemsListEl.classList.add('hidden');
          viewItemsBtn.onclick = () => {
            const isListHidden = itemsListEl.classList.toggle('hidden');
            if (!isListHidden) {
              if (blockedUrls.length === 0) {
                itemsListEl.innerHTML = '<div style="text-align:center;padding:8px;font-size:10px;color:var(--text-muted);">No blocked requests yet</div>';
              } else {
                itemsListEl.innerHTML = blockedUrls.map(item => `
                  <div class="shields-blocked-item">
                    <span class="shields-blocked-host" title="${Utils.escapeHtml(item.url)}">${Utils.escapeHtml(item.domain || item.url)}</span>
                    <span class="shields-blocked-tag ${item.type === 'ad' ? 'ad' : 'tracker'}">${item.type}</span>
                  </div>
                `).join('');
              }
            }
          };
        }

        // Script Blocker per-site
        const scriptToggle = document.getElementById('shields-script-toggle');
        if (scriptToggle) {
          const blockedScripts = State.settings?.blockedScriptsDomains || [];
          scriptToggle.checked = blockedScripts.includes(hostname);
          scriptToggle.onchange = async () => {
            let list = [...(State.settings?.blockedScriptsDomains || [])];
            if (scriptToggle.checked) {
              if (!list.includes(hostname)) list.push(hostname);
            } else {
              list = list.filter(h => h !== hostname);
            }
            if (State.settings) State.settings.blockedScriptsDomains = list;
            await IpcClient.saveSettings({ blockedScriptsDomains: list });
          };
        }

        // Attach listeners once
        masterToggle.onchange = async () => {
          await IpcClient.api.shields.toggle(masterToggle.checked);
          this.shieldsBtnEl?.classList.toggle('shields-off', !masterToggle.checked);
        };

        if (siteBtn) {
          siteBtn.onclick = async () => {
            const nextAllow = !isWhitelisted;
            await IpcClient.api.shields.toggleWhitelist(hostname, nextAllow);
            this.closeShieldsPopover();
          };
        }
      }
    } catch (e) {
      console.warn('Shields popover error:', e);
    }

    this.shieldsPopoverEl.classList.remove('hidden');

    // Close on click outside
    const closeListener = (e) => {
      if (!this.shieldsPopoverEl.contains(e.target) && !this.shieldsBtnEl.contains(e.target)) {
        this.closeShieldsPopover();
        document.removeEventListener('click', closeListener);
      }
    };
    setTimeout(() => document.addEventListener('click', closeListener), 0);
  },

  async updateSecurityBadge(url) {
    if (!this.securityBadgeEl) return;
    const status = await IpcClient.getSecurityStatus(url);

    this.securityBadgeEl.className = 'omnibox-action-btn';
    if (status.type === 'secure') {
      this.securityBadgeEl.classList.add('secure');
      this.securityBadgeEl.innerHTML = Utils.icons.lock;
      this.securityBadgeEl.title = 'Connection is secure (HTTPS)';
    } else if (status.type === 'insecure') {
      this.securityBadgeEl.classList.add('insecure');
      this.securityBadgeEl.innerHTML = Utils.icons.lockWarning;
      this.securityBadgeEl.title = 'Connection is not secure (HTTP)';
    } else if (status.type === 'internal') {
      this.securityBadgeEl.classList.add('internal');
      this.securityBadgeEl.innerHTML = Utils.icons.lock;
      this.securityBadgeEl.title = 'AETHER System Page';
    } else {
      this.securityBadgeEl.innerHTML = Utils.icons.globe;
      this.securityBadgeEl.title = 'Web Page';
    }
  },

  updateBookmarkButton(url) {
    if (!this.bookmarkBtnEl) return;
    const isBookmarked = State.bookmarks.some(b => b.url === url);
    if (isBookmarked) {
      this.bookmarkBtnEl.innerHTML = Utils.icons.starFilled;
      this.bookmarkBtnEl.classList.add('active');
      this.bookmarkBtnEl.title = 'Edit bookmark for this tab';
    } else {
      this.bookmarkBtnEl.innerHTML = Utils.icons.star;
      this.bookmarkBtnEl.classList.remove('active');
      this.bookmarkBtnEl.title = 'Bookmark this tab (Ctrl+D)';
    }
  },

  async fetchSuggestions(query) {
    if (!query || query.trim() === '') {
      this.closeSuggestions();
      return;
    }

    const trimmed = query.trim();

    // Chrome Search Engine Keywords: @, @bookmarks, @history, @tabs, @yt, @wiki, @ai
    if (trimmed === '@') {
      this.currentSuggestions = [
        { type: 'keyword', title: '@bookmarks — Search Vault bookmarks', url: '@bookmarks ' },
        { type: 'keyword', title: '@history — Search browsing history', url: '@history ' },
        { type: 'keyword', title: '@tabs — Search and switch open tabs', url: '@tabs ' },
        { type: 'keyword', title: '@yt — Search YouTube directly', url: '@yt ' },
        { type: 'keyword', title: '@wiki — Search Wikipedia directly', url: '@wiki ' },
        { type: 'ai', title: '@ai — Ask AETHER Intelligence', url: '@ai ' }
      ];
      this.selectedIndex = 0;
      this.renderSuggestions();
      return;
    }

    if (trimmed.startsWith('@bookmarks') || trimmed.startsWith('@b ')) {
      const q = trimmed.replace(/^@(bookmarks|b)\s*/i, '').trim().toLowerCase();
      const matches = (State.bookmarks || []).filter(b => 
        !q || (b.title && b.title.toLowerCase().includes(q)) || (b.url && b.url.toLowerCase().includes(q))
      );
      this.currentSuggestions = matches.slice(0, 8).map(b => ({
        type: 'bookmark',
        title: b.title || b.url,
        url: b.url
      }));
      if (this.currentSuggestions.length === 0) {
        this.currentSuggestions = [{ type: 'bookmark', title: `No bookmarks matching "${q}"`, url: '' }];
      }
      this.selectedIndex = 0;
      this.renderSuggestions();
      return;
    }

    if (trimmed.startsWith('@history') || trimmed.startsWith('@h ')) {
      const q = trimmed.replace(/^@(history|h)\s*/i, '').trim().toLowerCase();
      const matches = (State.history || []).filter(h => 
        !q || (h.title && h.title.toLowerCase().includes(q)) || (h.url && h.url.toLowerCase().includes(q))
      );
      this.currentSuggestions = matches.slice(0, 8).map(h => ({
        type: 'history',
        title: h.title || h.url,
        url: h.url
      }));
      if (this.currentSuggestions.length === 0) {
        this.currentSuggestions = [{ type: 'history', title: `No history matching "${q}"`, url: '' }];
      }
      this.selectedIndex = 0;
      this.renderSuggestions();
      return;
    }

    if (trimmed.startsWith('@tabs') || trimmed.startsWith('@t ')) {
      const q = trimmed.replace(/^@(tabs|t)\s*/i, '').trim().toLowerCase();
      const matches = (State.tabs || []).filter(t => 
        !q || (t.title && t.title.toLowerCase().includes(q)) || (t.url && t.url.toLowerCase().includes(q))
      );
      this.currentSuggestions = matches.slice(0, 8).map(t => ({
        type: 'tab',
        title: `Switch to: ${t.title || 'Tab'}`,
        url: t.url,
        tabId: t.id
      }));
      if (this.currentSuggestions.length === 0) {
        this.currentSuggestions = [{ type: 'tab', title: `No open tabs matching "${q}"`, url: '' }];
      }
      this.selectedIndex = 0;
      this.renderSuggestions();
      return;
    }

    if (trimmed.startsWith('@yt')) {
      const q = trimmed.replace(/^@yt\s*/i, '').trim();
      this.currentSuggestions = [{
        type: 'search',
        engine: 'youtube',
        title: q ? `▶ Search YouTube for "${q}"` : '▶ Search YouTube (Type search term)',
        url: q ? `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` : 'https://www.youtube.com'
      }];
      this.selectedIndex = 0;
      this.renderSuggestions();
      return;
    }

    if (trimmed.startsWith('@wiki')) {
      const q = trimmed.replace(/^@wiki\s*/i, '').trim();
      this.currentSuggestions = [{
        type: 'search',
        engine: 'wikipedia',
        title: q ? `📚 Search Wikipedia for "${q}"` : '📚 Search Wikipedia (Type search term)',
        url: q ? `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}` : 'https://en.wikipedia.org'
      }];
      this.selectedIndex = 0;
      this.renderSuggestions();
      return;
    }

    const isAiQuery = trimmed.startsWith('@ai') || trimmed.startsWith('@gemini');
    let aiPrompt = '';
    if (isAiQuery) {
      aiPrompt = trimmed.replace(/^@(ai|gemini)\s*/i, '');
    }

    const suggestions = await IpcClient.getSuggestions(query);
    this.currentSuggestions = suggestions || [];

    if (isAiQuery) {
      this.currentSuggestions.unshift({
        type: 'ai',
        title: aiPrompt ? `✨ Ask AETHER Intelligence: "${aiPrompt}"` : '✨ Ask AETHER Intelligence (Type your question)',
        url: `@ai ${aiPrompt}`,
        prompt: aiPrompt
      });
    }

    this.selectedIndex = isAiQuery ? 0 : -1;
    this.renderSuggestions();
  },

  renderSuggestions() {
    if (!this.suggestionsEl) return;
    if (this.currentSuggestions.length === 0) {
      this.closeSuggestions();
      return;
    }

    this.ensureSuggestionsBackdrop();
    this.suggestionsEl.innerHTML = '';
    this.suggestionsEl.classList.remove('hidden');

    this.currentSuggestions.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = `suggestion-item ${idx === this.selectedIndex ? 'selected' : ''}`;

      let iconHtml = Utils.icons.search;
      if (item.type === 'ai') iconHtml = Utils.icons.sparkle;
      else if (item.type === 'bookmark') iconHtml = Utils.icons.bookmark;
      else if (item.type === 'history') iconHtml = Utils.icons.history;
      else if (item.type === 'tab') iconHtml = `<span style="font-size:14px;line-height:1;">📑</span>`;
      else if (item.type === 'keyword') iconHtml = `<span style="font-size:14px;line-height:1;">⚡</span>`;
      else if (item.type === 'internal') iconHtml = Utils.icons.globe;
      else if (item.type === 'search') {
        const engineIcons = {
          duckduckgo: '🦆',
          bing: '🔷',
          ecosia: '🌿',
          yahoo: '🟣',
          google: '🌐',
          youtube: '▶️',
          wikipedia: '📚'
        };
        const activeEngine = (item.engine || (State.settings && State.settings.searchEngine) || 'google').toLowerCase();
        const iconEmoji = engineIcons[activeEngine];
        if (iconEmoji) {
          iconHtml = `<span style="font-size:14px;line-height:1;display:inline-flex;align-items:center;justify-content:center;">${iconEmoji}</span>`;
        }
      }

      el.innerHTML = `
        <div class="suggestion-icon">${iconHtml}</div>
        <div class="suggestion-content">
          <span class="suggestion-title">${Utils.escapeHtml(item.title)}</span>
          <span class="suggestion-url">${Utils.escapeHtml(item.url)}</span>
        </div>
        <span class="suggestion-type">${Utils.escapeHtml(item.type)}</span>
      `;

      el.addEventListener('click', () => {
        this.navigateToUrl(item.url, item);
      });

      this.suggestionsEl.appendChild(el);
    });
  },

  moveSelection(delta) {
    if (this.currentSuggestions.length === 0) return;
    this.selectedIndex += delta;
    if (this.selectedIndex >= this.currentSuggestions.length) {
      this.selectedIndex = 0;
    } else if (this.selectedIndex < 0) {
      this.selectedIndex = this.currentSuggestions.length - 1;
    }

    const items = this.suggestionsEl.querySelectorAll('.suggestion-item');
    items.forEach((el, idx) => {
      el.classList.toggle('selected', idx === this.selectedIndex);
    });

    // Update input preview
    if (this.selectedIndex >= 0 && this.currentSuggestions[this.selectedIndex]) {
      this.inputEl.value = this.currentSuggestions[this.selectedIndex].url;
    }
  },

  handleEnter() {
    console.log('[OMNIBOX] handleEnter called! selectedIndex:', this.selectedIndex, 'input value:', this.inputEl.value);
    if (this.selectedIndex >= 0 && this.currentSuggestions[this.selectedIndex]) {
      const selected = this.currentSuggestions[this.selectedIndex];
      console.log('[OMNIBOX] navigating to selected suggestion:', selected.url);
      this.navigateToUrl(selected.url, selected);
    } else {
      const val = this.inputEl.value.trim();
      console.log('[OMNIBOX] navigating to raw input:', val);
      if (val) {
        this.navigateToUrl(val);
      }
    }
  },

  navigateToUrl(url, item) {
    console.log('[OMNIBOX] navigateToUrl called with url:', url, 'activeTabId:', State.activeTabId);
    this.closeSuggestions();
    this.inputEl.blur();

    if (item && item.tabId) {
      IpcClient.switchTab(item.tabId);
      return;
    }

    const trimmed = (url || '').trim();
    if (!trimmed) return;

    if (trimmed.startsWith('@ai') || trimmed.startsWith('@gemini')) {
      const prompt = trimmed.replace(/^@(ai|gemini)\s*/i, '').trim();
      if (typeof AiPanel !== 'undefined') {
        AiPanel.openWithPrompt(prompt);
      }
      return;
    }

    if (trimmed.startsWith('@') && trimmed.endsWith(' ')) {
      // User selected a keyword prefix like '@bookmarks ' -> put it into the input and focus
      this.inputEl.value = trimmed;
      this.inputEl.focus();
      this.fetchSuggestions(trimmed);
      return;
    }

    IpcClient.navigateTab(State.activeTabId || '', url);
  },

  updateSearchEngine(engine) {
    if (!this.inputEl) return;
    const engineMap = {
      google: 'Google',
      duckduckgo: 'DuckDuckGo',
      bing: 'Bing',
      yahoo: 'Yahoo',
      ecosia: 'Ecosia',
      yandex: 'Yandex'
    };
    const current = (engine || (State.settings && State.settings.searchEngine) || 'google').toLowerCase();
    const label = engineMap[current] || 'the web';
    if (State.settings) {
      State.settings.searchEngine = current;
    }
    const tab = State.getActiveTab();
    if (!tab || tab.url === 'amiyo://newtab' || tab.url === 'aether://newtab') {
      this.inputEl.placeholder = `Search with ${label} or enter address`;
    }
  },

  async ensureSuggestionsBackdrop() {
    if (this.isSuggestionsBackdropActive) return;
    const tab = State.getActiveTab();
    if (tab && !tab.isInternal && tab.url && tab.url.startsWith('http')) {
      this.isSuggestionsBackdropActive = true;
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
        IpcClient.setViewVisible(false);
      }
    }
  },

  closeSuggestions() {
    if (this.suggestionsEl) {
      this.suggestionsEl.classList.add('hidden');
      this.suggestionsEl.innerHTML = '';
      this.currentSuggestions = [];
      this.selectedIndex = -1;
    }
    if (this.isSuggestionsBackdropActive) {
      this.isSuggestionsBackdropActive = false;
      const freeze = document.getElementById('freeze-backdrop');
      if (freeze) {
        freeze.classList.add('hidden');
        freeze.style.backgroundImage = '';
      }
      const tab = State.getActiveTab();
      if (tab && !tab.isInternal && IpcClient.setViewVisible) {
        IpcClient.setViewVisible(true);
      }
    }
  },

  async toggleBookmarkCurrentTab() {
    const tab = State.getActiveTab();
    if (!tab || !tab.url || tab.url === 'amiyo://newtab' || tab.url === 'aether://newtab') return;

    const existing = State.bookmarks.find(b => b.url === tab.url);
    if (existing) {
      await IpcClient.removeBookmark(existing.id);
    } else {
      await IpcClient.addBookmark({
        title: tab.title || tab.url,
        url: tab.url,
        favicon: tab.favicon
      });
    }
    const updated = await IpcClient.getBookmarks();
    State.bookmarks = updated;
    this.updateBookmarkButton(tab.url);
    BookmarksBar.render();
  },

  async showSecurityDetails() {
    const tab = State.getActiveTab();
    if (!tab) return;
    const status = await IpcClient.getSecurityStatus(tab.url);

    let info = '';
    if (status.type === 'secure') {
      info = `
        <h4 style="color:var(--success);font-weight:600;">🔒 Secure Connection</h4>
        <p style="font-size:13px;color:var(--text-secondary);margin-top:6px;">Your information (for example, passwords or credit card numbers) is private when it is sent to this site.</p>
        <p style="font-size:11px;color:var(--text-muted);margin-top:8px;">Valid SSL/TLS Certificate</p>
      `;
    } else if (status.type === 'internal') {
      info = `
        <h4 style="color:var(--accent);font-weight:600;">AETHER Browser Built-in Page</h4>
        <p style="font-size:13px;color:var(--text-secondary);margin-top:6px;">This is an internal secure application page running directly inside AETHER Browser.</p>
      `;
    } else {
      info = `
        <h4 style="color:var(--danger);font-weight:600;">⚠️ Not Secure</h4>
        <p style="font-size:13px;color:var(--text-secondary);margin-top:6px;">You should not enter any sensitive information on this site (for example, passwords or credit cards), because it could be seen by attackers.</p>
      `;
    }

    App.showModal('Site Information', `
      <div>${info}</div>
      <div style="font-size:12px;color:var(--text-muted);border-top:1px solid var(--border-subtle);padding-top:10px;margin-top:10px;">
        URL: <span style="color:var(--text-primary);">${Utils.escapeHtml(tab.url)}</span>
      </div>
    `);
  }
};

