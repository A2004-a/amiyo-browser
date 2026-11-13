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
      session: path.join(this.dataDir, 'session.json')
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

    // 2. Electron userData if available and not pointing into asar
    try {
      if (app && typeof app.getPath === 'function') {
        const userData = app.getPath('userData');
        if (userData && typeof userData === 'string' && !userData.includes('app.asar')) {
          return path.join(userData, 'data');
        }
      }
    } catch (e) {
      // outside Electron or app not ready
    }

    // 3. Packaged app or running inside asar: NEVER resolve inside __dirname
    const isPackaged = (app && app.isPackaged) || __dirname.includes('app.asar');
    if (isPackaged) {
      const baseDir = (process.platform === 'win32' && process.env.APPDATA)
        ? path.join(process.env.APPDATA, 'AETHER Browser')
        : path.join(os.homedir(), '.aether-browser');
      return path.join(baseDir, 'data');
    }

    // 4. In development outside asar, use project local data directory
    const devDataDir = path.join(__dirname, '..', 'data');
    if (devDataDir.includes('app.asar')) {
      return path.join(os.homedir(), '.aether-browser', 'data');
    }
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

      if (!fs.existsSync(this.dataDir)) {
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
    return settings;
  }

  saveSettings(newSettings) {
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
}

module.exports = new StorageManager();

