const fs = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');

class StorageManager {
  constructor() {
    this.dataDir = this.resolveDataDir();
    this.ensureDataDir();

    let defaultDownloadDir = '';
    try {
      if (app && typeof app.isReady === 'function' && app.isReady()) {
        defaultDownloadDir = app.getPath('downloads');
      } else {
        defaultDownloadDir = path.join(os.homedir(), 'Downloads');
      }
    } catch (e) {
      try {
        defaultDownloadDir = path.join(os.homedir(), 'Downloads');
      } catch (err) {
        defaultDownloadDir = '';
      }
    }

    this.defaultSettings = {
      theme: 'dark',
      searchEngine: 'google', // 'google' | 'bing' | 'duckduckgo' | 'custom'
      customSearchUrl: 'https://duckduckgo.com/?q=%s',
      homepage: 'aether://newtab',
      showBookmarksBar: true,
      restoreTabsOnStartup: false,
      searchSuggestions: true,
      defaultZoom: 100,
      downloadPath: defaultDownloadDir,
      askDownloadPath: false,
      hardwareAcceleration: true,
      blockPopups: true,
      doNotTrack: true
    };

    this.defaultBookmarks = [
      {
        id: 'bm_1',
        title: 'Google',
        url: 'https://www.google.com',
        favicon: 'https://www.google.com/favicon.ico',
        dateAdded: Date.now(),
        parentId: 'toolbar'
      },
      {
        id: 'bm_2',
        title: 'GitHub',
        url: 'https://github.com',
        favicon: 'https://github.githubassets.com/favicons/favicon.png',
        dateAdded: Date.now(),
        parentId: 'toolbar'
      },
      {
        id: 'bm_3',
        title: 'Wikipedia',
        url: 'https://www.wikipedia.org',
        favicon: 'https://www.wikipedia.org/static/favicon/wikipedia.ico',
        dateAdded: Date.now(),
        parentId: 'toolbar'
      },
      {
        id: 'bm_4',
        title: 'YouTube',
        url: 'https://www.youtube.com',
        favicon: 'https://www.youtube.com/s/desktop/f719b161/img/favicon.ico',
        dateAdded: Date.now(),
        parentId: 'toolbar'
      }
    ];

    this.cache = {};
    this.init();
  }

  get files() {
    return {
      settings: path.join(this.dataDir, 'settings.json'),
      bookmarks: path.join(this.dataDir, 'bookmarks.json'),
      history: path.join(this.dataDir, 'history.json'),
      downloads: path.join(this.dataDir, 'downloads.json'),
      permissions: path.join(this.dataDir, 'permissions.json'),
      session: path.join(this.dataDir, 'session.json'),
      readingList: path.join(this.dataDir, 'reading-list.json'),
      passwords: path.join(this.dataDir, 'passwords.json'),
      customEngines: path.join(this.dataDir, 'custom-engines.json'),
      hostZoom: path.join(this.dataDir, 'host-zoom.json'),
      customShieldRules: path.join(this.dataDir, 'custom-rules.json'),
      sessionBackup: path.join(this.dataDir, 'session-backup.json'),
      shieldsStats: path.join(this.dataDir, 'shields-stats.json')
    };
  }

  resolveDataDir() {
    // 1. Explicit environment override
    if (process.env.AETHER_DATA_DIR) {
      return process.env.AETHER_DATA_DIR;
    }
    if (process.env.AMIYO_DATA_DIR) {
      return process.env.AMIYO_DATA_DIR;
    }

    const isPackaged = (app && app.isPackaged) || __dirname.includes('app.asar');

    // 2. Packaged app or running inside asar: store in user data
    if (isPackaged) {
      try {
        if (app && typeof app.getPath === 'function') {
          const userData = app.getPath('userData');
          if (userData && typeof userData === 'string' && !userData.includes('app.asar')) {
            return path.join(userData, 'data');
          }
        }
      } catch (e) {}

      const baseDir = (process.platform === 'win32' && process.env.APPDATA)
        ? path.join(process.env.APPDATA, 'AETHER Browser')
        : path.join(os.homedir(), '.aether-browser');
      return path.join(baseDir, 'data');
    }

    // 3. In development outside asar, use project local data directory
    const devDataDir = path.join(__dirname, '..', 'data');
    return devDataDir;
  }

