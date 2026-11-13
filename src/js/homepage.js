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

    const engineMap = {
      google: { name: 'Google', icon: '🌐' },
      duckduckgo: { name: 'DuckDuckGo', icon: '🦆' },
      bing: { name: 'Bing', icon: '🔷' },
      yahoo: { name: 'Yahoo', icon: '🟣' },
      ecosia: { name: 'Ecosia', icon: '🌿' },
      yandex: { name: 'Yandex', icon: '🔴' }
    };
    const currentEngineKey = (State.settings && State.settings.searchEngine) ? State.settings.searchEngine.toLowerCase() : 'google';
    const currentEngine = engineMap[currentEngineKey] || engineMap.google;

    container.innerHTML = `
      <div class="chrome-ntp ${hasBg ? 'has-custom-wallpaper' : ''}" style="${hasBg ? `background-image: url('${activeWallpaper}');` : ''}">
        <!-- AETHER Nexus Top Bar -->
        <header class="chrome-ntp-header">
          <button class="chrome-nav-link" id="ntp-shields-link" style="background:none;border:none;cursor:pointer;">Shields</button>
          <button class="chrome-nav-link" id="ntp-ai-link" style="background:none;border:none;cursor:pointer;">Intelligence</button>
          <button class="chrome-icon-btn" id="ntp-apps-btn" title="AETHER Spaces">
            ${Utils.icons.apps}
          </button>
          <div class="chrome-profile-btn" id="ntp-profile-btn" title="AETHER Profile">
            <div class="chrome-profile-avatar" style="background:linear-gradient(135deg, #121B2B, #35D8F2);color:#fff;">A</div>
          </div>

          <!-- AETHER Spaces Dropdown -->
          <div class="chrome-apps-menu hidden" id="chrome-apps-menu">
            <div class="apps-grid">
              <div class="app-item" data-action="bookmarks">
                <div class="app-icon" style="background:#121B2B;color:#35D8F2;">⭐</div>
                <span>Bookmarks</span>
              </div>
              <div class="app-item" data-action="history">
                <div class="app-icon" style="background:#121B2B;color:#7AAEFF;">🕒</div>
                <span>History</span>
              </div>
              <div class="app-item" data-action="downloads">
                <div class="app-icon" style="background:#121B2B;color:#34a853;">📥</div>
                <span>Downloads</span>
              </div>
              <div class="app-item" data-action="settings">
                <div class="app-icon" style="background:#121B2B;color:#DCE3EB;">⚙️</div>
                <span>Settings</span>
              </div>
              <div class="app-item" data-action="ai">
                <div class="app-icon" style="background:#121B2B;color:#35D8F2;">✨</div>
                <span>AI Assist</span>
              </div>
              <div class="app-item" data-action="shields">
                <div class="app-icon" style="background:#121B2B;color:#38bdf8;">🛡️</div>
                <span>Shields</span>
              </div>
            </div>
          </div>
        </header>

        <!-- AETHER Nexus Main Content (The Infinite A + Search + Shortcuts) -->
        <main class="chrome-ntp-center">
          <!-- Official AETHER Infinite A Emblem & Brand Mark -->
          <div class="aether-logo-container">
            <div class="aether-brand-emblem" title="AETHER Browser — Explore Without Limits">
              <svg viewBox="0 0 512 512" width="108" height="108" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="aetherChromeLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#FFFFFF" />
                    <stop offset="25%" stop-color="#F1F5F9" />
                    <stop offset="60%" stop-color="#CBD5E1" />
                    <stop offset="100%" stop-color="#94A3B8" />
                  </linearGradient>
                  <linearGradient id="aetherChromeRight" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#CBD5E1" />
                    <stop offset="30%" stop-color="#94A3B8" />
                    <stop offset="70%" stop-color="#64748B" />
                    <stop offset="100%" stop-color="#334155" />
                  </linearGradient>
                  <linearGradient id="aetherInnerCutLeft" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#1E293B" />
                    <stop offset="70%" stop-color="#334155" />
                    <stop offset="100%" stop-color="#475569" />
                  </linearGradient>
                  <linearGradient id="aetherInnerCutRight" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#475569" />
                    <stop offset="50%" stop-color="#64748B" />
                    <stop offset="100%" stop-color="#1E293B" />
                  </linearGradient>
                  <linearGradient id="aetherOrbitGlow" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#00D4FF" stop-opacity="0" />
                    <stop offset="20%" stop-color="#00D4FF" stop-opacity="0.9" />
                    <stop offset="50%" stop-color="#35D8F2" />
                    <stop offset="80%" stop-color="#7AAEFF" />
                    <stop offset="100%" stop-color="#38BDF8" />
                  </linearGradient>
                  <linearGradient id="aetherOrbitBlade" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" stop-color="#35D8F2" stop-opacity="0.8" />
                    <stop offset="25%" stop-color="#FFFFFF" />
                    <stop offset="65%" stop-color="#E2E8F0" />
                    <stop offset="100%" stop-color="#94A3B8" />
                  </linearGradient>
                  <radialGradient id="aetherSatelliteOrb" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stop-color="#FFFFFF" />
                    <stop offset="25%" stop-color="#38BDF8" />
                    <stop offset="70%" stop-color="#0284C7" />
                    <stop offset="100%" stop-color="#0369A1" />
                  </radialGradient>
                  <filter id="aetherCyanGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="8" result="blur1" />
                    <feGaussianBlur stdDeviation="16" result="blur2" />
                    <feMerge>
                      <feMergeNode in="blur2" />
                      <feMergeNode in="blur1" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path d="M 125 315 C 80 300 85 245 155 200 C 190 178 240 155 305 130" fill="none" stroke="url(#aetherOrbitGlow)" stroke-width="14" stroke-linecap="round" opacity="0.95" filter="url(#aetherCyanGlow)" />
                <path d="M 125 315 C 80 300 85 245 155 200 C 190 178 240 155 305 130" fill="none" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" opacity="0.8" />
                <path d="M 256 68 L 108 340 L 168 340 L 256 168 Z" fill="url(#aetherChromeLeft)" />
                <path d="M 256 68 L 244 88 L 128 340 L 108 340 Z" fill="#E2E8F0" opacity="0.6" />
                <path d="M 256 68 L 256 168 L 344 340 L 404 340 Z" fill="url(#aetherChromeRight)" />
                <path d="M 256 68 L 268 88 L 384 340 L 404 340 Z" fill="#1E293B" opacity="0.75" />
                <path d="M 256 168 L 168 340 L 230 300 L 256 220 Z" fill="url(#aetherInnerCutLeft)" />
                <path d="M 256 168 L 256 220 L 282 300 L 344 340 Z" fill="url(#aetherInnerCutRight)" />
                <circle cx="256" cy="68" r="4.5" fill="#FFFFFF" filter="url(#aetherCyanGlow)" />
                <path d="M 118 316 C 170 330 250 320 330 260 C 380 220 415 170 435 125 C 420 135 385 175 320 225 C 245 285 175 295 118 316 Z" fill="url(#aetherOrbitBlade)" />
                <path d="M 118 316 C 170 330 250 320 330 260 C 380 220 415 170 435 125" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.9" />
                <path d="M 140 318 C 200 325 270 305 340 250 C 385 210 415 165 430 130" fill="none" stroke="#00D4FF" stroke-width="3" opacity="0.8" filter="url(#aetherCyanGlow)" />
                <ellipse cx="196" cy="254" rx="32" ry="14" fill="#35D8F2" opacity="0.65" transform="rotate(-30 196 254)" filter="url(#aetherCyanGlow)" />
                <circle cx="196" cy="254" r="6" fill="#FFFFFF" />
                <circle cx="438" cy="122" r="24" fill="#00D4FF" opacity="0.35" filter="url(#aetherCyanGlow)" />
                <circle cx="438" cy="122" r="14" fill="url(#aetherSatelliteOrb)" />
                <circle cx="434" cy="118" r="4.5" fill="#FFFFFF" opacity="0.9" />
              </svg>
            </div>
            <div class="aether-brand-title">
              <span class="aether-title-main">Λ E T H E R</span>
              <span class="aether-title-sub">EXPLORE WITHOUT LIMITS.</span>
            </div>
          </div>

          <!-- AETHER Search Box with Dynamic Engine Selector -->
          <div class="chrome-search-box" id="chrome-search-box">
            <button class="ntp-engine-badge" id="ntp-engine-badge" title="Active Search Engine: ${currentEngine.name} (Click to switch engine)">
              <span class="engine-badge-icon">${currentEngine.icon}</span>
              <span class="engine-badge-name">${currentEngine.name}</span>
            </button>
            <input 
              type="text" 
              class="chrome-search-input" 
              id="newtab-search-input" 
              placeholder="Search with ${currentEngine.name} or type a URL" 
              autocomplete="off" 
              spellcheck="false" 
              autofocus 
            />
            <div class="chrome-search-tools">
              <button class="chrome-tool-btn" id="voice-search-btn" title="Search by voice">
                ${Utils.icons.mic}
              </button>
              <button class="chrome-tool-btn" id="lens-search-btn" title="AETHER Prism Lens">
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

        <!-- Floating "Customize AETHER Browser" Button -->
        <button class="chrome-customize-pill" id="customize-chrome-btn" title="Customize AETHER Browser">
          ${Utils.icons.customize}
          <span>Customize AETHER Browser</span>
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

    // 1b. Search Engine Badge Click
    container.querySelector('#ntp-engine-badge')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showCustomizeChrome();
    });

    // 1c. NTP Top Bar links
    container.querySelector('#ntp-shields-link')?.addEventListener('click', () => {
      if (typeof Omnibox !== 'undefined' && Omnibox.toggleShieldsPopover) {
        Omnibox.toggleShieldsPopover();
      }
    });

    container.querySelector('#ntp-ai-link')?.addEventListener('click', () => {
      if (typeof AiPanel !== 'undefined') {
        AiPanel.toggle();
      }
    });

    // 2. Voice Search Button
    container.querySelector('#voice-search-btn')?.addEventListener('click', () => {
      this.activateVoiceSearch(searchInput);
    });

    // 3. Google Lens Button
    container.querySelector('#lens-search-btn')?.addEventListener('click', () => {
      this.showGoogleLensModal();
    });

    // 4. AETHER Spaces / Apps Button
    const appsBtn = container.querySelector('#ntp-apps-btn');
    const appsMenu = container.querySelector('#chrome-apps-menu');
    if (appsBtn && appsMenu) {
      appsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        appsMenu.classList.toggle('hidden');
      });
      appsMenu.querySelectorAll('.app-item').forEach(item => {
        item.addEventListener('click', () => {
          appsMenu.classList.add('hidden');
          const action = item.dataset.action;
          const url = item.dataset.url;
          if (action === 'bookmarks') IpcClient.createTab('aether://bookmarks');
          else if (action === 'history') IpcClient.createTab('aether://history');
          else if (action === 'downloads') IpcClient.createTab('aether://downloads');
          else if (action === 'settings') IpcClient.createTab('aether://settings');
          else if (action === 'ai' && typeof AiPanel !== 'undefined') AiPanel.toggle();
          else if (action === 'shields' && typeof Omnibox !== 'undefined') Omnibox.toggleShieldsPopover();
          else if (url) IpcClient.navigateTab(State.activeTabId || '', url);
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
          <h3 style="margin:0;font-size:16px;color:var(--text-primary);">AETHER Browser User</h3>
          <p style="margin:4px 0 0;font-size:13px;color:var(--text-secondary);">user@aether.local</p>
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
    const currentEngine = (State.settings && State.settings.searchEngine) ? State.settings.searchEngine.toLowerCase() : 'google';

    App.showModal('Customize AETHER Browser', `
      <div style="display:flex;flex-direction:column;gap:20px;max-height:65vh;overflow-y:auto;padding-right:4px;">
        <!-- Background Wallpaper Section -->
        <div>
          <h4 style="margin:0 0 10px;font-size:14px;color:var(--text-primary);">Background Wallpapers</h4>
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;">
            ${this.wallpapers.map(w => `
              <div 
                class="wallpaper-card ${activeWallpaper === w.url ? 'active' : ''}" 
                data-url="${Utils.escapeHtml(w.url)}"
                style="height:64px;border-radius:8px;border:2px solid ${activeWallpaper === w.url ? 'var(--cyan-accent, #35D8F2)' : 'var(--border-subtle)'};background:${w.url ? `url('${w.url}') center/cover` : 'var(--bg-tertiary)'};cursor:pointer;display:flex;align-items:flex-end;padding:4px 6px;text-shadow:0 1px 3px rgba(0,0,0,0.8);"
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
            <button class="chrome-theme-choice ${currentTheme === 'dark' ? 'active' : ''}" id="choice-theme-dark" style="padding:14px;border-radius:8px;border:2px solid ${currentTheme === 'dark' ? 'var(--cyan-accent, #35D8F2)' : 'var(--border-subtle)'};background:#0B0F14;color:#DCE3EB;cursor:pointer;font-size:13px;font-weight:600;">
              🌙 Obsidian Dark
            </button>
            <button class="chrome-theme-choice ${currentTheme === 'light' ? 'active' : ''}" id="choice-theme-light" style="padding:14px;border-radius:8px;border:2px solid ${currentTheme === 'light' ? 'var(--cyan-accent, #35D8F2)' : 'var(--border-subtle)'};background:#ffffff;color:#121B2B;cursor:pointer;font-size:13px;font-weight:600;">
              ☀️ Modern Light
            </button>
            <button class="chrome-theme-choice" id="choice-theme-cyan" style="padding:14px;border-radius:8px;border:2px solid var(--border-subtle);background:#121B2B;color:#35D8F2;cursor:pointer;font-size:13px;font-weight:600;">
              ⚡ AETHER Cyan
            </button>
          </div>
        </div>

        <!-- Shortcuts Toggle -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg-tertiary);border-radius:8px;">
          <div>
            <div style="font-size:14px;font-weight:500;color:var(--text-primary);">Show shortcuts</div>
            <div style="font-size:12px;color:var(--text-secondary);">Display quick shortcut icons on the New Tab page</div>
          </div>
          <input type="checkbox" id="toggle-shortcuts-cb" ${showShortcuts ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--cyan-accent, #35D8F2);cursor:pointer;" />
        </div>

        <!-- Search Engine -->
        <div>
          <h4 style="margin:0 0 8px;font-size:14px;color:var(--text-primary);">Default Search Engine</h4>
          <select id="customize-search-select" class="settings-select" style="width:100%;padding:10px 12px;border-radius:8px;background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border-subtle);font-size:14px;cursor:pointer;">
            <option value="google" ${(!currentEngine || currentEngine === 'google') ? 'selected' : ''}>🌐 Google (Default)</option>
            <option value="duckduckgo" ${currentEngine === 'duckduckgo' ? 'selected' : ''}>🦆 DuckDuckGo (Privacy & Anti-Tracking)</option>
            <option value="bing" ${currentEngine === 'bing' ? 'selected' : ''}>🔷 Bing (Microsoft)</option>
            <option value="yahoo" ${currentEngine === 'yahoo' ? 'selected' : ''}>🟣 Yahoo</option>
            <option value="ecosia" ${currentEngine === 'ecosia' ? 'selected' : ''}>🌿 Ecosia (Eco)</option>
          </select>
        </div>
      </div>
    `, [
      {
        label: 'Done',
        class: 'btn-primary',
        click: async () => {
          const selectEl = document.getElementById('customize-search-select');
          if (selectEl && selectEl.value) {
            const selected = selectEl.value;
            State.settings.searchEngine = selected;
            await IpcClient.saveSettings({ searchEngine: selected });
            if (typeof Omnibox !== 'undefined' && Omnibox.updateSearchEngine) {
              Omnibox.updateSearchEngine(selected);
            }
            this.updateSearchPlaceholder(selected);
          }
          App.closeModal();
          const container = document.getElementById('internal-page-container');
          if (container) {
            this.render(container);
          }
          if (typeof Omnibox !== 'undefined') {
            Omnibox.update();
          }
        }
      }
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
    document.getElementById('choice-theme-dark')?.addEventListener('click', async () => {
      ThemeManager.setTheme('dark');
      await IpcClient.saveSettings({ theme: 'dark' });
      this.render(document.getElementById('internal-page-container'));
      App.closeModal();
    });
    document.getElementById('choice-theme-light')?.addEventListener('click', async () => {
      ThemeManager.setTheme('light');
      await IpcClient.saveSettings({ theme: 'light' });
      this.render(document.getElementById('internal-page-container'));
      App.closeModal();
    });
    document.getElementById('choice-theme-cyan')?.addEventListener('click', async () => {
      ThemeManager.setTheme('dark');
      document.documentElement.style.setProperty('--accent', '#35D8F2');
      document.documentElement.style.setProperty('--border-focus', '#35D8F2');
      await IpcClient.saveSettings({ theme: 'dark' });
      this.render(document.getElementById('internal-page-container'));
      App.closeModal();
    });

    // Shortcuts toggle
    document.getElementById('toggle-shortcuts-cb')?.addEventListener('change', (e) => {
      this.setShortcutsVisible(e.target.checked);
      const section = document.getElementById('chrome-shortcuts-section');
      if (section) section.classList.toggle('hidden', !e.target.checked);
    });

    // Search Engine change (listen to both change and input events for instant persistence)
    const handleEngineChange = async (selected) => {
      State.settings.searchEngine = selected;
      await IpcClient.saveSettings({ searchEngine: selected });
      if (typeof Omnibox !== 'undefined' && Omnibox.updateSearchEngine) {
        Omnibox.updateSearchEngine(selected);
      }
      this.updateSearchPlaceholder(selected);
    };

    const engineSelect = document.getElementById('customize-search-select');
    if (engineSelect) {
      engineSelect.addEventListener('change', (e) => handleEngineChange(e.target.value));
      engineSelect.addEventListener('input', (e) => handleEngineChange(e.target.value));
    }
  },

  updateSearchPlaceholder(engine) {
    const engineMap = {
      google: { name: 'Google', icon: '🌐' },
      duckduckgo: { name: 'DuckDuckGo', icon: '🦆' },
      bing: { name: 'Bing', icon: '🔷' },
      yahoo: { name: 'Yahoo', icon: '🟣' },
      ecosia: { name: 'Ecosia', icon: '🌿' },
      yandex: { name: 'Yandex', icon: '🔴' }
    };
    const key = (engine || 'google').toLowerCase();
    const item = engineMap[key] || engineMap.google;
    const input = document.getElementById('newtab-search-input');
    if (input) {
      input.placeholder = `Search with ${item.name} or type a URL`;
    }
    const badge = document.getElementById('ntp-engine-badge');
    if (badge) {
      badge.innerHTML = `<span class="engine-badge-icon">${item.icon}</span> <span class="engine-badge-name">${item.name}</span>`;
      badge.title = `Active Search Engine: ${item.name} (Click to switch engine)`;
    }
  },

  getWallpaper() {
    return localStorage.getItem('aether_ntp_wallpaper') || localStorage.getItem('amiyo_ntp_wallpaper') || '';
  },

  setWallpaper(url) {
    if (url) {
      localStorage.setItem('aether_ntp_wallpaper', url);
      localStorage.setItem('amiyo_ntp_wallpaper', url);
    } else {
      localStorage.removeItem('aether_ntp_wallpaper');
      localStorage.removeItem('amiyo_ntp_wallpaper');
    }
  },

  getShortcuts() {
    try {
      const saved = localStorage.getItem('aether_shortcuts') || localStorage.getItem('amiyo_shortcuts');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return this.defaultShortcuts;
  },

  saveShortcuts(shortcuts) {
    const json = JSON.stringify(shortcuts);
    localStorage.setItem('aether_shortcuts', json);
    localStorage.setItem('amiyo_shortcuts', json);
  },

  getShortcutsVisible() {
    const val = localStorage.getItem('aether_show_shortcuts');
    if (val !== null) return val !== 'false';
    return localStorage.getItem('amiyo_show_shortcuts') !== 'false';
  },

  setShortcutsVisible(val) {
    const str = val ? 'true' : 'false';
    localStorage.setItem('aether_show_shortcuts', str);
    localStorage.setItem('amiyo_show_shortcuts', str);
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
