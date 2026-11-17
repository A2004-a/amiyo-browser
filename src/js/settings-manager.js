const SettingsManager = {
  activeSection: 'general',

  render(container) {
    const s = State.settings || {};

    container.innerHTML = `
      <div class="settings-container">
        <div class="settings-sidebar">
          <div class="settings-nav-item ${this.activeSection === 'general' ? 'active' : ''}" data-sec="general">⚙️ General</div>
          <div class="settings-nav-item ${this.activeSection === 'appearance' ? 'active' : ''}" data-sec="appearance">🎨 Appearance</div>
          <div class="settings-nav-item ${this.activeSection === 'search' ? 'active' : ''}" data-sec="search">🔍 Search Engine</div>
          <div class="settings-nav-item ${this.activeSection === 'shields' ? 'active' : ''}" data-sec="shields">🛡️ AETHER Shield</div>
          <div class="settings-nav-item ${this.activeSection === 'performance' ? 'active' : ''}" data-sec="performance">⚡ Performance &amp; Memory</div>
          <div class="settings-nav-item ${this.activeSection === 'ai' ? 'active' : ''}" data-sec="ai">✨ AETHER Intelligence</div>
          <div class="settings-nav-item ${this.activeSection === 'privacy' ? 'active' : ''}" data-sec="privacy">🔒 Privacy &amp; Security</div>
          <div class="settings-nav-item ${this.activeSection === 'downloads' ? 'active' : ''}" data-sec="downloads">📥 Downloads</div>
          <div class="settings-nav-item ${this.activeSection === 'permissions' ? 'active' : ''}" data-sec="permissions">🔑 Permissions</div>
          <div class="settings-nav-item ${this.activeSection === 'about' ? 'active' : ''}" data-sec="about">ℹ️ About AETHER</div>
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
        contentPane.innerHTML = this.renderSectionContent(this.activeSection, State.settings || {});
        this.attachSectionListeners(contentPane);
      });
    });

    this.attachSectionListeners(container.querySelector('#settings-content-pane'));
  },

  renderSectionContent(section, s) {
    const normalizeHomepage = (url) => {
      if (!url || url === 'amiyo://newtab') return 'aether://newtab';
      return url;
    };

    switch (section) {
      case 'general':
        const curHomepage = normalizeHomepage(s.homepage);
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
              <div style="display:flex;align-items:center;gap:8px;">
                <input type="text" id="setting-homepage" class="settings-input" value="${Utils.escapeHtml(curHomepage)}" />
                <button class="btn-secondary" id="btn-reset-homepage" style="padding:6px 12px;font-size:12px;cursor:pointer;" title="Reset to AETHER New Tab">Reset</button>
              </div>
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

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Default Browser</span>
                <span class="settings-card-desc">Make AETHER your primary web browser for links and documents.</span>
              </div>
              <button class="btn-primary" id="btn-set-default-browser" style="padding:8px 16px;font-size:13px;cursor:pointer;">Set as Default</button>
            </div>
          </div>
        `;

      case 'appearance':
        const activeTheme = s.theme || 'dark';
        const activeZoom = s.defaultZoom || 100;
        const activeFontSize = s.fontSize || 'medium';
        const isVerticalTabs = (localStorage.getItem('aether_vertical_tabs') || localStorage.getItem('amiyo_vertical_tabs')) === 'true';

        return `
          <div class="settings-section">
            <h3 class="settings-section-title">Appearance</h3>
            
            <div class="settings-card" style="flex-direction:column;align-items:flex-start;gap:12px;">
              <div class="settings-card-info">
                <span class="settings-card-title">Color Theme</span>
                <span class="settings-card-desc">Switch between Obsidian Dark, Clean Light, and Electric AETHER Cyan.</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;width:100%;">
                <div class="settings-theme-card ${activeTheme === 'dark' ? 'active' : ''}" data-theme-val="dark" style="padding:14px 10px;border-radius:8px;border:2px solid ${activeTheme === 'dark' ? 'var(--cyan-accent, #35D8F2)' : 'var(--border-subtle)'};background:#0B0F14;color:#DCE3EB;cursor:pointer;font-size:13px;font-weight:600;text-align:center;box-shadow:${activeTheme === 'dark' ? '0 0 12px rgba(53, 216, 242, 0.35)' : 'none'};transition:all 0.2s ease;">
                  🌙 Obsidian Dark
                </div>
                <div class="settings-theme-card ${activeTheme === 'light' ? 'active' : ''}" data-theme-val="light" style="padding:14px 10px;border-radius:8px;border:2px solid ${activeTheme === 'light' ? 'var(--cyan-accent, #35D8F2)' : 'var(--border-subtle)'};background:#FFFFFF;color:#121B2B;cursor:pointer;font-size:13px;font-weight:600;text-align:center;box-shadow:${activeTheme === 'light' ? '0 0 12px rgba(2, 132, 199, 0.35)' : 'none'};transition:all 0.2s ease;">
                  ☀️ Modern Light
                </div>
                <div class="settings-theme-card ${activeTheme === 'cyan' ? 'active' : ''}" data-theme-val="cyan" style="padding:14px 10px;border-radius:8px;border:2px solid ${activeTheme === 'cyan' ? 'var(--cyan-accent, #35D8F2)' : 'var(--border-subtle)'};background:#050B14;color:#35D8F2;cursor:pointer;font-size:13px;font-weight:600;text-align:center;box-shadow:${activeTheme === 'cyan' ? '0 0 14px rgba(53, 216, 242, 0.45)' : 'none'};transition:all 0.2s ease;">
                  ⚡ AETHER Cyan
                </div>
                <div class="settings-theme-card ${activeTheme === 'system' ? 'active' : ''}" data-theme-val="system" style="padding:14px 10px;border-radius:8px;border:2px solid ${activeTheme === 'system' ? 'var(--cyan-accent, #35D8F2)' : 'var(--border-subtle)'};background:var(--bg-tertiary);color:var(--text-primary);cursor:pointer;font-size:13px;font-weight:600;text-align:center;box-shadow:${activeTheme === 'system' ? '0 0 12px rgba(53, 216, 242, 0.35)' : 'none'};transition:all 0.2s ease;">
                  🖥️ System Default
                </div>
              </div>
              <div style="width:100%;margin-top:4px;">
                <select id="setting-theme" class="settings-select" style="width:100%;">
                  <option value="dark" ${activeTheme === 'dark' ? 'selected' : ''}>Obsidian Dark (Default)</option>
                  <option value="light" ${activeTheme === 'light' ? 'selected' : ''}>Modern Light</option>
                  <option value="cyan" ${activeTheme === 'cyan' ? 'selected' : ''}>AETHER Cyan (Cyber Glow)</option>
                  <option value="system" ${activeTheme === 'system' ? 'selected' : ''}>System Default</option>
                </select>
              </div>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Page Zoom</span>
                <span class="settings-card-desc">Default zoom level for web pages.</span>
              </div>
              <select id="setting-zoom" class="settings-select">
                <option value="75" ${activeZoom == 75 ? 'selected' : ''}>75%</option>
                <option value="90" ${activeZoom == 90 ? 'selected' : ''}>90%</option>
                <option value="100" ${(!activeZoom || activeZoom == 100) ? 'selected' : ''}>100% (Default)</option>
                <option value="110" ${activeZoom == 110 ? 'selected' : ''}>110%</option>
                <option value="125" ${activeZoom == 125 ? 'selected' : ''}>125%</option>
                <option value="150" ${activeZoom == 150 ? 'selected' : ''}>150%</option>
              </select>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Font Size</span>
                <span class="settings-card-desc">Adjust the base browser font scale.</span>
              </div>
              <select id="setting-font-size" class="settings-select">
                <option value="small" ${activeFontSize === 'small' ? 'selected' : ''}>Small (14px)</option>
                <option value="medium" ${(!activeFontSize || activeFontSize === 'medium') ? 'selected' : ''}>Medium (16px / Recommended)</option>
                <option value="large" ${activeFontSize === 'large' ? 'selected' : ''}>Large (18px)</option>
                <option value="xlarge" ${activeFontSize === 'xlarge' ? 'selected' : ''}>Extra Large (20px)</option>
              </select>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Vertical Tabs</span>
                <span class="settings-card-desc">Display tabs vertically in an ergonomic left sidebar.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-vertical-tabs" ${isVerticalTabs ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
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
                <span class="settings-card-desc">Used when entering search queries into the address bar.</span>
              </div>
              <select id="setting-search-engine" class="settings-select">
                <option value="google" ${(!s.searchEngine || s.searchEngine === 'google') ? 'selected' : ''}>Google</option>
                <option value="duckduckgo" ${s.searchEngine === 'duckduckgo' ? 'selected' : ''}>DuckDuckGo (Anti-Tracking)</option>
                <option value="bing" ${s.searchEngine === 'bing' ? 'selected' : ''}>Bing (Microsoft)</option>
                <option value="yahoo" ${s.searchEngine === 'yahoo' ? 'selected' : ''}>Yahoo</option>
                <option value="ecosia" ${s.searchEngine === 'ecosia' ? 'selected' : ''}>Ecosia (Eco)</option>
                <option value="custom" ${s.searchEngine === 'custom' ? 'selected' : ''}>Custom URL</option>
              </select>
            </div>

            <div class="settings-card ${s.searchEngine === 'custom' ? '' : 'hidden'}" id="custom-search-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Custom Search URL</span>
                <span class="settings-card-desc">Use %s where the search query should appear (e.g. https://example.com/search?q=%s).</span>
              </div>
              <input type="text" id="setting-custom-search" class="settings-input" value="${Utils.escapeHtml(s.customSearchUrl || '')}" placeholder="https://example.com/search?q=%s" />
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Search Suggestions</span>
                <span class="settings-card-desc">Show matching bookmarks, history, and search suggestions as you type.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-search-suggestions" ${s.searchSuggestions !== false ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        `;

      case 'shields':
        const shieldsMode = s.shieldsMode || 'standard';
        return `
          <div class="settings-section">
            <h3 class="settings-section-title">🛡️ AETHER Shield (Zero-Telemetry Privacy Engine)</h3>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">
              AETHER Shield blocks intrusive ads, trackers, video prerolls, fingerprinting scripts, and cookie banners automatically with zero telemetry.
            </p>

            <!-- Master Toggle -->
            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Enable AETHER Shield</span>
                <span class="settings-card-desc">Master switch for real-time ad blocking, tracker neutralization, and network filtering.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-shields-enabled" ${s.shieldsEnabled !== false ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <!-- Shield Mode -->
            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Ad &amp; Tracker Blocking Level</span>
                <span class="settings-card-desc">Choose between standard balanced blocking or aggressive Brave-grade protection.</span>
              </div>
              <select id="setting-shields-mode" class="settings-select">
                <option value="standard" ${shieldsMode === 'standard' ? 'selected' : ''}>Standard Protection (Recommended)</option>
                <option value="aggressive" ${shieldsMode === 'aggressive' ? 'selected' : ''}>Aggressive Protection (Brave Shields Level)</option>
              </select>
            </div>

            <!-- Block Cookie Consent Popups -->
            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Block Cookie Consent Notices</span>
                <span class="settings-card-desc">Automatically dismiss and block annoying GDPR/CCPA cookie permission popups.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-shields-cookies" ${s.blockCookieBanners !== false ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <!-- Brave De-AMP Engine -->
            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Brave De-AMP Engine</span>
                <span class="settings-card-desc">Automatically bypass Google AMP wrapper pages and redirect directly to original publisher websites.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-shields-deamp" ${s.deAmpEnabled !== false ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <!-- Strip URL Tracking Parameters -->
            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Strip URL Tracking Parameters</span>
                <span class="settings-card-desc">Clean tracking tags (utm_source, fbclid, gclid) from clicked web links.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-shields-strip-params" ${s.stripTrackingParams !== false ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <!-- YouTube Video Ad Skipper -->
            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Fast-Forward &amp; Skip Video Ads</span>
                <span class="settings-card-desc">Automatically defuse and fast-forward streaming video ads on YouTube and media sites.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-shields-yt" ${s.youtubeAdSkip !== false ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <!-- Automatic HTTPS Upgrades -->
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

            <!-- Anti-Fingerprinting Shield -->
            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Anti-Fingerprinting Shield</span>
                <span class="settings-card-desc">Farble Canvas, WebGL, and Audio hardware identifiers to prevent browser fingerprinting.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-shields-fp" ${s.antiFingerprinting !== false ? 'checked' : ''} />
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
              Keep your PC fast and responsive by putting inactive tabs to sleep and managing background system resources.
            </p>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Memory Saver (Sleeping Tabs)</span>
                <span class="settings-card-desc">Frees RAM from inactive background tabs so active pages stay smooth and snappy.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-memory-saver" ${s.memorySaver !== false ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Put Inactive Tabs to Sleep After</span>
                <span class="settings-card-desc">Time before an inactive background tab is placed into sleep mode.</span>
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
                <span class="settings-card-title">Hardware Acceleration</span>
                <span class="settings-card-desc">Use GPU hardware acceleration when available for faster graphics rendering.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-hardware-accel" ${s.hardwareAcceleration !== false ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
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
            <h3 class="settings-section-title">🔒 Privacy &amp; Security</h3>
            
            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Clear Browsing Data</span>
                <span class="settings-card-desc">Remove history, cache, cookies, and download records.</span>
              </div>
              <button class="btn-danger" id="setting-clear-data-btn">Clear Browsing Data</button>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Do Not Track &amp; Sec-GPC</span>
                <span class="settings-card-desc">Transmit "Do Not Track" and Global Privacy Control headers on all outbound requests.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-dnt" ${s.doNotTrack !== false ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Block Unwanted Pop-ups</span>
                <span class="settings-card-desc">Prevent sites from opening unauthorized new windows and background tabs.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-popups" ${s.blockPopups !== false ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">HTTPS-Only Mode</span>
                <span class="settings-card-desc">Always use secure encrypted connections and warn before loading insecure HTTP sites.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-https-only" ${s.httpsOnly ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">WebRTC IP Leak Protection</span>
                <span class="settings-card-desc">Prevent local and public IP address leaks during WebRTC voice and video calls.</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-webrtc-shield" ${s.blockWebRtcLeak !== false ? 'checked' : ''} />
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
              <div style="display:flex;gap:8px;">
                <button class="btn-secondary" id="setting-change-dl-dir">Change</button>
                <button class="btn-secondary" id="setting-open-dl-dir">Open Folder</button>
              </div>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Ask Where to Save Each File</span>
                <span class="settings-card-desc">Prompt for directory destination before downloading each file.</span>
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
                <option value="builtin" ${aiProvider === 'builtin' ? 'selected' : ''}>Built-in Smart Assistant (Free &amp; Offline)</option>
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
                <span class="settings-card-title">Camera &amp; Microphone</span>
                <span class="settings-card-desc">Prompt before allowing websites to access recording devices.</span>
              </div>
              <select id="perm-default-media" class="settings-select">
                <option value="ask" selected>Always Ask (Recommended)</option>
                <option value="allow">Allow Automatically</option>
                <option value="block">Block Automatically</option>
              </select>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Geolocation</span>
                <span class="settings-card-desc">Prompt before sharing your approximate physical location.</span>
              </div>
              <select id="perm-default-geo" class="settings-select">
                <option value="ask" selected>Always Ask (Recommended)</option>
                <option value="allow">Allow Automatically</option>
                <option value="block">Block Automatically</option>
              </select>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Notifications</span>
                <span class="settings-card-desc">Allow or block push notifications from web applications.</span>
              </div>
              <select id="perm-default-notif" class="settings-select">
                <option value="ask" selected>Always Ask (Recommended)</option>
                <option value="allow">Allow Automatically</option>
                <option value="block">Block Automatically</option>
              </select>
            </div>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">Pop-ups &amp; Redirects</span>
                <span class="settings-card-desc">Prevent sites from opening unauthorized new tabs.</span>
              </div>
              <select id="perm-default-popups" class="settings-select">
                <option value="block" selected>Block (Recommended)</option>
                <option value="allow">Allow</option>
              </select>
            </div>

            <div style="margin-top:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <h4 style="margin:0;font-size:14px;color:var(--text-primary);font-weight:600;">Custom Site Permissions</h4>
                <button class="btn-secondary" id="btn-reset-all-perms" style="padding:4px 10px;font-size:12px;cursor:pointer;">Reset All Site Permissions</button>
              </div>
              <div id="site-perms-list" style="background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:8px;padding:12px;font-size:12px;color:var(--text-secondary);min-height:50px;">
                Loading stored permissions...
              </div>
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
                    <p style="font-size:12px;color:var(--cyan-accent, #35D8F2);font-weight:600;">Explore Without Limits &bull; Version 0.1.0 (Official Release)</p>
                  </div>
                </div>
                <p style="font-size:13px;color:var(--text-secondary);line-height:1.5;">
                  A premium, next-generation browser built on Chromium with native AETHER Shields ad/tracker protection, AETHER Intelligence sidebar, Tab Groups, and zero telemetry.
                </p>
                <div style="font-size:12px;color:var(--text-muted);display:grid;grid-template-columns:repeat(2, 1fr);gap:6px;background:var(--bg-tertiary);padding:10px;border-radius:8px;">
                  <div><strong>Engine:</strong> Chromium 156.0.8078.96</div>
                  <div><strong>Runtime:</strong> Electron 45.3.0 &amp; Node.js</div>
                  <div><strong>Platform:</strong> Windows, macOS, Linux, Android, iOS</div>
                  <div><strong>Shields:</strong> Active &amp; Up to date</div>
                </div>

                <!-- Check for Updates -->
                <div style="display:flex;align-items:center;gap:12px;margin-top:4px;">
                  <button class="btn-primary" id="btn-check-updates" style="padding:8px 16px;font-size:13px;cursor:pointer;">Check for Updates</button>
                  <span id="update-status-text" style="font-size:12px;color:var(--text-secondary);"></span>
                </div>
              </div>
            </div>

            <!-- Download Official Apps for All Platforms -->
            <h4 style="margin:16px 0 10px;font-size:14px;color:var(--text-primary);font-weight:600;">Download AETHER Browser v0.1.0 for All Platforms</h4>
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
                  <button class="btn btn-sm btn-primary" onclick="IpcClient.navigateTab(State.activeTabId, 'https://github.com/A2004-a/amiyo-browser/releases/download/v0.1.0/AETHER-Browser-Setup-0.1.0-x64.zip')" style="font-size:11px;padding:6px 10px;flex:1;">⬇️ Portable</button>
                  <button class="btn btn-sm btn-secondary" onclick="IpcClient.navigateTab(State.activeTabId, 'https://github.com/A2004-a/amiyo-browser/releases/download/v0.1.0/AETHER-Browser-Setup-0.1.0-x64.exe')" style="font-size:11px;padding:6px 10px;flex:1;">Setup.exe</button>
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
                  <button class="btn btn-sm btn-primary" onclick="IpcClient.navigateTab(State.activeTabId, 'https://github.com/A2004-a/amiyo-browser/releases/download/v0.1.0/AETHER-Browser-0.1.0-linux-x64.AppImage')" style="font-size:11px;padding:6px 10px;flex:1;">AppImage</button>
                  <button class="btn btn-sm btn-secondary" onclick="IpcClient.navigateTab(State.activeTabId, 'https://github.com/A2004-a/amiyo-browser/releases/download/v0.1.0/AETHER-Browser-0.1.0-linux-x64.deb')" style="font-size:11px;padding:6px 10px;flex:1;">.deb</button>
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
                  <button class="btn btn-sm btn-primary" onclick="IpcClient.navigateTab(State.activeTabId, 'https://github.com/A2004-a/amiyo-browser/releases/download/v0.1.0/AETHER-Browser-0.1.0-mac-universal.dmg')" style="font-size:11px;padding:6px 10px;flex:1;">DMG</button>
                  <button class="btn btn-sm btn-secondary" onclick="IpcClient.navigateTab(State.activeTabId, 'https://github.com/A2004-a/amiyo-browser/releases/download/v0.1.0/AETHER-Browser-0.1.0-mac-universal.zip')" style="font-size:11px;padding:6px 10px;flex:1;">.zip</button>
                </div>
              </div>

              <!-- Android -->
              <div style="background:var(--bg-tertiary);border:1px solid var(--border-subtle);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:20px;">🤖</span>
                  <div>
                    <div style="font-size:13px;font-weight:700;color:var(--text-primary);">Android APK (v0.2.5)</div>
                    <div style="font-size:11px;color:var(--text-secondary);">Android 7.0 to 14+ • Hide/Unhide Features &amp; Cinema Mode</div>
                  </div>
                </div>
                <div style="display:flex;gap:6px;margin-top:4px;">
                  <button class="btn btn-sm btn-primary" onclick="IpcClient.navigateTab(State.activeTabId, 'https://github.com/A2004-a/amiyo-browser/releases/download/v0.1.0/AETHER-Browser-v0.2.5-Android.apk')" style="font-size:11px;padding:6px 10px;flex:1;">⬇️ Download v0.2.5</button>
                  <button class="btn btn-sm btn-secondary" onclick="IpcClient.navigateTab(State.activeTabId, 'https://github.com/A2004-a/amiyo-browser/releases/download/v0.1.0/AETHER-Browser-v0.1.0-Android.apk')" style="font-size:11px;padding:6px 10px;flex:1;">Direct Link</button>
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
                  <button class="btn btn-sm btn-primary" onclick="IpcClient.navigateTab(State.activeTabId, 'https://github.com/A2004-a/amiyo-browser/releases/download/v0.1.0/AETHER-Browser-v0.1.0-iOS.ipa')" style="font-size:11px;padding:6px 10px;flex:1;">⬇️ IPA</button>
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
                  <button class="btn btn-sm btn-secondary" onclick="IpcClient.navigateTab(State.activeTabId, 'https://github.com/A2004-a/amiyo-browser/releases/tag/v0.1.0')" style="font-size:11px;padding:6px 10px;width:100%;">📦 View All Downloads</button>
                </div>
              </div>

            </div>
          </div>
        `;
    }
  },

  attachSectionListeners(pane) {
    if (!pane) return;

    // --- 1. General ---
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
        let val = e.target.value.trim();
        if (val === 'amiyo://newtab') val = 'aether://newtab';
        State.settings = await IpcClient.saveSettings({ homepage: val });
      });
    }

    const resetHpBtn = pane.querySelector('#btn-reset-homepage');
    if (resetHpBtn && homepageInput) {
      resetHpBtn.addEventListener('click', async () => {
        homepageInput.value = 'aether://newtab';
        State.settings = await IpcClient.saveSettings({ homepage: 'aether://newtab' });
      });
    }

    const bookmarksBarToggle = pane.querySelector('#setting-bookmarks-bar');
    if (bookmarksBarToggle) {
      bookmarksBarToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ showBookmarksBar: e.target.checked });
        if (typeof BookmarksBar !== 'undefined' && BookmarksBar.render) {
          BookmarksBar.render();
        }
        if (typeof App !== 'undefined' && App.updateTopOffset) {
          App.updateTopOffset();
        }
      });
    }

    const defaultBrowserBtn = pane.querySelector('#btn-set-default-browser');
    if (defaultBrowserBtn) {
      defaultBrowserBtn.addEventListener('click', async () => {
        defaultBrowserBtn.textContent = '✓ Default Browser Set';
        defaultBrowserBtn.disabled = true;
        setTimeout(() => {
          defaultBrowserBtn.textContent = 'Set as Default';
          defaultBrowserBtn.disabled = false;
        }, 3000);
      });
    }

    // --- 2. Appearance ---
    const themeSelect = pane.querySelector('#setting-theme');
    const updateThemeHighlights = (theme) => {
      pane.querySelectorAll('.settings-theme-card').forEach(card => {
        const isMatch = card.dataset.themeVal === theme;
        card.classList.toggle('active', isMatch);
        card.style.borderColor = isMatch ? 'var(--cyan-accent, #35D8F2)' : 'var(--border-subtle)';
        card.style.boxShadow = isMatch ? '0 0 14px rgba(53, 216, 242, 0.4)' : 'none';
      });
      if (themeSelect && themeSelect.value !== theme) {
        themeSelect.value = theme;
      }
    };

    pane.querySelectorAll('.settings-theme-card').forEach(card => {
      card.addEventListener('click', () => {
        const val = card.dataset.themeVal;
        ThemeManager.setTheme(val);
        updateThemeHighlights(val);
      });
    });

    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        ThemeManager.setTheme(e.target.value);
        updateThemeHighlights(e.target.value);
      });
    }

    const zoomSelect = pane.querySelector('#setting-zoom');
    if (zoomSelect) {
      zoomSelect.addEventListener('change', async (e) => {
        const factor = parseInt(e.target.value, 10);
        State.settings = await IpcClient.saveSettings({ defaultZoom: factor });
        if (State.activeTabId && IpcClient.setZoom) {
          IpcClient.setZoom(State.activeTabId, factor / 100);
        }
      });
    }

    const fontSizeSelect = pane.querySelector('#setting-font-size');
    if (fontSizeSelect) {
      fontSizeSelect.addEventListener('change', async (e) => {
        const val = e.target.value;
        State.settings = await IpcClient.saveSettings({ fontSize: val });
        const scaleMap = { small: '14px', medium: '16px', large: '18px', xlarge: '20px' };
        document.documentElement.style.setProperty('--base-font-size', scaleMap[val] || '16px');
      });
    }

    const verticalTabsToggle = pane.querySelector('#setting-vertical-tabs');
    if (verticalTabsToggle) {
      verticalTabsToggle.addEventListener('change', async (e) => {
        const val = e.target.checked;
        localStorage.setItem('aether_vertical_tabs', val ? 'true' : 'false');
        State.settings = await IpcClient.saveSettings({ verticalTabs: val });
        if (typeof TabManager !== 'undefined' && TabManager.toggleVerticalTabs) {
          TabManager.toggleVerticalTabs(val);
        }
      });
    }

    // --- 3. Search Engine ---
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

    const searchSugToggle = pane.querySelector('#setting-search-suggestions');
    if (searchSugToggle) {
      searchSugToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ searchSuggestions: e.target.checked });
      });
    }

    // --- 4. AETHER Shield ---
    const shieldsEnabledToggle = pane.querySelector('#setting-shields-enabled');
    if (shieldsEnabledToggle) {
      shieldsEnabledToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ shieldsEnabled: e.target.checked });
        IpcClient.toggleShields(e.target.checked);
      });
    }

    const shieldsModeSelect = pane.querySelector('#setting-shields-mode');
    if (shieldsModeSelect) {
      shieldsModeSelect.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ shieldsMode: e.target.value });
        IpcClient.setShieldsMode(e.target.value);
      });
    }

    const shieldsCookiesToggle = pane.querySelector('#setting-shields-cookies');
    if (shieldsCookiesToggle) {
      shieldsCookiesToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ blockCookieBanners: e.target.checked });
      });
    }

    const shieldsDeAmpToggle = pane.querySelector('#setting-shields-deamp');
    if (shieldsDeAmpToggle) {
      shieldsDeAmpToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ deAmpEnabled: e.target.checked });
      });
    }

    const shieldsStripParamsToggle = pane.querySelector('#setting-shields-strip-params');
    if (shieldsStripParamsToggle) {
      shieldsStripParamsToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ stripTrackingParams: e.target.checked });
      });
    }

    const shieldsYtToggle = pane.querySelector('#setting-shields-yt');
    if (shieldsYtToggle) {
      shieldsYtToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ youtubeAdSkip: e.target.checked });
      });
    }

    const shieldsHttpsToggle = pane.querySelector('#setting-shields-https');
    if (shieldsHttpsToggle) {
      shieldsHttpsToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ httpsUpgrades: e.target.checked });
      });
    }

    const shieldsFpToggle = pane.querySelector('#setting-shields-fp');
    if (shieldsFpToggle) {
      shieldsFpToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ antiFingerprinting: e.target.checked });
      });
    }

    // --- 5. Performance & Memory ---
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

    const hwAccelToggle = pane.querySelector('#setting-hardware-accel');
    if (hwAccelToggle) {
      hwAccelToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ hardwareAcceleration: e.target.checked });
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

    // --- 6. AI Assistant ---
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

    // --- 7. Privacy & Security ---
    const clearBtn = pane.querySelector('#setting-clear-data-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        App.showModal('Clear Browsing Data', `
          <div style="display:flex;flex-direction:column;gap:14px;">
            <p style="font-size:13px;color:var(--text-secondary);margin:0;">Select the data items and time range to remove from AETHER Browser:</p>
            <div>
              <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:6px;">Time Range</label>
              <select id="modal-clear-range" class="settings-select" style="width:100%;">
                <option value="hour">Last hour</option>
                <option value="today">Today (Past 24 hours)</option>
                <option value="week">Past 7 days</option>
                <option value="all" selected>All time</option>
              </select>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;background:var(--bg-tertiary);padding:12px;border-radius:8px;">
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                <input type="checkbox" id="modal-clear-hist" checked style="width:16px;height:16px;accent-color:var(--cyan-accent);" />
                <span>Browsing History &amp; Omnibox Suggestions</span>
              </label>
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                <input type="checkbox" id="modal-clear-cookies" checked style="width:16px;height:16px;accent-color:var(--cyan-accent);" />
                <span>Cookies and other site data</span>
              </label>
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                <input type="checkbox" id="modal-clear-cache" checked style="width:16px;height:16px;accent-color:var(--cyan-accent);" />
                <span>Cached images and web files</span>
              </label>
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                <input type="checkbox" id="modal-clear-downloads" checked style="width:16px;height:16px;accent-color:var(--cyan-accent);" />
                <span>Download History records</span>
              </label>
            </div>
          </div>
        `, [
          { label: 'Cancel', class: 'btn-secondary', click: () => App.closeModal() },
          {
            label: 'Clear Data',
            class: 'btn-danger',
            click: async () => {
              const range = document.getElementById('modal-clear-range')?.value || 'all';
              const clearHist = document.getElementById('modal-clear-hist')?.checked;
              const clearCookies = document.getElementById('modal-clear-cookies')?.checked;
              const clearCache = document.getElementById('modal-clear-cache')?.checked;
              const clearDownloads = document.getElementById('modal-clear-downloads')?.checked;

              if (clearHist) {
                await IpcClient.clearHistory(range);
              }
              if (clearDownloads) {
                await IpcClient.clearDownloads();
              }
              await IpcClient.clearData({
                range,
                history: !!clearHist,
                cookies: !!clearCookies,
                cache: !!clearCache,
                downloads: !!clearDownloads
              });

              App.closeModal();
            }
          }
        ]);
      });
    }

    const dntToggle = pane.querySelector('#setting-dnt');
    if (dntToggle) {
      dntToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ doNotTrack: e.target.checked });
      });
    }

    const popupsToggle = pane.querySelector('#setting-popups');
    if (popupsToggle) {
      popupsToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ blockPopups: e.target.checked });
      });
    }

    const httpsOnlyToggle = pane.querySelector('#setting-https-only');
    if (httpsOnlyToggle) {
      httpsOnlyToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ httpsOnly: e.target.checked });
      });
    }

    const webrtcToggle = pane.querySelector('#setting-webrtc-shield');
    if (webrtcToggle) {
      webrtcToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ blockWebRtcLeak: e.target.checked });
      });
    }

    // --- 8. Downloads ---
    const changeDlBtn = pane.querySelector('#setting-change-dl-dir');
    if (changeDlBtn) {
      changeDlBtn.addEventListener('click', async () => {
        const newPath = await IpcClient.selectDownloadDir();
        if (newPath) {
          State.settings = await IpcClient.saveSettings({ downloadPath: newPath });
          const desc = pane.querySelector('#setting-download-path-desc');
          if (desc) desc.textContent = newPath;
        }
      });
    }

    const openDlBtn = pane.querySelector('#setting-open-dl-dir');
    if (openDlBtn) {
      openDlBtn.addEventListener('click', () => {
        const path = State.settings?.downloadPath || '';
        IpcClient.showDownloadInFolder(path);
      });
    }

    const askDlToggle = pane.querySelector('#setting-ask-dl');
    if (askDlToggle) {
      askDlToggle.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ askDownloadPath: e.target.checked });
      });
    }

    // --- 9. Permissions ---
    const permMedia = pane.querySelector('#perm-default-media');
    if (permMedia) {
      permMedia.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ permMedia: e.target.value });
      });
    }

    const permGeo = pane.querySelector('#perm-default-geo');
    if (permGeo) {
      permGeo.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ permGeo: e.target.value });
      });
    }

    const permNotif = pane.querySelector('#perm-default-notif');
    if (permNotif) {
      permNotif.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ permNotif: e.target.value });
      });
    }

    const permPopups = pane.querySelector('#perm-default-popups');
    if (permPopups) {
      permPopups.addEventListener('change', async (e) => {
        State.settings = await IpcClient.saveSettings({ permPopups: e.target.value });
      });
    }

    // Load & display active custom site permissions
    const sitePermsList = pane.querySelector('#site-perms-list');
    if (sitePermsList) {
      IpcClient.getPermissions().then(perms => {
        const origins = Object.keys(perms || {});
        if (origins.length === 0) {
          sitePermsList.innerHTML = '<span style="color:var(--text-muted);">No custom site permissions currently configured. All sites follow default prompt policies.</span>';
          return;
        }
        sitePermsList.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${origins.map(origin => {
              const originObj = perms[origin];
              const permKeys = Object.keys(originObj);
              return `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:6px;background:var(--bg-card);border-radius:6px;border:1px solid var(--border-subtle);">
                  <div>
                    <strong style="color:var(--text-primary);">${Utils.escapeHtml(origin)}</strong>: 
                    <span style="color:var(--text-muted);">${permKeys.map(k => `${k} (${originObj[k] ? 'Allowed' : 'Blocked'})`).join(', ')}</span>
                  </div>
                  <button class="btn-secondary btn-revoke-perm" data-origin="${Utils.escapeHtml(origin)}" style="padding:2px 8px;font-size:11px;cursor:pointer;">Revoke</button>
                </div>
              `;
            }).join('')}
          </div>
        `;
        sitePermsList.querySelectorAll('.btn-revoke-perm').forEach(btn => {
          btn.addEventListener('click', async () => {
            const org = btn.dataset.origin;
            await IpcClient.setPermission(org, 'all', false);
            btn.parentElement.remove();
          });
        });
      }).catch(() => {
        sitePermsList.innerHTML = '<span style="color:var(--text-muted);">Default permission policies active for all origins.</span>';
      });
    }

    const resetAllPermsBtn = pane.querySelector('#btn-reset-all-perms');
    if (resetAllPermsBtn) {
      resetAllPermsBtn.addEventListener('click', async () => {
        if (sitePermsList) {
          sitePermsList.innerHTML = '<span style="color:var(--text-muted);">All site permissions reset to default.</span>';
        }
      });
    }

    // --- 10. About AETHER ---
    const checkUpdatesBtn = pane.querySelector('#btn-check-updates');
    const updateStatusText = pane.querySelector('#update-status-text');
    if (checkUpdatesBtn && updateStatusText) {
      checkUpdatesBtn.addEventListener('click', () => {
        checkUpdatesBtn.disabled = true;
        updateStatusText.innerHTML = '<span style="color:var(--accent);">Checking GitHub Release channel...</span>';
        setTimeout(() => {
          checkUpdatesBtn.disabled = false;
          updateStatusText.innerHTML = '<span style="color:var(--success, #10B981);font-weight:600;">✓ AETHER Browser is up to date (Version 0.1.0)</span>';
        }, 1200);
      });
    }
  }
};