  ensureDataDir() {
    try {
      // Guard: Never attempt to write inside an asar archive
      if (!this.dataDir || this.dataDir.includes('app.asar')) {
        this.dataDir = (process.platform === 'win32' && process.env.APPDATA)
          ? path.join(process.env.APPDATA, 'AETHER Browser', 'data')
          : path.join(os.homedir(), '.aether-browser', 'data');
      }

      if (fs.existsSync(this.dataDir)) {
        try {
          const stat = fs.statSync(this.dataDir);
          if (!stat.isDirectory()) {
            fs.unlinkSync(this.dataDir);
            fs.mkdirSync(this.dataDir, { recursive: true });
          }
        } catch (stErr) {}
      } else {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // Seamless migration from legacy AMIYO Browser data if it exists
      if (process.platform === 'win32' && process.env.APPDATA) {
        const legacyDir = path.join(process.env.APPDATA, 'AMIYO Browser', 'data');
        if (fs.existsSync(legacyDir) && this.dataDir !== legacyDir) {
          try {
            const files = ['settings.json', 'bookmarks.json', 'history.json', 'permissions.json'];
            for (const f of files) {
              const src = path.join(legacyDir, f);
              const dest = path.join(this.dataDir, f);
              if (fs.existsSync(src) && !fs.existsSync(dest)) {
                fs.copyFileSync(src, dest);
              }
            }
          } catch (migErr) {}
        }
      }
    } catch (err) {
      console.error(`Failed to ensure data directory (${this.dataDir}):`, err);
      // Emergency safe fallback to temp directory so app NEVER crashes
      try {
        const fallbackDir = path.join(os.tmpdir(), 'aether-browser-data');
        if (!fs.existsSync(fallbackDir)) {
          fs.mkdirSync(fallbackDir, { recursive: true });
        }
        this.dataDir = fallbackDir;
      } catch (fallbackErr) {
        console.error('Emergency fallback data directory failed:', fallbackErr);
      }
    }
  }

  init() {
    this.cache.settings = this.readJson(this.files.settings, this.defaultSettings);
    // ensure any missing default fields are merged
    this.cache.settings = { ...this.defaultSettings, ...this.cache.settings };

    this.cache.bookmarks = this.readJson(this.files.bookmarks, this.defaultBookmarks);
    this.cache.history = this.readJson(this.files.history, []);
    this.cache.downloads = this.readJson(this.files.downloads, []);
    this.cache.permissions = this.readJson(this.files.permissions, {});
    this.cache.readingList = this.readJson(this.files.readingList, []);
    this.cache.passwords = this.readJson(this.files.passwords, []);
    this.cache.customEngines = this.readJson(this.files.customEngines, [
      { name: 'DuckDuckGo', keyword: 'ddg', searchUrl: 'https://duckduckgo.com/?q=%s' },
      { name: 'YouTube', keyword: 'yt', searchUrl: 'https://www.youtube.com/results?search_query=%s' },
      { name: 'GitHub', keyword: 'gh', searchUrl: 'https://github.com/search?q=%s' },
      { name: 'Wikipedia', keyword: 'wiki', searchUrl: 'https://en.wikipedia.org/wiki/Special:Search?search=%s' },
      { name: 'Reddit', keyword: 'r', searchUrl: 'https://www.reddit.com/search/?q=%s' }
    ]);
    this.cache.hostZoom = this.readJson(this.files.hostZoom, {});
    this.cache.customShieldRules = this.readJson(this.files.customShieldRules, []);
    this.cache.sessionBackup = this.readJson(this.files.sessionBackup, null);
    this.cache.shieldsStats = this.readJson(this.files.shieldsStats, {
      totalBlocked: 0,
      adsBlocked: 0,
      trackersBlocked: 0,
      bandwidthSavedKB: 0,
      timeSavedSec: 0,
      co2SavedGrams: 0
    });

    // Save defaults if files don't exist
    this.saveSettings(this.cache.settings);
    this.saveBookmarks(this.cache.bookmarks);
  }

  readJson(filePath, defaultValue) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
      }
      // Check if fallback seed file exists in bundled project data directory
      const fileName = path.basename(filePath);
      const bundledPath = path.join(__dirname, '..', 'data', fileName);
      if (bundledPath !== filePath && fs.existsSync(bundledPath)) {
        const raw = fs.readFileSync(bundledPath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error(`Error reading ${filePath}:`, err);
    }
    return defaultValue;
  }

