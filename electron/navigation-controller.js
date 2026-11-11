const storageManager = require('./storage-manager');

class NavigationController {
  constructor() {
    this.searchEngines = {
      google: 'https://www.google.com/search?q=%s',
      bing: 'https://www.bing.com/search?q=%s',
      duckduckgo: 'https://duckduckgo.com/?q=%s'
    };
  }

  isInternalUrl(url) {
    if (!url) return false;
    return url.startsWith('amiyo://');
  }

  resolveUrl(input, customSearchEngine) {
    if (!input || typeof input !== 'string') {
      return 'amiyo://newtab';
    }

    const trimmed = input.trim();
    if (!trimmed) {
      return 'amiyo://newtab';
    }

    // Check for internal protocols
    if (trimmed.startsWith('amiyo://')) {
      return trimmed;
    }

    // Check for standard protocols
    if (/^[a-zA-Z]+:\/\//.test(trimmed)) {
      return trimmed;
    }

    // Check for localhost or IP
    if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed) || /^127\.0\.0\.1(:\d+)?(\/.*)?$/.test(trimmed)) {
      return `http://${trimmed}`;
    }

    // Check if looks like a valid domain or IP
    // e.g. domain.com, sub.domain.co.uk/path, 192.168.1.1:8080
    const domainRegex = /^[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+(:\d+)?(\/.*)?$/;
    if (!trimmed.includes(' ') && domainRegex.test(trimmed)) {
      return `https://${trimmed}`;
    }

    // Otherwise treat as search query
    return this.buildSearchUrl(trimmed, customSearchEngine);
  }

  buildSearchUrl(query, customEngine) {
    const settings = storageManager.getSettings();
    const engine = customEngine || settings.searchEngine || 'google';

    let template = this.searchEngines[engine];
    if (engine === 'custom' && settings.customSearchUrl) {
      template = settings.customSearchUrl;
    }
    if (!template) {
      template = this.searchEngines.google;
    }

    return template.replace('%s', encodeURIComponent(query));
  }

  getSecurityStatus(url) {
    if (!url) return { isSecure: false, type: 'unknown', text: 'Not secure' };
    if (url.startsWith('amiyo://')) {
      return { isSecure: true, type: 'internal', text: 'AMIYO Internal' };
    }
    if (url.startsWith('https://')) {
      return { isSecure: true, type: 'secure', text: 'Secure Connection' };
    }
    if (url.startsWith('http://')) {
      return { isSecure: false, type: 'insecure', text: 'Connection is not secure' };
    }
    if (url.startsWith('file://')) {
      return { isSecure: true, type: 'file', text: 'Local File' };
    }
    return { isSecure: false, type: 'unknown', text: 'Unknown' };
  }

  getOmniboxSuggestions(query) {
    if (!query || typeof query !== 'string') return [];
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const suggestions = [];
    const addedUrls = new Set();

    // 1. Check internal pages
    const internalPages = [
      { title: 'New Tab', url: 'amiyo://newtab' },
      { title: 'History', url: 'amiyo://history' },
      { title: 'Bookmarks', url: 'amiyo://bookmarks' },
      { title: 'Downloads', url: 'amiyo://downloads' },
      { title: 'Settings', url: 'amiyo://settings' }
    ];
    for (const page of internalPages) {
      if (page.title.toLowerCase().includes(q) || page.url.toLowerCase().includes(q)) {
        suggestions.push({
          type: 'internal',
          title: page.title,
          url: page.url,
          favicon: ''
        });
        addedUrls.add(page.url);
      }
    }

    // 2. Check Bookmarks
    const bookmarks = storageManager.getBookmarks();
    for (const bm of bookmarks) {
      if ((bm.title && bm.title.toLowerCase().includes(q)) || (bm.url && bm.url.toLowerCase().includes(q))) {
        if (!addedUrls.has(bm.url)) {
          suggestions.push({
            type: 'bookmark',
            title: bm.title,
            url: bm.url,
            favicon: bm.favicon
          });
          addedUrls.add(bm.url);
          if (suggestions.length >= 6) break;
        }
      }
    }

    // 3. Check History
    const history = storageManager.getHistory();
    for (const h of history) {
      if ((h.title && h.title.toLowerCase().includes(q)) || (h.url && h.url.toLowerCase().includes(q))) {
        if (!addedUrls.has(h.url)) {
          suggestions.push({
            type: 'history',
            title: h.title,
            url: h.url,
            favicon: h.favicon
          });
          addedUrls.add(h.url);
          if (suggestions.length >= 10) break;
        }
      }
    }

    // 4. Add Search Query item
    const searchUrl = this.buildSearchUrl(q);
    suggestions.unshift({
      type: 'search',
      title: `Search for "${query}"`,
      url: searchUrl,
      query: query
    });

    return suggestions.slice(0, 8);
  }
}

module.exports = new NavigationController();

