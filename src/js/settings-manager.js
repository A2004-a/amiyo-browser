const SettingsManager = {
  activeSection: 'general',

  render(container) {
    const s = State.settings;

    container.innerHTML = `
      <div class="settings-container">
        <div class="settings-sidebar">
          <div class="settings-nav-item ${this.activeSection === 'general' ? 'active' : ''}" data-sec="general">General</div>
          <div class="settings-nav-item ${this.activeSection === 'appearance' ? 'active' : ''}" data-sec="appearance">Appearance</div>
          <div class="settings-nav-item ${this.activeSection === 'search' ? 'active' : ''}" data-sec="search">Search Engine</div>
          <div class="settings-nav-item ${this.activeSection === 'shields' ? 'active' : ''}" data-sec="shields">🛡️ AETHER Shield</div>
          <div class="settings-nav-item ${this.activeSection === 'performance' ? 'active' : ''}" data-sec="performance">⚡ Performance &amp; Memory</div>
          <div class="settings-nav-item ${this.activeSection === 'ai' ? 'active' : ''}" data-sec="ai">✨ AETHER Intelligence</div>
          <div class="settings-nav-item ${this.activeSection === 'privacy' ? 'active' : ''}" data-sec="privacy">Privacy & Security</div>
          <div class="settings-nav-item ${this.activeSection === 'downloads' ? 'active' : ''}" data-sec="downloads">Downloads</div>
          <div class="settings-nav-item ${this.activeSection === 'permissions' ? 'active' : ''}" data-sec="permissions">Permissions</div>
          <div class="settings-nav-item ${this.activeSection === 'about' ? 'active' : ''}" data-sec="about">About AETHER</div>
        </div>

        <div class="settings-content" id="settings-content-pane">
          ${this.renderSectionContent(this.activeSection, s)}
        </div>
      </div>
    `;

    // Sidebar navigation clicks
    container.querySelectorAll('.settings-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        this.activeSection = item.dataset.sec;
        container.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const contentPane = container.querySelector('#settings-content-pane');
        contentPane.innerHTML = this.renderSectionContent(this.activeSection, State.settings);
        this.attachSectionListeners(contentPane);
      });
    });

    this.attachSectionListeners(container.querySelector('#settings-content-pane'));
  },

  renderSectionContent(section, s) {
    switch (section) {
      case 'general':
        return `
          <div class="settings-section">
            <h3 class="settings-section-title">General Settings</h3>
            
            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">On Startup</span>
                <span class="settings-card-desc">Choose what to display when AETHER Browser opens.</span>
              </div>
              <select id="setting-startup" class="settings-select">
                <option value="newtab" ${!s.restoreTabsOnStartup ? 'selected' : ''}>Open the New Tab page</option>
                <option value="restore" ${s.restoreTabsOnStartup ? 'selected' : ''}>Continue where you left off (Restore tabs)</option>
              </select>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Homepage URL</span>
                <span class="settings-card-desc">The page opened when clicking the Home button.</span>
              </div>
              <input type="text" id="setting-homepage" class="settings-input" value="${Utils.escapeHtml(s.homepage || 'aether://newtab')}" />
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Show Bookmarks Bar</span>
                <span class="settings-card-desc">Display bookmarks directly below the navigation bar.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-bookmarks-bar" ${s.showBookmarksBar !== false ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        `;

      case 'appearance':
        return `
          <div class="settings-section">
            <h3 class="settings-section-title">Appearance</h3>
            
            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Color Theme</span>
                <span class="settings-card-desc">Choose between dark charcoal, clean light, or follow system theme.</span>
              </div>
              <select id="setting-theme" class="settings-select">
                <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Dark Charcoal</option>
                <option value="light" ${s.theme === 'light' ? 'selected' : ''}>Clean Light</option>
                <option value="system" ${s.theme === 'system' ? 'selected' : ''}>System Default</option>
              </select>
            </div>
          </div>
        `;

      case 'search':
        return `
          <div class="settings-section">
            <h3 class="settings-section-title">Search Engine</h3>
            
            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Default Search Provider</span>
                <span class="settings-card-desc">Used when entering queries into the omnibox.</span>
              </div>
              <select id="setting-search-engine" class="settings-select">
                <option value="google" ${(!s.searchEngine || s.searchEngine === 'google') ? 'selected' : ''}>Google</option>
                <option value="duckduckgo" ${s.searchEngine === 'duckduckgo' ? 'selected' : ''}>DuckDuckGo</option>
                <option value="bing" ${s.searchEngine === 'bing' ? 'selected' : ''}>Bing</option>
                <option value="yahoo" ${s.searchEngine === 'yahoo' ? 'selected' : ''}>Yahoo</option>
                <option value="ecosia" ${s.searchEngine === 'ecosia' ? 'selected' : ''}>Ecosia</option>
                <option value="custom" ${s.searchEngine === 'custom' ? 'selected' : ''}>Custom URL</option>
              </select>
            </div>

            <div class="settings-card ${s.searchEngine === 'custom' ? '' : 'hidden'}" id="custom-search-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Custom Search URL</span>
                <span class="settings-card-desc">Use %s where the search query should appear.</span>
              </div>
              <input type="text" id="setting-custom-search" class="settings-input" value="${Utils.escapeHtml(s.customSearchUrl || '')}" placeholder="https://example.com/search?q=%s" />
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Search Suggestions</span>
                <span class="settings-card-desc">Show matching bookmarks, history and queries as you type.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-search-suggestions" ${s.searchSuggestions !== false ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        `;

      case 'shields':
        return `
          <div class="settings-section">
            <h3 class="settings-section-title">🛡️ AETHER Shield (Zero-Telemetry Privacy Protection)</h3>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">
              AETHER Shield protects your privacy by blocking third-party trackers, invasive advertising networks, and fingerprinting scripts automatically.
            </p>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Enable AETHER Shield</span>
                <span class="settings-card-desc">Master switch to block malicious advertising scripts and trackers.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-shields-enabled" ${s.shieldsEnabled !== false ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Automatic HTTPS Upgrades</span>
                <span class="settings-card-desc">Automatically rewrite and upgrade insecure HTTP connections to encrypted HTTPS.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-shields-https" ${s.httpsUpgrades !== false ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Anti-Fingerprinting Headers</span>
                <span class="settings-card-desc">Inject Sec-GPC (Global Privacy Control) and DNT signals on all outbound web requests.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-shields-fp" checked disabled />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        `;

      case 'performance':
        return `
          <div class="settings-section">
            <h3 class="settings-section-title">⚡ Performance &amp; Memory Saver</h3>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">
              Keep your PC fast and responsive by putting inactive tabs to sleep and managing background resources.
            </p>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Memory Saver (Sleeping Tabs)</span>
                <span class="settings-card-desc">Frees memory from inactive tabs so active pages stay smooth and snappy.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-memory-saver" ${s.memorySaver !== false ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Put Inactive Tabs to Sleep After</span>
                <span class="settings-card-desc">Time before an inactive background tab is suspended.</span>
              </div>
              <select id="setting-sleep-timeout" class="settings-select">
                <option value="15" ${s.sleepTimeout === '15' ? 'selected' : ''}>15 minutes</option>
                <option value="30" ${(!s.sleepTimeout || s.sleepTimeout === '30') ? 'selected' : ''}>30 minutes (Recommended)</option>
                <option value="60" ${s.sleepTimeout === '60' ? 'selected' : ''}>1 hour</option>
                <option value="120" ${s.sleepTimeout === '120' ? 'selected' : ''}>2 hours</option>
              </select>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Browser Task Manager</span>
                <span class="settings-card-desc">Monitor live CPU, memory consumption, and process PIDs across all tabs.</span>
              </div>
              <button class="btn-secondary" id="setting-open-task-manager">Open Task Manager (Shift+Esc)</button>
            </div>
          </div>
        `;

      case 'privacy':
        return `
          <div class="settings-section">
            <h3 class="settings-section-title">Privacy & Security</h3>
            
            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Clear Browsing Data</span>
                <span class="settings-card-desc">Clear history, cache, and downloads records.</span>
              </div>
              <button class="btn-danger" id="setting-clear-data-btn">Clear Data</button>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Do Not Track</span>
                <span class="settings-card-desc">Send a "Do Not Track" request with your browsing traffic.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-dnt" ${s.doNotTrack !== false ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Block Unwanted Pop-ups</span>
                <span class="settings-card-desc">Prevent sites from opening unauthorized new windows.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-popups" ${s.blockPopups !== false ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        `;

      case 'downloads':
        return `
          <div class="settings-section">
            <h3 class="settings-section-title">Downloads</h3>
            
            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Download Location</span>
                <span class="settings-card-desc" id="setting-download-path-desc">${Utils.escapeHtml(s.downloadPath || 'Default Downloads folder')}</span>
              </div>
              <button class="btn-secondary" id="setting-change-dl-dir">Change</button>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Ask Where to Save Each File</span>
                <span class="settings-card-desc">Prompt for download directory before downloading.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-ask-dl" ${s.askDownloadPath ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        `;

      case 'ai':
        const aiProvider = s.aiProvider || 'builtin';
        return `
          <div class="settings-section">
            <h3 class="settings-section-title">✨ AETHER Intelligence</h3>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">
              Configure your built-in AI assistant, choose your intelligence provider, or connect Google Gemini or OpenAI.
            </p>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">AI Provider</span>
                <span class="settings-card-desc">Select which engine powers the AETHER Intelligence sidebar.</span>
              </div>
              <select id="setting-ai-provider" class="settings-select">
                <option value="builtin" ${aiProvider === 'builtin' ? 'selected' : ''}>Built-in Smart Assistant (Free & Offline)</option>
                <option value="gemini" ${aiProvider === 'gemini' ? 'selected' : ''}>Google Gemini (Recommended)</option>
                <option value="openai" ${aiProvider === 'openai' ? 'selected' : ''}>OpenAI (ChatGPT)</option>
                <option value="ollama" ${aiProvider === 'ollama' ? 'selected' : ''}>Local Ollama</option>
              </select>
            </div>

            <div class="settings-card ${aiProvider === 'builtin' ? 'hidden' : ''}" id="ai-apikey-card">
              <div class="settings-card-info">
                <span class="settings-card-title">API Key</span>
                <span class="settings-card-desc">Your secret API key (stored securely locally on your device).</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <input type="password" id="setting-ai-apikey" class="settings-input" style="width:240px;" placeholder="Paste API Key here..." value="${Utils.escapeHtml(s.aiApiKey || '')}" />
                <button class="btn-secondary" id="ai-apikey-toggle-btn" style="padding:6px 12px;font-size:12px;cursor:pointer;">Show</button>
              </div>
            </div>

            <div class="settings-card ${aiProvider === 'builtin' ? 'hidden' : ''}" id="ai-model-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Model Name</span>
                <span class="settings-card-desc">e.g. gemini-1.5-flash, gemini-1.5-pro, gpt-4o-mini</span>
              </div>
              <input type="text" id="setting-ai-model" class="settings-input" style="width:200px;" value="${Utils.escapeHtml(s.aiModel || 'gemini-1.5-flash')}" />
            </div>

            <div class="settings-card ${aiProvider !== 'ollama' ? 'hidden' : ''}" id="ai-ollama-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Ollama Endpoint</span>
                <span class="settings-card-desc">Local Ollama host URL</span>
              </div>
              <input type="text" id="setting-ai-ollama" class="settings-input" style="width:240px;" value="${Utils.escapeHtml(s.aiOllamaUrl || 'http://127.0.0.1:11434')}" />
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Active Webpage Context</span>
                <span class="settings-card-desc">Allow AETHER Intelligence to extract clean readable text from your active tab when asking questions.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-ai-page-context" ${s.aiPageContext !== false ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        `;

      case 'permissions':
        return `
          <div class="settings-section">
            <h3 class="settings-section-title">Website Permissions</h3>
            <p style="font-size:13px;color:var(--text-secondary);">Manage hardware and browser feature permissions granted to websites.</p>
            
            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Camera & Microphone</span>
                <span class="settings-card-desc">Prompt before allowing websites to access recording devices.</span>
              </div>
              <span style="font-size:12px;color:var(--accent);">Always Ask</span>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Geolocation</span>
                <span class="settings-card-desc">Prompt before sharing your approximate physical location.</span>
              </div>
              <span style="font-size:12px;color:var(--accent);">Always Ask</span>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Notifications</span>
                <span class="settings-card-desc">Allow or block push notifications from web applications.</span>
              </div>
              <span style="font-size:12px;color:var(--accent);">Always Ask</span>
            </div>
          </div>
        `;

      case 'about':
        return `
          <div class="settings-section">
            <h3 class="settings-section-title">About AETHER Browser</h3>
            
            <div class="settings-card" style="align-items:flex-start;margin-bottom:16px;">
              <div class="settings-card-info" style="gap:12px;width:100%;">
                <div style="display:flex;align-items:center;gap:14px;">
                  <div style="width:48px;height:48px;background:#121B2B;border:1px solid #252D38;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(53,216,242,0.2);">
                    <svg viewBox="0 0 32 32" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="abtChromeL" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stop-color="#FFFFFF"/>
                          <stop offset="100%" stop-color="#94A3B8"/>
                        </linearGradient>
                        <linearGradient id="abtChromeR" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stop-color="#CBD5E1"/>
                          <stop offset="100%" stop-color="#334155"/>
                        </linearGradient>
                        <linearGradient id="abtBlade" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stop-color="#35D8F2"/>
                          <stop offset="50%" stop-color="#FFFFFF"/>
                          <stop offset="100%" stop-color="#94A3B8"/>
                        </linearGradient>
                      </defs>
                      <path d="M 8 20 C 5 19 5 15 10 12 C 12 11 15 9 19 8" fill="none" stroke="#00D4FF" stroke-width="1.6" opacity="0.9" stroke-linecap="round"/>
                      <path d="M 16 4 L 7 21 L 11 21 L 16 10 Z" fill="url(#abtChromeL)"/>
                      <path d="M 16 4 L 16 10 L 21 21 L 25 21 Z" fill="url(#abtChromeR)"/>
                      <circle cx="16" cy="4" r="1" fill="#FFFFFF"/>
                      <path d="M 7 20 C 11 21 16 20 21 16 C 24 14 26 11 27 8 C 26 9 24 11 20 14 C 15 18 11 19 7 20 Z" fill="url(#abtBlade)"/>
                      <circle cx="27.2" cy="7.8" r="1.8" fill="#00D4FF"/>
                    </svg>
                  </div>
                  <div>
                    <h4 style="font-size:18px;font-weight:800;color:var(--text-primary);letter-spacing:1px;">AETHER Browser</h4>
                    <p style="font-size:12px;color:var(--cyan-accent);font-weight:600;">Explore Without Limits &bull; Version 1.1.0 (Latest Release)</p>
                  </div>
                </div>
                <p style="font-size:13px;color:var(--text-secondary);line-height:1.5;">
                  A premium, next-generation browser built on Chromium 156 with native AETHER Shields ad/tracker protection, AETHER Intelligence sidebar, Tab Groups, and zero telemetry.
                </p>
                <div style="font-size:12px;color:var(--text-muted);display:grid;grid-template-columns:repeat(2, 1fr);gap:6px;background:var(--bg-tertiary);padding:10px;border-radius:8px;">
                  <div><strong>Engine:</strong> Chromium 156.0.8078.96</div>
                  <div><strong>Runtime:</strong> Electron 45.3.0 &amp; Node.js</div>
                  <div><strong>Platform:</strong> Windows, macOS, Linux, Android, iOS</div>
                  <div><strong>Shields:</strong> Active &amp; Up to date</div>
                </div>
              </div>
            </div>

            <!-- Download Official Apps for All Platforms -->
            <h4 style="margin:16px 0 10px;font-size:14px;color:var(--text-primary);font-weight:600;">Download AETHER Browser v1.1.0 for All Platforms</h4>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;">
              
              <!-- Windows -->
              <div style="background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:20px;">🪟</span>
                  <div>
                    <div style="font-size:13px;font-weight:700;color:var(--text-primary);">Windows (x64)</div>
                    <div style="font-size:11px;color:var(--text-secondary);">Windows 10 / 11</div>
                  </div>
                </div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                  <button class="btn btn-sm btn-primary" onclick="IpcClient.navigateTab(State.activeTabId, 'https://github.com/A2004-a/amiyo-browser/releases/download/v1.1.0/AETHER-Browser-Setup-1.1.0-x64.zip')" style="font-size:11px;padding:6px 10px;flex:1;">⬇️ Portable</button>
                  <button class="btn btn-sm btn-secondary" onclick="IpcClient.navigateTab(State.activeTabId, 'https://github.com/A2004-a/amiyo-browser/releases/download/v1.1.0/AETHER-Browser-Setup-1.1.0-x64.exe')" style="font-size:11px;padding:6px 10px;flex:1;">Setup.exe</button>
                </div>
              </div>

              <!-- Linux -->
              <div style="background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:20px;">🐧</span>
                  <div>
                    <div style="font-size:13px;font-weight:700;color:var(--text-primary);">Linux (x64)</div>
                    <div style="font-size:11px;color:var(--text-secondary);">Ubuntu, Debian, Fedora</div>
                  </div>
                </div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                  <button class="btn btn-sm btn-primary" onclick="IpcClient.navigateTab(State.activeTabId, 'https://github.com/A2004-a/amiyo-browser/releases/download/v1.1.0/AETHER-Browser-1.1.0-linux-x64.AppImage')" style="font-size:11px;padding:6px 10px;flex:1;">AppImage</button>
                  <button class="btn btn-sm btn-secondary" onclick="IpcClient.navigateTab(State.activeTabId, 'https://github.com/A2004-a/amiyo-browser/releases/download/v1.1.0/AETHER-Browser-1.1.0-linux-x64.deb')" style="font-size:11px;padding:6px 10px;flex:1;">.deb</button>
                </div>
              </div>

              <!-- macOS -->
              <div style="background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:20px;">🍎</span>
                  <div>
                    <div style="font-size:13px;font-weight:700;color:var(--text-primary);">macOS (Universal)</div>
                    <div style="font-size:11px;color:var(--text-secondary);">Apple Silicon &amp; Intel</div>
                  </div>
                </div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                  <button class="btn btn-sm btn-primary" onclick="IpcClient.navigateTab(State.activeTabId, 'https://github.com/A2004-a/amiyo-browser/releases/download/v1.1.0/AETHER-Browser-1.1.0-mac-universal.dmg')" style="font-size:11px;padding:6px 10px;flex:1;">DMG</button>
                  <button class="btn btn-sm btn-secondary" onclick="IpcClient.navigateTab(State.activeTabId, 'https://github.com/A2004-a/amiyo-browser/releases/download/v1.1.0/AETHER-Browser-1.1.0-mac-universal.zip')" style="font-size:11px;padding:6px 10px;flex:1;">.zip</button>
                </div>
              </div>

              <!-- Android -->
              <div style="background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:20px;">🤖</span>
                  <div>
                    <div style="font-size:13px;font-weight:700;color:var(--text-primary);">Android APK</div>
                    <div style="font-size:11px;color:var(--text-secondary);">Android 7.0 to 14+</div>
                  </div>
                </div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                  <button class="btn btn-sm btn-primary" onclick="IpcClient.navigateTab(State.activeTabId, 'https://github.com/A2004-a/amiyo-browser/releases/download/v1.1.0/AETHER-Browser-v1.1.0-Android.apk')" style="font-size:11px;padding:6px 10px;width:100%;">⬇️ Download APK</button>
                </div>
              </div>

              <!-- iOS -->
              <div style="background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:20px;">🍏</span>
                  <div>
                    <div style="font-size:13px;font-weight:700;color:var(--text-primary);">iOS (iPhone &amp; iPad)</div>
                    <div style="font-size:11px;color:var(--text-secondary);">iOS 15.0+ · IPA &amp; PWA</div>
                  </div>
                </div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                  <button class="btn btn-sm btn-primary" onclick="IpcClient.navigateTab(State.activeTabId, 'https://github.com/A2004-a/amiyo-browser/releases/download/v1.1.0/AETHER-Browser-v1.1.0-iOS.ipa')" style="font-size:11px;padding:6px 10px;flex:1;">⬇️ IPA</button>
                  <button class="btn btn-sm btn-secondary" onclick="IpcClient.navigateTab(State.activeTabId, 'https://github.com/A2004-a/amiyo-browser/tree/main/ios')" style="font-size:11px;padding:6px 10px;flex:1;">📱 Guide</button>
                </div>
              </div>

              <!-- All Platforms Release Hub -->
              <div style="background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:20px;">📦</span>
                  <div>
                    <div style="font-size:13px;font-weight:700;color:var(--text-primary);">GitHub Release Hub</div>
                    <div style="font-size:11px;color:var(--text-secondary);">All Assets, Hashes &amp; Notes</div>
                  </div>
                </div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                  <button class="btn btn-sm btn-secondary" onclick="IpcClient.navigateTab(State.activeTabId, 'https://github.com/A2004-a/amiyo-browser/releases/tag/v1.1.0')" style="font-size:11px;padding:6px 10px;width:100%;">📦 View All Downloads</button>
                </div>
              </div>

            </div>
          </div>
        `;
    }
  },

  attachSectionListeners(pane) {
    // General
    const startupSelect = pane.querySelector('#setting-startup');
    if (startupSelect) {
      startupSelect.addEventListener('change', async (e) => {
        const restore = e.target.value === 'restore';
        State.settings = await IpcClient.saveSettings({ restoreTabsOnStartup: restore });
      });
    }

    const homepageInput = pane.querySelector('#setting-homepage');
    if (homepageInput) {
      homepageInput.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ homepage: e.target.value.trim() });
      });
    }

    const bookmarksBarToggle = pane.querySelector('#setting-bookmarks-bar');
    if (bookmarksBarToggle) {
      bookmarksBarToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ showBookmarksBar: e.target.checked });
        BookmarksBar.render();
        App.updateTopOffset();
      });
    }

    // Appearance
    const themeSelect = pane.querySelector('#setting-theme');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        ThemeManager.setTheme(e.target.value);
      });
    }

    // Search Engine
    const searchSelect = pane.querySelector('#setting-search-engine');
    const customCard = pane.querySelector('#custom-search-card');
    if (searchSelect) {
      const handleEngineChange = async (val) => {
        if (customCard) customCard.classList.toggle('hidden', val !== 'custom');
        State.settings = await IpcClient.saveSettings({ searchEngine: val });
        if (typeof Omnibox !== 'undefined' && Omnibox.updateSearchEngine) {
          Omnibox.updateSearchEngine(val);
        }
        if (typeof Homepage !== 'undefined' && Homepage.updateSearchPlaceholder) {
          Homepage.updateSearchPlaceholder(val);
        }
      };
      searchSelect.addEventListener('change', (e) => handleEngineChange(e.target.value));
      searchSelect.addEventListener('input', (e) => handleEngineChange(e.target.value));
    }

    const customSearchInput = pane.querySelector('#setting-custom-search');
    if (customSearchInput) {
      customSearchInput.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ customSearchUrl: e.target.value.trim() });
      });
    }

    // Downloads
    const changeDlBtn = pane.querySelector('#setting-change-dl-dir');
    if (changeDlBtn) {
      changeDlBtn.addEventListener('click', async () => {
        const newPath = await IpcClient.selectDownloadDir();
        if (newPath) {
          State.settings = await IpcClient.saveSettings({ downloadPath: newPath });
          pane.querySelector('#setting-download-path-desc').textContent = newPath;
        }
      });
    }

    const askDlToggle = pane.querySelector('#setting-ask-dl');
    if (askDlToggle) {
      askDlToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ askDownloadPath: e.target.checked });
      });
    }

    // AI Assistant
    const aiProviderSelect = pane.querySelector('#setting-ai-provider');
    const aiKeyCard = pane.querySelector('#ai-apikey-card');
    const aiModelCard = pane.querySelector('#ai-model-card');
    const aiOllamaCard = pane.querySelector('#ai-ollama-card');

    if (aiProviderSelect) {
      aiProviderSelect.addEventListener('change', async (e) => {
        const prov = e.target.value;
        if (aiKeyCard) aiKeyCard.classList.toggle('hidden', prov === 'builtin');
        if (aiModelCard) aiModelCard.classList.toggle('hidden', prov === 'builtin');
        if (aiOllamaCard) aiOllamaCard.classList.toggle('hidden', prov !== 'ollama');

        State.settings = await IpcClient.saveSettings({ aiProvider: prov });
        if (typeof AiPanel !== 'undefined' && AiPanel.updateProviderBadge) {
          AiPanel.updateProviderBadge();
        }
      });
    }

    const aiApiKeyInput = pane.querySelector('#setting-ai-apikey');
    if (aiApiKeyInput) {
      aiApiKeyInput.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ aiApiKey: e.target.value.trim() });
      });
    }

    const aiKeyToggleBtn = pane.querySelector('#ai-apikey-toggle-btn');
    if (aiKeyToggleBtn && aiApiKeyInput) {
      aiKeyToggleBtn.addEventListener('click', () => {
        const isPwd = aiApiKeyInput.type === 'password';
        aiApiKeyInput.type = isPwd ? 'text' : 'password';
        aiKeyToggleBtn.textContent = isPwd ? 'Hide' : 'Show';
      });
    }

    const aiModelInput = pane.querySelector('#setting-ai-model');
    if (aiModelInput) {
      aiModelInput.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ aiModel: e.target.value.trim() });
      });
    }

    const aiOllamaInput = pane.querySelector('#setting-ai-ollama');
    if (aiOllamaInput) {
      aiOllamaInput.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ aiOllamaUrl: e.target.value.trim() });
      });
    }

    const aiPageContextToggle = pane.querySelector('#setting-ai-page-context');
    if (aiPageContextToggle) {
      aiPageContextToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ aiPageContext: e.target.checked });
      });
    }

    // Clear data button
    const clearBtn = pane.querySelector('#setting-clear-data-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        HistoryManager.showClearHistoryDialog();
      });
    }

    // Shields Settings
    const shieldsEnabledToggle = pane.querySelector('#setting-shields-enabled');
    if (shieldsEnabledToggle) {
      shieldsEnabledToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ shieldsEnabled: e.target.checked });
        if (IpcClient.api?.shields?.toggle) {
          await IpcClient.api.shields.toggle(e.target.checked);
        }
      });
    }

    const shieldsHttpsToggle = pane.querySelector('#setting-shields-https');
    if (shieldsHttpsToggle) {
      shieldsHttpsToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ httpsUpgrades: e.target.checked });
      });
    }

    // Performance & Memory Saver
    const memorySaverToggle = pane.querySelector('#setting-memory-saver');
    if (memorySaverToggle) {
      memorySaverToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ memorySaver: e.target.checked });
      });
    }

    const sleepTimeoutSelect = pane.querySelector('#setting-sleep-timeout');
    if (sleepTimeoutSelect) {
      sleepTimeoutSelect.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ sleepTimeout: e.target.value });
      });
    }

    const openTaskManagerBtn = pane.querySelector('#setting-open-task-manager');
    if (openTaskManagerBtn) {
      openTaskManagerBtn.addEventListener('click', () => {
        if (typeof App !== 'undefined' && App.openTaskManager) {
          App.openTaskManager();
        }
      });
    }
  }
};