  writeJson(filePath, data) {
    try {
      this.ensureDataDir();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error(`Error writing ${filePath}:`, err);
      return false;
    }
  }

  // --- Settings ---
  getSettings() {
    const settings = { ...this.cache.settings };
    if (!settings.downloadPath) {
      try {
        if (app && typeof app.getPath === 'function') {
          settings.downloadPath = app.getPath('downloads');
        }
      } catch (e) {}
    }
    if (settings.homepage === 'amiyo://newtab' || !settings.homepage) {
      settings.homepage = 'aether://newtab';
    }
    return settings;
  }

  saveSettings(newSettings) {
    if (newSettings && newSettings.homepage === 'amiyo://newtab') {
      newSettings.homepage = 'aether://newtab';
    }
    this.cache.settings = { ...this.cache.settings, ...newSettings };
    this.writeJson(this.files.settings, this.cache.settings);
    return this.cache.settings;
  }

  // --- Bookmarks ---
  getBookmarks() {
    return [...this.cache.bookmarks];
  }

  saveBookmarks(bookmarks) {
    this.cache.bookmarks = bookmarks;
    this.writeJson(this.files.bookmarks, this.cache.bookmarks);
    return this.cache.bookmarks;
  }

  addBookmark(item) {
    const bookmark = {
      id: item.id || `bm_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: item.title || 'Untitled',
      url: item.url,
      favicon: item.favicon || '',
      dateAdded: Date.now(),
      parentId: item.parentId || 'toolbar'
    };
    // Check if duplicate url
    const existingIndex = this.cache.bookmarks.findIndex(b => b.url === item.url);
    if (existingIndex >= 0) {
      this.cache.bookmarks[existingIndex] = { ...this.cache.bookmarks[existingIndex], ...bookmark };
    } else {
      this.cache.bookmarks.unshift(bookmark);
    }
    this.saveBookmarks(this.cache.bookmarks);
    return bookmark;
  }

  removeBookmark(id) {
    this.cache.bookmarks = this.cache.bookmarks.filter(b => b.id !== id);
    this.saveBookmarks(this.cache.bookmarks);
    return true;
  }

  updateBookmark(id, updates) {
    const idx = this.cache.bookmarks.findIndex(b => b.id === id);
    if (idx !== -1) {
      this.cache.bookmarks[idx] = { ...this.cache.bookmarks[idx], ...updates };
      this.saveBookmarks(this.cache.bookmarks);
      return this.cache.bookmarks[idx];
    }
    return null;
  }

  // --- History ---
  getHistory() {
    return [...this.cache.history];
  }

  addHistory(entry) {
    if (!entry.url || entry.url.startsWith('amiyo://') || entry.url.startsWith('aether://') || entry.isPrivate) {
      return null;
    }
    const item = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: entry.title || entry.url,
      url: entry.url,
      favicon: entry.favicon || '',
      timestamp: Date.now()
    };
    // Add to top of history, limit to 20,000 items
    this.cache.history.unshift(item);
    if (this.cache.history.length > 20000) {
      this.cache.history.pop();
    }
    this.writeJson(this.files.history, this.cache.history);
    return item;
  }

  deleteHistoryItem(id) {
    this.cache.history = this.cache.history.filter(h => h.id !== id);
    this.writeJson(this.files.history, this.cache.history);
    return true;
  }

  clearHistory(range = 'all') {
    const now = Date.now();
    if (range === 'hour') {
      const oneHourAgo = now - 3600 * 1000;
      this.cache.history = this.cache.history.filter(h => h.timestamp < oneHourAgo);
    } else if (range === 'today') {
      const startOfDay = new Date().setHours(0, 0, 0, 0);
      this.cache.history = this.cache.history.filter(h => h.timestamp < startOfDay);
    } else if (range === 'week') {
      const oneWeekAgo = now - 7 * 24 * 3600 * 1000;
      this.cache.history = this.cache.history.filter(h => h.timestamp < oneWeekAgo);
    } else {
      this.cache.history = [];
    }
    this.writeJson(this.files.history, this.cache.history);
    return true;
  }

  // --- Downloads ---
  getDownloads() {
    return [...this.cache.downloads];
  }

  saveDownload(item) {
    const idx = this.cache.downloads.findIndex(d => d.id === item.id);
    if (idx !== -1) {
      this.cache.downloads[idx] = { ...this.cache.downloads[idx], ...item };
    } else {
      this.cache.downloads.unshift(item);
    }
    this.writeJson(this.files.downloads, this.cache.downloads);
    return item;
  }

  clearDownloads() {
    this.cache.downloads = [];
    this.writeJson(this.files.downloads, this.cache.downloads);
    return true;
  }

  // --- Permissions ---
  getPermissions() {
    return { ...this.cache.permissions };
  }

  setPermission(origin, permission, state) {
    if (!this.cache.permissions[origin]) {
      this.cache.permissions[origin] = {};
    }
    this.cache.permissions[origin][permission] = state;
    this.writeJson(this.files.permissions, this.cache.permissions);
    return this.cache.permissions;
  }

  // --- Session Restore ---
  saveSession(tabs) {
    if (!Array.isArray(tabs)) return false;
    const sessionData = tabs
      .filter(t => t.url && t.url !== 'amiyo://newtab' && t.url !== 'aether://newtab')
      .map(t => ({
        url: t.url,
        title: t.title || 'Tab',
        favicon: t.favicon || '',
        isPinned: !!t.isPinned
      }));
    this.writeJson(this.files.session, sessionData);
    return true;
  }

  getSession() {
    return this.readJson(this.files.session, []);
  }

  // --- Reading List (Read Later Queue) ---
  getReadingList() {
    return [...(this.cache.readingList || [])];
  }

  addReadingListItem(item) {
    if (!item || !item.url) return null;
    const existing = (this.cache.readingList || []).find(r => r.url === item.url);
    if (existing) {
      existing.isRead = false;
      existing.timestamp = Date.now();
      this.writeJson(this.files.readingList, this.cache.readingList);
      return existing;
    }
    const entry = {
      id: `rl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: item.title || item.url,
      url: item.url,
      favicon: item.favicon || '',
      isRead: false,
      timestamp: Date.now()
    };
    if (!this.cache.readingList) this.cache.readingList = [];
    this.cache.readingList.unshift(entry);
    this.writeJson(this.files.readingList, this.cache.readingList);
    return entry;
  }

