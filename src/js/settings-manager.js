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
          <div class="settings-nav-item ${this.activeSection === 'ai' ? 'active' : ''}" data-sec="ai">✨ AI Assistant</div>
          <div class="settings-nav-item ${this.activeSection === 'privacy' ? 'active' : ''}" data-sec="privacy">Privacy & Security</div>
          <div class="settings-nav-item ${this.activeSection === 'downloads' ? 'active' : ''}" data-sec="downloads">Downloads</div>
          <div class="settings-nav-item ${this.activeSection === 'permissions' ? 'active' : ''}" data-sec="permissions">Permissions</div>
          <div class="settings-nav-item ${this.activeSection === 'about' ? 'active' : ''}" data-sec="about">About AMIYO</div>
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
                <span class="settings-card-desc">Choose what to display when AMIYO Browser opens.</span>
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
              <input type="text" id="setting-homepage" class="settings-input" value="${Utils.escapeHtml(s.homepage || 'amiyo://newtab')}" />
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
            <h3 class="settings-section-title">✨ AMIYO AI Assistant</h3>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">
              Configure your built-in AI assistant, choose your intelligence provider, or connect Google Gemini or OpenAI.
            </p>

            <div class="settings-card">
              <div class="settings-card-info">
                <span class="settings-card-title">AI Provider</span>
                <span class="settings-card-desc">Select which engine powers the AMIYO AI sidebar.</span>
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
                <span class="settings-card-desc">Allow AMIYO AI to extract clean readable text from your active tab when asking questions.</span>
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
            <h3 class="settings-section-title">About AMIYO Browser</h3>
            
            <div class="settings-card" style="align-items:flex-start;">
              <div class="settings-card-info" style="gap:12px;">
                <div style="display:flex;align-items:center;gap:12px;">
                  <div style="width:40px;height:40px;background:var(--accent-gradient);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;color:#fff;">A</div>
                  <div>
                    <h4 style="font-size:16px;font-weight:700;">AMIYO Browser</h4>
                    <p style="font-size:12px;color:var(--text-muted);">Version 1.0.0 (Production Release)</p>
                  </div>
                </div>
                <p style="font-size:13px;color:var(--text-secondary);line-height:1.5;">
                  A fast, secure, modern desktop web browser built with pure HTML5, CSS3, Vanilla JavaScript, and Electron. Powered by isolated Chromium WebContentsView architecture.
                </p>
                <div style="font-size:12px;color:var(--text-muted);display:flex;flex-direction:column;gap:4px;">
                  <div>Engine: Chromium 156.0.8078.96</div>
                  <div>Runtime: Electron 45.3.0 &amp; Node.js</div>
                  <div>Status: Up to date</div>
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
      searchSelect.addEventListener('change', async (e) => {
        const val = e.target.value;
        if (customCard) customCard.classList.toggle('hidden', val !== 'custom');
        State.settings = await IpcClient.saveSettings({ searchEngine: val });
        if (typeof Omnibox !== 'undefined' && Omnibox.updateSearchEngine) {
          Omnibox.updateSearchEngine(val);
        }
        if (typeof Homepage !== 'undefined' && Homepage.updateSearchPlaceholder) {
          Homepage.updateSearchPlaceholder(val);
        }
      });
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
  }
};

