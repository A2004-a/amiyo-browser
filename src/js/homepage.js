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
    { id: 'none', name: 'Classic Clean', url: '', preview: 'var(--bg-primary)' },
    { id: 'ocean', name: 'Deep Ocean', url: 'assets/wallpapers/deep-ocean.svg', preview: 'linear-gradient(135deg, #040d1a, #0077b6)' },
    { id: 'cyber', name: 'Cyber Neon', url: 'assets/wallpapers/cyber-neon.svg', preview: 'linear-gradient(135deg, #0a0518, #ff007f 50%, #00f0ff)' },
    { id: 'aurora', name: 'Aurora Borealis', url: 'assets/wallpapers/aurora-glow.svg', preview: 'linear-gradient(135deg, #020712, #05f7a4 50%, #6366f1)' },
    { id: 'nebula', name: 'Cosmic Nebula', url: 'assets/wallpapers/cosmic-nebula.svg', preview: 'linear-gradient(135deg, #030712, #ec4899 40%, #00f0ff)' },
    { id: 'sunset', name: 'Sunset Horizon', url: 'assets/wallpapers/sunset-horizon.svg', preview: 'linear-gradient(135deg, #1e1b4b, #be185d 50%, #f59e0b)' },
    { id: 'minimal', name: 'Minimal Flow', url: 'assets/wallpapers/minimal-flow.svg', preview: 'linear-gradient(135deg, #090d16, #00f0ff 40%, #a855f7)' },
    { id: 'matrix', name: 'Obsidian Matrix', url: 'assets/wallpapers/obsidian-matrix.svg', preview: 'linear-gradient(135deg, #070b14, #1f293d 50%, #00f0ff)' },
    { id: 'mountains', name: 'Earth & Mountains', url: 'assets/wallpapers/earth-mountains.svg', preview: 'linear-gradient(135deg, #0a1128, #3a506b 60%, #5bc0be)' }
  ],

  render(container) {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }

    if (State.isPrivate) {
      this.renderIncognito(container);
      return;
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
            suggestionsEl?.classList.add('hidden');
            let targetUrl = val;
            if (targetUrl.includes('search?q=') || targetUrl.includes('duckduckgo.com/?q=') || targetUrl.includes('search?p=')) {
              try {
                const u = new URL(targetUrl);
                const qParam = u.searchParams.get('q') || u.searchParams.get('p') || u.searchParams.get('text');
                if (qParam && typeof Omnibox !== 'undefined' && Omnibox.isDirectUrl && Omnibox.isDirectUrl(qParam)) {
                  targetUrl = qParam;
                }
              } catch (err) {}
            }
            IpcClient.navigateTab(State.activeTabId || '', targetUrl);
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
                <div class="sugg-icon">${s.type === 'bookmark' ? Utils.icons.bookmark : s.type === 'history' ? Utils.icons.history : (s.type === 'navigate' || s.isDirect) ? Utils.icons.globe : Utils.icons.search}</div>
                <span class="sugg-text">${Utils.escapeHtml(s.title || s.query)}</span>
              </div>
            `).join('');

            suggestionsEl.querySelectorAll('.ntp-suggestion-row').forEach(row => {
              row.addEventListener('click', () => {
                let url = row.dataset.url;
                suggestionsEl?.classList.add('hidden');
                if (url) {
                  if (url.includes('search?q=') || url.includes('duckduckgo.com/?q=') || url.includes('search?p=')) {
                    try {
                      const u = new URL(url);
                      const qParam = u.searchParams.get('q') || u.searchParams.get('p') || u.searchParams.get('text');
                      if (qParam && typeof Omnibox !== 'undefined' && Omnibox.isDirectUrl && Omnibox.isDirectUrl(qParam)) {
                        url = qParam;
                      }
                    } catch (err) {}
                  }
                  IpcClient.navigateTab(State.activeTabId || '', url);
                }
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
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <h4 style="margin:0;font-size:14px;color:var(--text-primary);">Background Wallpapers</h4>
            <div style="display:flex;gap:8px;">
              <button id="upload-wallpaper-btn" style="background:rgba(255,255,255,0.06);border:1px solid var(--border-subtle);color:var(--text-primary);padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.15s ease;">
                📁 Upload from device
              </button>
              <input type="file" id="upload-wallpaper-file" accept="image/*" style="display:none;" />
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;">
            ${this.wallpapers.map(w => {
              const isSelected = activeWallpaper === w.url;
              return `
                <div 
                  class="wallpaper-card ${isSelected ? 'active' : ''}" 
                  data-url="${Utils.escapeHtml(w.url)}"
                  style="height:68px;border-radius:8px;border:2px solid ${isSelected ? 'var(--cyan-accent, #35D8F2)' : 'var(--border-subtle)'};background:${w.preview || 'var(--bg-tertiary)'};background-image:${w.url ? `url('${w.url}')` : 'none'};background-size:cover;background-position:center;cursor:pointer;display:flex;align-items:flex-end;justify-content:space-between;padding:6px 8px;position:relative;overflow:hidden;box-shadow:${isSelected ? '0 0 14px rgba(53, 216, 242, 0.45)' : 'none'};transition:all 0.15s ease;"
                >
                  <span style="font-size:11px;font-weight:600;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.9);z-index:2;">${w.name}</span>
                  ${isSelected ? `<span style="font-size:12px;color:var(--cyan-accent, #35D8F2);font-weight:800;text-shadow:0 1px 3px rgba(0,0,0,0.9);z-index:2;">✓</span>` : ''}
                  <div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%);pointer-events:none;"></div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Theme Mode -->
        <div>
          <h4 style="margin:0 0 10px;font-size:14px;color:var(--text-primary);">Color & Theme</h4>
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;">
            <button class="chrome-theme-choice ${currentTheme === 'dark' ? 'active' : ''}" id="choice-theme-dark" style="padding:14px;border-radius:8px;border:2px solid ${currentTheme === 'dark' ? 'var(--cyan-accent, #35D8F2)' : 'var(--border-subtle)'};background:#0B0F14;color:#DCE3EB;cursor:pointer;font-size:13px;font-weight:600;transition:all 0.2s ease;">
              🌙 Obsidian Dark
            </button>
            <button class="chrome-theme-choice ${currentTheme === 'light' ? 'active' : ''}" id="choice-theme-light" style="padding:14px;border-radius:8px;border:2px solid ${currentTheme === 'light' ? 'var(--cyan-accent, #35D8F2)' : 'var(--border-subtle)'};background:#ffffff;color:#121B2B;cursor:pointer;font-size:13px;font-weight:600;transition:all 0.2s ease;">
              ☀️ Modern Light
            </button>
            <button class="chrome-theme-choice ${currentTheme === 'cyan' ? 'active' : ''}" id="choice-theme-cyan" style="padding:14px;border-radius:8px;border:2px solid ${currentTheme === 'cyan' ? 'var(--cyan-accent, #35D8F2)' : 'var(--border-subtle)'};background:#050B14;color:#35D8F2;cursor:pointer;font-size:13px;font-weight:600;transition:all 0.2s ease;">
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
          if (typeof Omnibox !== 'undefined') {
            Omnibox.update();
          }
        }
      }
    ]);

    // Upload wallpaper from device button (Chrome-style local wallpaper picker)
    const uploadBtn = document.getElementById('upload-wallpaper-btn');
    const uploadInput = document.getElementById('upload-wallpaper-file');
    if (uploadBtn && uploadInput) {
      uploadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        uploadInput.click();
      });
      uploadInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const dataUrl = evt.target?.result;
            if (dataUrl) {
              this.setWallpaper(dataUrl);
              document.querySelectorAll('.wallpaper-card').forEach(c => {
                c.classList.remove('active');
                c.style.borderColor = 'var(--border-subtle)';
                c.style.boxShadow = 'none';
              });
              const ntp = document.querySelector('.chrome-ntp');
              if (ntp) {
                ntp.classList.add('has-custom-wallpaper');
                ntp.style.backgroundImage = `url('${dataUrl}')`;
              }
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Wallpaper clicks (smooth in-place preview and selection without blinking or modal dismissal)
    document.querySelectorAll('.wallpaper-card').forEach(card => {
      card.addEventListener('click', () => {
        const url = card.dataset.url || '';
        this.setWallpaper(url);
        
        // Update active highlight on cards in the modal
        document.querySelectorAll('.wallpaper-card').forEach(c => {
          const isAct = (c.dataset.url || '') === url;
          c.classList.toggle('active', isAct);
          c.style.borderColor = isAct ? 'var(--cyan-accent, #35D8F2)' : 'var(--border-subtle)';
        });

        // Apply wallpaper directly to the underlying New Tab page smoothly
        const ntp = document.querySelector('.chrome-ntp');
        if (ntp) {
          if (url) {
            ntp.classList.add('has-custom-wallpaper');
            ntp.style.backgroundImage = `url('${url}')`;
          } else {
            ntp.classList.remove('has-custom-wallpaper');
            ntp.style.backgroundImage = '';
          }
        }
      });
    });

    // Theme clicks (smooth in-place color transitions without blinking, flash, or premature modal closing)
    const applyThemeSelection = (theme) => {
      ThemeManager.setTheme(theme);
      ['dark', 'light', 'cyan'].forEach(t => {
        const btn = document.getElementById(`choice-theme-${t}`);
        if (btn) {
          const isSelected = (t === theme);
          btn.classList.toggle('active', isSelected);
          btn.style.borderColor = isSelected ? 'var(--cyan-accent, #35D8F2)' : 'var(--border-subtle)';
          btn.style.boxShadow = isSelected ? '0 0 14px rgba(53, 216, 242, 0.4)' : 'none';
        }
      });
    };

    document.getElementById('choice-theme-dark')?.addEventListener('click', () => {
      applyThemeSelection('dark');
    });
    document.getElementById('choice-theme-light')?.addEventListener('click', () => {
      applyThemeSelection('light');
    });
    document.getElementById('choice-theme-cyan')?.addEventListener('click', () => {
      applyThemeSelection('cyan');
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
    const ntp = document.querySelector('.chrome-ntp');
    if (ntp) {
      if (url) {
        ntp.classList.add('has-custom-wallpaper');
        ntp.style.backgroundImage = `url('${url}')`;
      } else {
        ntp.classList.remove('has-custom-wallpaper');
        ntp.style.backgroundImage = 'none';
      }
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
  },

  renderIncognito(container) {
    const engineMap = {
      google: { name: 'Google', icon: '🌐' },
      duckduckgo: { name: 'DuckDuckGo', icon: '🦆' },
      bing: { name: 'Bing', icon: '🔷' },
      yahoo: { name: 'Yahoo', icon: '🟣' },
      ecosia: { name: 'Ecosia', icon: '🌿' },
      yandex: { name: 'Yandex', icon: '🔴' }
    };
    const currentEngineKey = (typeof State !== 'undefined' && State.settings && State.settings.searchEngine) ? State.settings.searchEngine.toLowerCase() : 'duckduckgo';
    const currentEngine = engineMap[currentEngineKey] || engineMap.duckduckgo;

    container.innerHTML = `
      <div class="chrome-ntp incognito-ntp" style="background:#0b0d13;color:#e2e8f0;padding:40px 24px;min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div style="max-width:680px;width:100%;display:flex;flex-direction:column;align-items:center;text-align:center;">
          
          <div style="width:72px;height:72px;border-radius:50%;background:rgba(168,85,247,0.15);border:1px solid rgba(168,85,247,0.4);display:flex;align-items:center;justify-content:center;margin-bottom:20px;box-shadow:0 0 30px rgba(168,85,247,0.25);">
            <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="#c084fc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 12h20M7 12a5 5 0 0 1 10 0M4 17a3 3 0 1 0 6 0 3 3 0 0 0-6 0zm10 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0z"/>
            </svg>
          </div>

          <h1 style="font-size:28px;font-weight:700;color:#f8fafc;margin-bottom:8px;letter-spacing:-0.5px;">You’ve Gone Incognito</h1>
          <p style="font-size:14px;color:#94a3b8;line-height:1.6;margin-bottom:28px;max-width:540px;">
            Now you can browse privately. Other people who use this device won’t see your activity, and session data will be permanently cleared when you close all private windows.
          </p>

          <!-- Search Box -->
          <div class="ntp-search-container" style="width:100%;max-width:560px;margin-bottom:32px;">
            <form id="incognito-search-form" style="display:flex;align-items:center;background:#161922;border:1px solid rgba(168,85,247,0.3);border-radius:28px;padding:6px 16px;box-shadow:0 4px 20px rgba(0,0,0,0.4);">
              <span style="font-size:18px;margin-right:12px;">${currentEngine.icon}</span>
              <input type="text" id="incognito-search-input" placeholder="Search privately with ${currentEngine.name} or type URL" style="flex:1;background:transparent;border:none;outline:none;color:#f8fafc;font-size:14px;height:36px;" />
              <button type="submit" style="background:#8b5cf6;border:none;border-radius:20px;color:#fff;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;transition:background 0.15s ease;">Search</button>
            </form>
          </div>

          <!-- Privacy Cards Grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;width:100%;text-align:left;margin-bottom:28px;">
            <div style="background:#131620;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:20px 22px;">
              <div style="font-size:14px;font-weight:700;color:#f8fafc;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
                <span style="color:#ef4444;">🚫</span> What AETHER won't save
              </div>
              <ul style="margin:0;padding-left:18px;font-size:13px;color:#94a3b8;line-height:1.7;">
                <li>Your browsing history across tabs</li>
                <li>Cookies and persistent site data</li>
                <li>Information entered into forms</li>
                <li>Temporary cache and download history</li>
              </ul>
            </div>

            <div style="background:#131620;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:20px 22px;">
              <div style="font-size:14px;font-weight:700;color:#f8fafc;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
                <span style="color:#38bdf8;">🌐</span> Your activity might still be visible to
              </div>
              <ul style="margin:0;padding-left:18px;font-size:13px;color:#94a3b8;line-height:1.7;">
                <li>Websites that you visit</li>
                <li>Your employer, university, or school</li>
                <li>Your internet service provider (ISP)</li>
              </ul>
            </div>
          </div>

          <!-- Shields Protection Notice -->
          <div style="background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.25);border-radius:12px;padding:12px 18px;display:flex;align-items:center;gap:12px;width:100%;text-align:left;">
            <span style="font-size:20px;">🛡️</span>
            <div style="font-size:12px;color:#bae6fd;line-height:1.5;">
              <strong>AETHER Shields Active:</strong> Third-party trackers, invasive ad networks, and browser fingerprinting noise are blocked on all websites in this window.
            </div>
          </div>

        </div>
      </div>
    `;

    // Hook search form
    const form = container.querySelector('#incognito-search-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = container.querySelector('#incognito-search-input');
        const val = input ? input.value.trim() : '';
        if (val) {
          Omnibox.navigate(val);
        }
      });
    }
  }
};

if (typeof module !== 'undefined') {
  module.exports = Homepage;
}
