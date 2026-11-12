const Homepage = {
  clockInterval: null,

  defaultShortcuts: [
    { title: 'Google', url: 'https://www.google.com', icon: 'https://www.google.com/favicon.ico' },
    { title: 'YouTube', url: 'https://www.youtube.com', icon: 'https://www.youtube.com/s/desktop/f719b161/img/favicon.ico' },
    { title: 'Gmail', url: 'https://mail.google.com', icon: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico' },
    { title: 'GitHub', url: 'https://github.com', icon: 'https://github.githubassets.com/favicons/favicon.png' },
    { title: 'Wikipedia', url: 'https://www.wikipedia.org', icon: 'https://www.wikipedia.org/static/favicon/wikipedia.ico' },
    { title: 'Maps', url: 'https://maps.google.com', icon: 'https://www.google.com/images/branding/product/ico/maps15_bnu.ico' },
    { title: 'Reddit', url: 'https://www.reddit.com', icon: 'https://www.redditstatic.com/shreddit/assets/favicon/192x192.png' },
    { title: 'Twitter / X', url: 'https://x.com', icon: 'https://abs.twimg.com/favicons/twitter.3.ico' }
  ],

  wallpapers: [
    { id: 'none', name: 'Classic Clean', url: '' },
    { id: 'aurora', name: 'Aurora Borealis', url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&q=80' },
    { id: 'mountains', name: 'Earth & Mountains', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1920&q=80' },
    { id: 'city', name: 'Cyber Cityscape', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1920&q=80' },
    { id: 'abstract', name: 'Minimal Flow', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1920&q=80' },
    { id: 'ocean', name: 'Deep Ocean', url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1920&q=80' }
  ],

  render(container) {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }

    const shortcuts = this.getShortcuts();
    const showShortcuts = this.getShortcutsVisible();
    const activeWallpaper = this.getWallpaper();

    const hasBg = Boolean(activeWallpaper);

    container.innerHTML = `
      <div class="chrome-ntp ${hasBg ? 'has-custom-wallpaper' : ''}" style="${hasBg ? `background-image: url('${activeWallpaper}');` : ''}">
        <!-- Chrome NTP Top-Right Bar -->
        <header class="chrome-ntp-header">
          <a href="https://mail.google.com" class="chrome-nav-link" id="ntp-gmail-link">Gmail</a>
          <a href="https://images.google.com" class="chrome-nav-link" id="ntp-images-link">Images</a>
          <button class="chrome-icon-btn" id="ntp-apps-btn" title="Google apps">
            ${Utils.icons.apps}
          </button>
          <div class="chrome-profile-btn" id="ntp-profile-btn" title="AMIYO Profile">
            <div class="chrome-profile-avatar">A</div>
          </div>

          <!-- Google Apps 9-Dots Dropdown -->
          <div class="chrome-apps-menu hidden" id="chrome-apps-menu">
            <div class="apps-grid">
              <div class="app-item" data-url="https://www.google.com">
                <div class="app-icon" style="background:#e8f0fe;color:#1a73e8;">🔍</div>
                <span>Search</span>
              </div>
              <div class="app-item" data-url="https://maps.google.com">
                <div class="app-icon" style="background:#e6f4ea;color:#1e8e3e;">🗺️</div>
                <span>Maps</span>
              </div>
              <div class="app-item" data-url="https://www.youtube.com">
                <div class="app-icon" style="background:#fce8e6;color:#d93025;">▶️</div>
                <span>YouTube</span>
              </div>
              <div class="app-item" data-url="https://mail.google.com">
                <div class="app-icon" style="background:#fce8e6;color:#d93025;">✉️</div>
                <span>Gmail</span>
              </div>
              <div class="app-item" data-url="https://news.google.com">
                <div class="app-icon" style="background:#e8f0fe;color:#1a73e8;">📰</div>
                <span>News</span>
              </div>
              <div class="app-item" data-url="https://meet.google.com">
                <div class="app-icon" style="background:#e6f4ea;color:#1e8e3e;">📹</div>
                <span>Meet</span>
              </div>
              <div class="app-item" data-url="https://drive.google.com">
                <div class="app-icon" style="background:#fef7e0;color:#f9ab00;">📁</div>
                <span>Drive</span>
              </div>
              <div class="app-item" data-url="https://calendar.google.com">
                <div class="app-icon" style="background:#e8f0fe;color:#1a73e8;">📅</div>
                <span>Calendar</span>
              </div>
              <div class="app-item" data-url="https://translate.google.com">
                <div class="app-icon" style="background:#e8f0fe;color:#1a73e8;">🌐</div>
                <span>Translate</span>
              </div>
            </div>
          </div>
        </header>

        <!-- Chrome NTP Main Content (Logo + Search + Shortcuts) -->
        <main class="chrome-ntp-center">
          <!-- Google Chrome Colorful Brand Logo -->
          <div class="chrome-logo-container">
            <div class="chrome-google-logo">
              <span class="c-blue">G</span><span class="c-red">o</span><span class="c-yellow">o</span><span class="c-blue">g</span><span class="c-green">l</span><span class="c-red">e</span>
            </div>
          </div>

          <!-- Chrome Omnibox Search Container -->
          <div class="chrome-search-box" id="chrome-search-box">
            <div class="chrome-search-icon">${Utils.icons.search}</div>
            <input 
              type="text" 
              class="chrome-search-input" 
              id="newtab-search-input" 
              placeholder="Search Google or type a URL" 
              autocomplete="off" 
              spellcheck="false" 
              autofocus 
            />
            <div class="chrome-search-tools">
              <button class="chrome-tool-btn" id="voice-search-btn" title="Search by voice">
                ${Utils.icons.mic}
              </button>
              <button class="chrome-tool-btn" id="lens-search-btn" title="Search by image">
                ${Utils.icons.lens}
              </button>
            </div>

            <!-- Real-time NTP Search Suggestions Dropdown -->
            <div class="chrome-ntp-suggestions hidden" id="ntp-suggestions-dropdown"></div>
          </div>

          <!-- Chrome Quick Shortcuts Grid -->
          <div class="chrome-shortcuts-section ${showShortcuts ? '' : 'hidden'}" id="chrome-shortcuts-section">
            <div class="chrome-shortcuts-grid" id="shortcuts-grid">
              ${shortcuts.map((s, idx) => `
                <div class="chrome-shortcut-tile" data-url="${Utils.escapeHtml(s.url)}" data-idx="${idx}" title="${Utils.escapeHtml(s.title)}">
                  <button class="shortcut-actions-btn" data-idx="${idx}" title="More options">
                    ${Utils.icons.more}
                  </button>
                  <div class="chrome-shortcut-circle">
                    ${s.icon ? `<img src="${Utils.escapeHtml(s.icon)}" onerror="this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.style.display='flex';" />` : ''}
                    <div class="shortcut-fallback" style="${s.icon ? 'display:none;' : ''}">
                      ${Utils.escapeHtml((s.title && s.title[0]) || 'W')}
                    </div>
                  </div>
                  <div class="chrome-shortcut-label">${Utils.escapeHtml(s.title)}</div>
                </div>
              `).join('')}

              <div class="chrome-shortcut-tile add-tile" id="add-shortcut-btn" title="Add shortcut">
                <div class="chrome-shortcut-circle add-circle">
                  ${Utils.icons.plus}
                </div>
                <div class="chrome-shortcut-label">Add shortcut</div>
              </div>
            </div>
          </div>
        </main>

        <!-- Chrome Floating "Customize Chrome" Button -->
        <button class="chrome-customize-pill" id="customize-chrome-btn" title="Customize this page">
          ${Utils.icons.customize}
          <span>Customize Chrome</span>
        </button>

        <!-- Shortcut Action Context Menu -->
        <div class="shortcut-context-menu hidden" id="shortcut-context-menu">
          <div class="context-item" id="ctx-edit-shortcut">Edit shortcut</div>
          <div class="context-item remove" id="ctx-remove-shortcut">Remove</div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    // 1. New Tab Search Bar
    const searchInput = container.querySelector('#newtab-search-input');
    const searchBox = container.querySelector('#chrome-search-box');
    const suggestionsEl = container.querySelector('#ntp-suggestions-dropdown');

    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = searchInput.value.trim();
          if (val) {
            IpcClient.navigateTab(State.activeTabId || '', val);
          }
        }
      });

      // Live search suggestions as user types
      const debouncedNtpSuggestions = Utils.debounce(async (val) => {
        if (!val || !val.trim()) {
          suggestionsEl?.classList.add('hidden');
          return;
        }
        try {
          const suggestions = await IpcClient.getSuggestions(val.trim());
          if (suggestions && suggestions.length > 0 && suggestionsEl) {
            suggestionsEl.innerHTML = suggestions.slice(0, 6).map(s => `
              <div class="ntp-suggestion-row" data-url="${Utils.escapeHtml(s.url)}">
                <div class="sugg-icon">${s.type === 'bookmark' ? Utils.icons.bookmark : s.type === 'history' ? Utils.icons.history : Utils.icons.search}</div>
                <span class="sugg-text">${Utils.escapeHtml(s.title || s.query)}</span>
              </div>
            `).join('');

            suggestionsEl.querySelectorAll('.ntp-suggestion-row').forEach(row => {
              row.addEventListener('click', () => {
                const url = row.dataset.url;
                if (url) IpcClient.navigateTab(State.activeTabId || '', url);
              });
            });

            suggestionsEl.classList.remove('hidden');
          } else {
            suggestionsEl?.classList.add('hidden');
          }
        } catch (err) {
          suggestionsEl?.classList.add('hidden');
        }
      }, 150);

      searchInput.addEventListener('input', (e) => {
        debouncedNtpSuggestions(e.target.value);
      });
    }

    // 2. Voice Search Button
    container.querySelector('#voice-search-btn')?.addEventListener('click', () => {
      this.activateVoiceSearch(searchInput);
    });

    // 3. Google Lens Button
    container.querySelector('#lens-search-btn')?.addEventListener('click', () => {
      this.showGoogleLensModal();
    });

    // 4. Google Apps 9-Dots Button
    const appsBtn = container.querySelector('#ntp-apps-btn');
    const appsMenu = container.querySelector('#chrome-apps-menu');
    if (appsBtn && appsMenu) {
      appsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        appsMenu.classList.toggle('hidden');
      });
      appsMenu.querySelectorAll('.app-item').forEach(item => {
        item.addEventListener('click', () => {
          const url = item.dataset.url;
          if (url) IpcClient.navigateTab(State.activeTabId || '', url);
        });
      });
    }

    // 5. Profile Avatar Button
    container.querySelector('#ntp-profile-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showProfileMenu();
    });

    // 6. Shortcut Tiles Click
    container.querySelectorAll('.chrome-shortcut-tile[data-url]').forEach(tile => {
      tile.addEventListener('click', (e) => {
        if (e.target.closest('.shortcut-actions-btn')) return;
        const url = tile.dataset.url;
        if (url) IpcClient.navigateTab(State.activeTabId || '', url);
      });
    });

    // 7. Shortcut More Options (3-dots)
    const ctxMenu = container.querySelector('#shortcut-context-menu');
    let activeShortcutIdx = null;

    container.querySelectorAll('.shortcut-actions-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        activeShortcutIdx = parseInt(btn.dataset.idx, 10);
        const rect = btn.getBoundingClientRect();
        if (ctxMenu) {
          ctxMenu.style.top = `${rect.bottom + 6}px`;
          ctxMenu.style.left = `${rect.left - 100}px`;
          ctxMenu.classList.remove('hidden');
        }
      });
    });

    // Edit Shortcut
    container.querySelector('#ctx-edit-shortcut')?.addEventListener('click', () => {
      ctxMenu?.classList.add('hidden');
      if (activeShortcutIdx !== null) {
        this.promptEditShortcut(activeShortcutIdx);
      }
    });

    // Remove Shortcut
    container.querySelector('#ctx-remove-shortcut')?.addEventListener('click', () => {
      ctxMenu?.classList.add('hidden');
      if (activeShortcutIdx !== null) {
        const shortcuts = this.getShortcuts();
        shortcuts.splice(activeShortcutIdx, 1);
        this.saveShortcuts(shortcuts);
        this.render(document.getElementById('internal-page-container'));
      }
    });

    // 8. Add Shortcut Button
    container.querySelector('#add-shortcut-btn')?.addEventListener('click', () => {
      this.promptAddShortcut();
    });

    // 9. "Customize Chrome" Button
    container.querySelector('#customize-chrome-btn')?.addEventListener('click', () => {
      this.showCustomizeChrome();
    });

    // Close overlays when clicking outside
    document.addEventListener('click', (e) => {
      if (appsMenu && !appsMenu.contains(e.target) && e.target !== appsBtn) {
        appsMenu.classList.add('hidden');
      }
      if (ctxMenu && !ctxMenu.contains(e.target)) {
        ctxMenu.classList.add('hidden');
      }
      if (suggestionsEl && !searchBox?.contains(e.target)) {
        suggestionsEl.classList.add('hidden');
      }
    });
  },

  activateVoiceSearch(inputEl) {
    App.showModal('Voice Search', `
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:18px;padding:16px 0;">
        <div class="voice-search-pulsing-circle" style="width:72px;height:72px;border-radius:50%;background:#e8f0fe;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 10px rgba(66, 133, 244, 0.2);animation:pulse 1.5s infinite;">
          <div style="width:36px;height:36px;">${Utils.icons.mic}</div>
        </div>
        <div>
          <h3 style="margin:0;font-size:18px;color:var(--text-primary);" id="voice-modal-status">Listening...</h3>
          <p style="margin:6px 0 0;font-size:13px;color:var(--text-secondary);">Say something like "weather today" or "news"</p>
        </div>
      </div>
    `, [
      { label: 'Cancel', class: 'btn-secondary', click: () => App.closeModal() }
    ]);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          App.closeModal();
          if (inputEl) inputEl.value = transcript;
          IpcClient.navigateTab(State.activeTabId || '', transcript);
        };
        recognition.onerror = () => {
          const statusEl = document.getElementById('voice-modal-status');
          if (statusEl) statusEl.textContent = 'Could not hear audio';
        };
        recognition.start();
        return;
      } catch (err) {}
    }
  },

  showGoogleLensModal() {
    App.showModal('Search any image with Google Lens', `
      <div style="display:flex;flex-direction:column;gap:16px;padding:8px 0;">
        <p style="font-size:13px;color:var(--text-secondary);margin:0;">
          Search by image to find products, landmarks, plants, translation, or similar visuals.
        </p>
        <div>
          <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">Paste Image Link</label>
          <input type="text" id="lens-image-url" class="settings-input" style="width:100%;padding:10px;border-radius:8px;background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border-subtle);" placeholder="https://example.com/image.jpg" />
        </div>
      </div>
    `, [
      { label: 'Cancel', class: 'btn-secondary', click: () => App.closeModal() },
      {
        label: 'Search Image',
        class: 'btn-primary',
        click: () => {
          const imgUrl = document.getElementById('lens-image-url')?.value.trim();
          App.closeModal();
          if (imgUrl) {
            IpcClient.navigateTab(State.activeTabId || '', `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imgUrl)}`);
          } else {
            IpcClient.navigateTab(State.activeTabId || '', 'https://images.google.com');
          }
        }
      }
    ]);
  },

  showProfileMenu() {
    App.showModal('Google Account', `
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:8px 0;">
        <div style="width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg, #4285f4, #34a853);color:#fff;font-size:28px;font-weight:700;display:flex;align-items:center;justify-content:center;">A</div>
        <div>
          <h3 style="margin:0;font-size:16px;color:var(--text-primary);">AMIYO Browser User</h3>
          <p style="margin:4px 0 0;font-size:13px;color:var(--text-secondary);">user@amiyo.local</p>
        </div>
        <div style="width:100%;background:var(--bg-tertiary);border-radius:8px;padding:12px;margin-top:8px;display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:13px;color:var(--text-secondary);">Sync is on</span>
          <span style="font-size:12px;font-weight:600;color:var(--success);">● Active</span>
        </div>
      </div>
    `, [
      { label: 'Close', class: 'btn-secondary', click: () => App.closeModal() },
      { label: 'Manage Account', class: 'btn-primary', click: () => { App.closeModal(); IpcClient.navigateTab(State.activeTabId, 'https://myaccount.google.com'); } }
    ]);
  },

  showCustomizeChrome() {
    const currentTheme = State.settings.theme || 'dark';
    const showShortcuts = this.getShortcutsVisible();
    const activeWallpaper = this.getWallpaper();

    App.showModal('Customize Chrome', `
      <div style="display:flex;flex-direction:column;gap:20px;max-height:65vh;overflow-y:auto;padding-right:4px;">
        <!-- Background Wallpaper Section -->
        <div>
          <h4 style="margin:0 0 10px;font-size:14px;color:var(--text-primary);">Background Wallpapers</h4>
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;">
            ${this.wallpapers.map(w => `
              <div 
                class="wallpaper-card ${activeWallpaper === w.url ? 'active' : ''}" 
                data-url="${Utils.escapeHtml(w.url)}"
                style="height:64px;border-radius:8px;border:2px solid ${activeWallpaper === w.url ? '#4285f4' : 'var(--border-subtle)'};background:${w.url ? `url('${w.url}') center/cover` : 'var(--bg-tertiary)'};cursor:pointer;display:flex;align-items:flex-end;padding:4px 6px;text-shadow:0 1px 3px rgba(0,0,0,0.8);"
              >
                <span style="font-size:11px;font-weight:600;color:#fff;">${w.name}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Theme Mode -->
        <div>
          <h4 style="margin:0 0 10px;font-size:14px;color:var(--text-primary);">Color & Theme</h4>
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;">
            <button class="chrome-theme-choice ${currentTheme === 'dark' ? 'active' : ''}" id="choice-theme-dark" style="padding:14px;border-radius:8px;border:2px solid ${currentTheme === 'dark' ? '#4285f4' : 'var(--border-subtle)'};background:#202124;color:#fff;cursor:pointer;font-size:13px;font-weight:500;">
              🌙 Dark
            </button>
            <button class="chrome-theme-choice ${currentTheme === 'light' ? 'active' : ''}" id="choice-theme-light" style="padding:14px;border-radius:8px;border:2px solid ${currentTheme === 'light' ? '#4285f4' : 'var(--border-subtle)'};background:#ffffff;color:#202124;cursor:pointer;font-size:13px;font-weight:500;">
              ☀️ Light
            </button>
            <button class="chrome-theme-choice" id="choice-theme-classic" style="padding:14px;border-radius:8px;border:2px solid var(--border-subtle);background:#1a73e8;color:#fff;cursor:pointer;font-size:13px;font-weight:500;">
              🔷 Chrome Blue
            </button>
          </div>
        </div>

        <!-- Shortcuts Toggle -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-tertiary);border-radius:8px;">
          <div>
            <div style="font-size:14px;font-weight:500;color:var(--text-primary);">Show shortcuts</div>
            <div style="font-size:12px;color:var(--text-secondary);">Display quick shortcut icons on the New Tab page</div>
          </div>
          <input type="checkbox" id="toggle-shortcuts-cb" ${showShortcuts ? 'checked' : ''} style="width:18px;height:18px;accent-color:#4285f4;cursor:pointer;" />
        </div>

        <!-- Search Engine -->
        <div>
          <h4 style="margin:0 0 8px;font-size:14px;color:var(--text-primary);">Search Engine</h4>
          <select id="customize-search-select" class="settings-select" style="width:100%;padding:10px;border-radius:8px;background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border-subtle);">
            <option value="google" ${State.settings.searchEngine === 'google' ? 'selected' : ''}>Google (Default)</option>
            <option value="duckduckgo" ${State.settings.searchEngine === 'duckduckgo' ? 'selected' : ''}>DuckDuckGo</option>
            <option value="bing" ${State.settings.searchEngine === 'bing' ? 'selected' : ''}>Bing</option>
          </select>
        </div>
      </div>
    `, [
      { label: 'Done', class: 'btn-primary', click: () => App.closeModal() }
    ]);

    // Wallpaper clicks
    document.querySelectorAll('.wallpaper-card').forEach(card => {
      card.addEventListener('click', () => {
        const url = card.dataset.url;
        this.setWallpaper(url);
        App.closeModal();
        this.render(document.getElementById('internal-page-container'));
      });
    });

    // Theme clicks
    document.getElementById('choice-theme-dark')?.addEventListener('click', () => {
      ThemeManager.setTheme('dark');
      IpcClient.updateSettings({ theme: 'dark' });
      this.render(document.getElementById('internal-page-container'));
      App.closeModal();
    });
    document.getElementById('choice-theme-light')?.addEventListener('click', () => {
      ThemeManager.setTheme('light');
      IpcClient.updateSettings({ theme: 'light' });
      this.render(document.getElementById('internal-page-container'));
      App.closeModal();
    });
    document.getElementById('choice-theme-classic')?.addEventListener('click', () => {
      document.documentElement.style.setProperty('--accent', '#4285f4');
      document.documentElement.style.setProperty('--border-focus', '#4285f4');
      App.closeModal();
    });

    // Shortcuts toggle
    document.getElementById('toggle-shortcuts-cb')?.addEventListener('change', (e) => {
      this.setShortcutsVisible(e.target.checked);
      const section = document.getElementById('chrome-shortcuts-section');
      if (section) section.classList.toggle('hidden', !e.target.checked);
    });

    // Search Engine change
    document.getElementById('customize-search-select')?.addEventListener('change', (e) => {
      IpcClient.updateSettings({ searchEngine: e.target.value });
      State.settings.searchEngine = e.target.value;
    });
  },

  getWallpaper() {
    return localStorage.getItem('amiyo_ntp_wallpaper') || '';
  },

  setWallpaper(url) {
    if (url) {
      localStorage.setItem('amiyo_ntp_wallpaper', url);
    } else {
      localStorage.removeItem('amiyo_ntp_wallpaper');
    }
  },

  getShortcuts() {
    try {
      const saved = localStorage.getItem('amiyo_shortcuts');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return this.defaultShortcuts;
  },

  saveShortcuts(shortcuts) {
    localStorage.setItem('amiyo_shortcuts', JSON.stringify(shortcuts));
  },

  getShortcutsVisible() {
    return localStorage.getItem('amiyo_show_shortcuts') !== 'false';
  },

  setShortcutsVisible(val) {
    localStorage.setItem('amiyo_show_shortcuts', val ? 'true' : 'false');
  },

  promptAddShortcut() {
    App.showModal('Add shortcut', `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">Name</label>
          <input type="text" id="shortcut-name-input" class="settings-input" style="width:100%;padding:10px;border-radius:6px;background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border-subtle);" placeholder="e.g. YouTube" />
        </div>
        <div>
          <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">URL</label>
          <input type="text" id="shortcut-url-input" class="settings-input" style="width:100%;padding:10px;border-radius:6px;background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border-subtle);" placeholder="https://example.com" />
        </div>
      </div>
    `, [
      { label: 'Cancel', class: 'btn-secondary', click: () => App.closeModal() },
      {
        label: 'Done',
        class: 'btn-primary',
        click: () => {
          const name = document.getElementById('shortcut-name-input').value.trim();
          const url = document.getElementById('shortcut-url-input').value.trim();
          if (url) {
            const shortcuts = this.getShortcuts();
            shortcuts.push({
              title: name || url,
              url: url.startsWith('http') ? url : `https://${url}`,
              icon: Utils.getFaviconUrl(url)
            });
            this.saveShortcuts(shortcuts);
            App.closeModal();
            this.render(document.getElementById('internal-page-container'));
          }
        }
      }
    ]);
  },

  promptEditShortcut(idx) {
    const shortcuts = this.getShortcuts();
    const item = shortcuts[idx];
    if (!item) return;

    App.showModal('Edit shortcut', `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">Name</label>
          <input type="text" id="edit-shortcut-name" class="settings-input" style="width:100%;padding:10px;border-radius:6px;background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border-subtle);" value="${Utils.escapeHtml(item.title)}" />
        </div>
        <div>
          <label style="font-size:12px;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:6px;">URL</label>
          <input type="text" id="edit-shortcut-url" class="settings-input" style="width:100%;padding:10px;border-radius:6px;background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border-subtle);" value="${Utils.escapeHtml(item.url)}" />
        </div>
      </div>
    `, [
      { label: 'Cancel', class: 'btn-secondary', click: () => App.closeModal() },
      {
        label: 'Done',
        class: 'btn-primary',
        click: () => {
          const name = document.getElementById('edit-shortcut-name').value.trim();
          const url = document.getElementById('edit-shortcut-url').value.trim();
          if (url) {
            shortcuts[idx] = {
              title: name || url,
              url: url.startsWith('http') ? url : `https://${url}`,
              icon: Utils.getFaviconUrl(url)
            };
            this.saveShortcuts(shortcuts);
            App.closeModal();
            this.render(document.getElementById('internal-page-container'));
          }
        }
      }
    ]);
  }
};
