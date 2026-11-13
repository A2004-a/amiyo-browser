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
      if (tab.url === 'amiyo://newtab') {
        this.inputEl.value = '';
        this.inputEl.placeholder = 'Search with Google or enter address';
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
      const count = stats?.blockedCount || 0;
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

  async toggleShieldsPopover() {
    if (!this.shieldsPopoverEl) return;
    const isHidden = this.shieldsPopoverEl.classList.contains('hidden');
    if (!isHidden) {
      this.shieldsPopoverEl.classList.add('hidden');
      return;
    }

    // Populate data
    const tab = State.getActiveTab();
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
        if (blockedCountEl) blockedCountEl.textContent = tabStats?.blockedCount || 0;
        if (masterToggle) masterToggle.checked = status?.enabled !== false;
        
        const isWhitelisted = status?.whitelist?.includes(hostname);
        if (siteBtn) {
          siteBtn.textContent = isWhitelisted ? `Turn Shields ON for ${hostname}` : `Turn Shields OFF for ${hostname}`;
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
            this.toggleShieldsPopover(); // close
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
        this.shieldsPopoverEl.classList.add('hidden');
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
      this.securityBadgeEl.title = 'AMIYO System Page';
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
        title: aiPrompt ? `✨ Ask AMIYO AI: "${aiPrompt}"` : '✨ Ask AMIYO AI (Type your question)',
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

    this.suggestionsEl.innerHTML = '';
    this.suggestionsEl.classList.remove('hidden');

    this.currentSuggestions.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = `suggestion-item ${idx === this.selectedIndex ? 'selected' : ''}`;

      let iconHtml = Utils.icons.search;
      if (item.type === 'ai') iconHtml = Utils.icons.sparkle;
      else if (item.type === 'bookmark') iconHtml = Utils.icons.bookmark;
      else if (item.type === 'history') iconHtml = Utils.icons.history;
      else if (item.type === 'internal') iconHtml = Utils.icons.globe;

      el.innerHTML = `
        <div class="suggestion-icon">${iconHtml}</div>
        <div class="suggestion-content">
          <span class="suggestion-title">${Utils.escapeHtml(item.title)}</span>
          <span class="suggestion-url">${Utils.escapeHtml(item.url)}</span>
        </div>
        <span class="suggestion-type">${Utils.escapeHtml(item.type)}</span>
      `;

      el.addEventListener('click', () => {
        this.navigateToUrl(item.url);
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
      console.log('[OMNIBOX] navigating to selected suggestion:', this.currentSuggestions[this.selectedIndex].url);
      this.navigateToUrl(this.currentSuggestions[this.selectedIndex].url);
    } else {
      const val = this.inputEl.value.trim();
      console.log('[OMNIBOX] navigating to raw input:', val);
      if (val) {
        this.navigateToUrl(val);
      }
    }
  },

  navigateToUrl(url) {
    console.log('[OMNIBOX] navigateToUrl called with url:', url, 'activeTabId:', State.activeTabId);
    this.closeSuggestions();
    this.inputEl.blur();

    const trimmed = (url || '').trim();
    if (trimmed.startsWith('@ai') || trimmed.startsWith('@gemini')) {
      const prompt = trimmed.replace(/^@(ai|gemini)\s*/i, '').trim();
      if (typeof AiPanel !== 'undefined') {
        AiPanel.openWithPrompt(prompt);
      }
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
    const label = engineMap[(engine || 'google').toLowerCase()] || 'the web';
    this.inputEl.placeholder = `Search with ${label} or enter address`;
  },

  closeSuggestions() {
    if (this.suggestionsEl) {
      this.suggestionsEl.classList.add('hidden');
      this.suggestionsEl.innerHTML = '';
      this.currentSuggestions = [];
      this.selectedIndex = -1;
    }
  },

  async toggleBookmarkCurrentTab() {
    const tab = State.getActiveTab();
    if (!tab || !tab.url || tab.url === 'amiyo://newtab') return;

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
        <h4 style="color:var(--accent);font-weight:600;">AMIYO Browser Built-in Page</h4>
        <p style="font-size:13px;color:var(--text-secondary);margin-top:6px;">This is an internal secure application page running directly inside AMIYO Browser.</p>
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