  toggleReadingListItem(id) {
    const list = this.cache.readingList || [];
    const item = list.find(r => r.id === id);
    if (item) {
      item.isRead = !item.isRead;
      this.writeJson(this.files.readingList, list);
      return item;
    }
    return null;
  }

  removeReadingListItem(id) {
    const list = this.cache.readingList || [];
    this.cache.readingList = list.filter(r => r.id !== id);
    this.writeJson(this.files.readingList, this.cache.readingList);
    return true;
  }

  // --- Host Zoom Memory ---
  getHostZoom(host) {
    if (!host) return 100;
    const cleanHost = host.toLowerCase().replace(/:\d+$/, '');
    return (this.cache.hostZoom && typeof this.cache.hostZoom[cleanHost] === 'number')
      ? this.cache.hostZoom[cleanHost]
      : 100;
  }

  setHostZoom(host, zoomPercent) {
    if (!host) return;
    const cleanHost = host.toLowerCase().replace(/:\d+$/, '');
    if (!this.cache.hostZoom) this.cache.hostZoom = {};
    if (zoomPercent === 100) {
      delete this.cache.hostZoom[cleanHost];
    } else {
      this.cache.hostZoom[cleanHost] = Math.round(zoomPercent);
    }
    this.writeJson(this.files.hostZoom, this.cache.hostZoom);
    return this.cache.hostZoom;
  }

  // --- Passwords / Credentials Vault ---
  getPasswords() {
    return [...(this.cache.passwords || [])];
  }

