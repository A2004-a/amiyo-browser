const Homepage = {
  clockInterval: null,

  defaultShortcuts: [
    { title: 'Google', url: 'https://www.google.com', icon: 'https://www.google.com/favicon.ico' },
    { title: 'YouTube', url: 'https://www.youtube.com', icon: 'https://www.youtube.com/s/desktop/f719b161/img/favicon.ico' },
    { title: 'GitHub', url: 'https://github.com', icon: 'https://github.githubassets.com/favicons/favicon.png' },
    { title: 'Wikipedia', url: 'https://www.wikipedia.org', icon: 'https://www.wikipedia.org/static/favicon/wikipedia.ico' },
    { title: 'Reddit', url: 'https://www.reddit.com', icon: 'https://www.redditstatic.com/shreddit/assets/favicon/192x192.png' },
    { title: 'Twitter / X', url: 'https://x.com', icon: 'https://abs.twimg.com/favicons/twitter.3.ico' }
  ],

  render(container) {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }

    const shortcuts = this.getShortcuts();

    container.innerHTML = `
      <div class="newtab-page">
        <div class="newtab-clock-section">
          <div class="newtab-time" id="newtab-clock">12:00</div>
          <div class="newtab-date" id="newtab-date">Monday, January 1</div>
          <div class="newtab-greeting" id="newtab-greeting">Welcome to AMIYO Browser</div>
        </div>

        <div class="newtab-search-container">
          <div class="newtab-search-icon">${Utils.icons.search}</div>
          <input type="text" class="newtab-search-input" id="newtab-search-input" placeholder="Search the web or type a URL..." autofocus />
        </div>

        <div class="newtab-section-title">Quick Access</div>
        <div class="newtab-shortcuts-grid" id="shortcuts-grid">
          ${shortcuts.map((s, idx) => `
            <div class="shortcut-tile" data-url="${Utils.escapeHtml(s.url)}" title="${Utils.escapeHtml(s.title)}">
              <div class="shortcut-icon-box">
                ${s.icon ? `<img src="${Utils.escapeHtml(s.icon)}" onerror="this.onerror=null; this.style.display='none';" />` : Utils.escapeHtml(s.title[0] || 'W')}
              </div>
              <div class="shortcut-label">${Utils.escapeHtml(s.title)}</div>
            </div>
          `).join('')}
          <div class="shortcut-tile" id="add-shortcut-btn" title="Add shortcut">
            <div class="shortcut-icon-box" style="color:var(--text-muted);border:1px dashed var(--border-hover);">${Utils.icons.plus}</div>
            <div class="shortcut-label">Add Shortcut</div>
          </div>
        </div>

        <div class="newtab-quick-nav">
          <div class="quick-nav-card" id="qnav-history">
            <div class="quick-nav-icon">${Utils.icons.history}</div>
            <div class="quick-nav-text">
              <h4>History</h4>
              <p>Browse history</p>
            </div>
          </div>
          <div class="quick-nav-card" id="qnav-bookmarks">
            <div class="quick-nav-icon">${Utils.icons.bookmark}</div>
            <div class="quick-nav-text">
              <h4>Bookmarks</h4>
              <p>Saved pages</p>
            </div>
          </div>
          <div class="quick-nav-card" id="qnav-downloads">
            <div class="quick-nav-icon">${Utils.icons.download}</div>
            <div class="quick-nav-text">
              <h4>Downloads</h4>
              <p>Downloaded files</p>
            </div>
          </div>
          <div class="quick-nav-card" id="qnav-settings">
            <div class="quick-nav-icon">${Utils.icons.settings}</div>
            <div class="quick-nav-text">
              <h4>Settings</h4>
              <p>Preferences</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Start clock
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);

    // Search bar listener
    const searchInput = container.querySelector('#newtab-search-input');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13 || e.which === 13) {
          e.preventDefault();
          const val = searchInput.value.trim();
          if (val) {
            IpcClient.navigateTab(State.activeTabId || '', val);
          }
        }
      });
    }

    // Shortcut tiles click
    container.querySelectorAll('.shortcut-tile[data-url]').forEach(tile => {
      tile.addEventListener('click', () => {
        const url = tile.dataset.url;
        IpcClient.navigateTab(State.activeTabId, url);
      });
    });

    // Add shortcut button
    const addBtn = container.querySelector('#add-shortcut-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.promptAddShortcut();
      });
    }

    // Quick nav cards
    container.querySelector('#qnav-history')?.addEventListener('click', () => {
      IpcClient.navigateTab(State.activeTabId, 'amiyo://history');
    });
    container.querySelector('#qnav-bookmarks')?.addEventListener('click', () => {
      IpcClient.navigateTab(State.activeTabId, 'amiyo://bookmarks');
    });
    container.querySelector('#qnav-downloads')?.addEventListener('click', () => {
      IpcClient.navigateTab(State.activeTabId, 'amiyo://downloads');
    });
    container.querySelector('#qnav-settings')?.addEventListener('click', () => {
      IpcClient.navigateTab(State.activeTabId, 'amiyo://settings');
    });
  },

  updateClock() {
    const clockEl = document.getElementById('newtab-clock');
    const dateEl = document.getElementById('newtab-date');
    const greetingEl = document.getElementById('newtab-greeting');
    if (!clockEl) return;

    const now = new Date();
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    clockEl.textContent = `${hours % 12 || 12}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`;

    if (dateEl) {
      const options = { weekday: 'long', month: 'long', day: 'numeric' };
      dateEl.textContent = now.toLocaleDateString(undefined, options);
    }

    if (greetingEl) {
      let greeting = 'Good evening';
      if (hours < 12) greeting = 'Good morning';
      else if (hours < 18) greeting = 'Good afternoon';
      greetingEl.textContent = `${greeting}, welcome to AMIYO Browser`;
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

  promptAddShortcut() {
    App.showModal('Add Shortcut', `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div>
          <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px;">Title</label>
          <input type="text" id="shortcut-name-input" class="settings-input" style="width:100%;" placeholder="e.g. My Website" />
        </div>
        <div>
          <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px;">URL</label>
          <input type="text" id="shortcut-url-input" class="settings-input" style="width:100%;" placeholder="https://example.com" />
        </div>
      </div>
    `, [
      {
        label: 'Cancel',
        class: 'btn-secondary',
        click: () => App.closeModal()
      },
      {
        label: 'Add Shortcut',
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
  }
};