  savePassword(entry) {
    const site = entry?.site || entry?.url;
    if (!entry || !site || !entry.username) return null;
    const passwords = this.cache.passwords || [];
    const existingIdx = passwords.findIndex(p => (p.site === site || p.url === site) && p.username === entry.username);
    const item = {
      id: entry.id || `pwd_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      site: site,
      url: site,
      username: entry.username,
      password: entry.password || '',
      updatedAt: Date.now()
    };
    if (existingIdx !== -1) {
      passwords[existingIdx] = item;
    } else {
      passwords.unshift(item);
    }
    this.cache.passwords = passwords;
    this.writeJson(this.files.passwords, passwords);
    return item;
  }

  deletePassword(id) {
    const passwords = this.cache.passwords || [];
    this.cache.passwords = passwords.filter(p => p.id !== id);
    this.writeJson(this.files.passwords, this.cache.passwords);
    return true;
  }

  // --- Custom Search Engines ---
  getCustomSearchEngines() {
    return [...(this.cache.customEngines || [])];
  }

  addCustomSearchEngine(engine) {
    if (!engine || !engine.name || !engine.keyword || !engine.searchUrl) return null;
    const engines = this.cache.customEngines || [];
    const idx = engines.findIndex(e => e.keyword.toLowerCase() === engine.keyword.toLowerCase());
    const item = {
      name: engine.name,
      keyword: engine.keyword.toLowerCase(),
      searchUrl: engine.searchUrl
    };
    if (idx !== -1) {
      engines[idx] = item;
    } else {
      engines.push(item);
    }
    this.cache.customEngines = engines;
    this.writeJson(this.files.customEngines, engines);
    return item;
  }

  deleteCustomSearchEngine(keyword) {
    const engines = this.cache.customEngines || [];
    this.cache.customEngines = engines.filter(e => e.keyword.toLowerCase() !== keyword.toLowerCase());
    this.writeJson(this.files.customEngines, this.cache.customEngines);
    return true;
  }

  // --- Netscape HTML Bookmarks Export / Import ---
  exportBookmarksToNetscapeHtml(customBookmarks = null) {
    const bookmarks = customBookmarks || this.getBookmarks();
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="${Math.floor(Date.now() / 1000)}" LAST_MODIFIED="${Math.floor(Date.now() / 1000)}" PERSONAL_TOOLBAR_FOLDER="true">Bookmarks Bar</H3>
    <DL><p>
`;
    for (const b of bookmarks) {
      const title = (b.title || b.url || 'Bookmark').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const icon = b.favicon ? ` ICON="${b.favicon}"` : '';
      const addDate = Math.floor((b.dateAdded || Date.now()) / 1000);
      html += `        <DT><A HREF="${b.url}" ADD_DATE="${addDate}"${icon}>${title}</A>\n`;
    }
    html += `    </DL><p>\n</DL><p>\n`;
    return html;
  }

  importBookmarksFromNetscapeHtml(htmlString) {
    if (!htmlString || typeof htmlString !== 'string') return 0;
    const regex = /<A\s+[^>]*HREF=["']([^"']+)["'][^>]*>(.*?)<\/A>/gi;
    let match;
    let count = 0;
    while ((match = regex.exec(htmlString)) !== null) {
      const url = match[1];
      const rawTitle = match[2];
      const title = rawTitle ? rawTitle.replace(/<[^>]+>/g, '').trim() : url;
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        this.addBookmark({ title, url });
        count++;
      }
    }
    return {
      success: true,
      importedCount: count,
      count
    };
  }

  // --- Custom Shield Rules ---
  getCustomShieldRules() {
    return [...(this.cache.customShieldRules || [])];
  }

  saveCustomShieldRules(rules) {
    this.cache.customShieldRules = Array.isArray(rules) ? rules : [];
    this.writeJson(this.files.customShieldRules, this.cache.customShieldRules);
    return this.cache.customShieldRules;
  }

  addCustomShieldRule(rule) {
    if (!rule || !rule.pattern) return null;
    const rules = this.cache.customShieldRules || [];
    const item = {
      id: rule.id || `rule_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      pattern: rule.pattern.trim(),
      action: rule.action || 'block',
      enabled: rule.enabled !== false,
      createdAt: Date.now()
    };
    rules.push(item);
    this.saveCustomShieldRules(rules);
    return item;
  }

  deleteCustomShieldRule(idOrPattern) {
    const rules = this.cache.customShieldRules || [];
    const filtered = rules.filter(r => r.id !== idOrPattern && r.pattern !== idOrPattern);
    this.saveCustomShieldRules(filtered);
    return true;
  }

  // --- Session Crash Backup ---
  getSessionBackup() {
    return this.cache.sessionBackup;
  }

  saveSessionBackup(data) {
    this.cache.sessionBackup = data;
    this.writeJson(this.files.sessionBackup, data);
    return true;
  }

  // --- Shields Cumulative Statistics ---
  getShieldsCumulativeStats() {
    return { ...(this.cache.shieldsStats || {}) };
  }

  saveShieldsCumulativeStats(stats) {
    this.cache.shieldsStats = { ...(this.cache.shieldsStats || {}), ...stats };
    this.writeJson(this.files.shieldsStats, this.cache.shieldsStats);
    return this.cache.shieldsStats;
  }
}

module.exports = new StorageManager();

