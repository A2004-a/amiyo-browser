const storageManager = require('./storage-manager');

class NavigationController {
  constructor() {
    this.searchEngines = {
      google: 'https://www.google.com/search?q=%s',
      bing: 'https://www.bing.com/search?q=%s',
      duckduckgo: 'https://duckduckgo.com/?q=%s',
      yahoo: 'https://search.yahoo.com/search?p=%s',
      ecosia: 'https://www.ecosia.org/search?q=%s',
      yandex: 'https://yandex.com/search/?text=%s'
    };
  }

  isInternalUrl(url) {
    if (!url) return false;
    return url.startsWith('amiyo://') || url.startsWith('aether://');
  }

  resolveUrl(input, customSearchEngine) {
    if (!input || typeof input !== 'string') {
      return 'aether://newtab';
    }

    const trimmed = input.trim();
    if (!trimmed) {
      return 'aether://newtab';
    }

    // Check for internal protocols
    if (trimmed.startsWith('amiyo://') || trimmed.startsWith('aether://')) {
      return trimmed;
    }

    // Check for bang shortcuts
    if (trimmed.startsWith('!g ')) return this.buildSearchUrl(trimmed.slice(3).trim(), 'google');
    if (trimmed.startsWith('!d ') || trimmed.startsWith('!ddg ')) return this.buildSearchUrl(trimmed.replace(/^!(d|ddg)\s+/, '').trim(), 'duckduckgo');
    if (trimmed.startsWith('!b ')) return this.buildSearchUrl(trimmed.slice(3).trim(), 'bing');
    if (trimmed.startsWith('!y ')) return `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed.slice(3).trim())}`;
    if (trimmed.startsWith('!w ')) return `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(trimmed.slice(3).trim())}`;
    if (trimmed.startsWith('!e ')) return this.buildSearchUrl(trimmed.slice(3).trim(), 'ecosia');

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
    const engine = (customEngine || settings.searchEngine || 'google').toLowerCase();

    let template = this.searchEngines[engine];
    if (engine === 'custom' && settings.customSearchUrl) {
      template = settings.customSearchUrl;
    }
    if (!template) {
      template = this.searchEngines.google;
    }

    return template.split('%s').join(encodeURIComponent(query));
  }

  getSecurityStatus(url) {
    if (!url) return { isSecure: false, type: 'unknown', text: 'Not secure' };
    if (url.startsWith('amiyo://') || url.startsWith('aether://')) {
      return { isSecure: true, type: 'internal', text: 'AETHER Internal' };
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
      { title: 'New Tab', url: 'aether://newtab' },
      { title: 'History', url: 'aether://history' },
      { title: 'Bookmarks', url: 'aether://bookmarks' },
      { title: 'Downloads', url: 'aether://downloads' },
      { title: 'Settings', url: 'aether://settings' }
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
    const settings = storageManager.getSettings();
    const currentEngine = (settings.searchEngine || 'google').toLowerCase();
    const searchUrl = this.buildSearchUrl(q, currentEngine);
    const engineNames = {
      google: 'Google',
      duckduckgo: 'DuckDuckGo',
      bing: 'Bing',
      yahoo: 'Yahoo',
      ecosia: 'Ecosia',
      yandex: 'Yandex'
    };
    const engineName = engineNames[currentEngine] || 'Web';
    suggestions.unshift({
      type: 'search',
      title: `Search ${engineName} for "${query}"`,
      url: searchUrl,
      query: query,
      engine: currentEngine
    });

    return suggestions.slice(0, 8);
  }

  fetchSearchSuggestions(query, engine = 'google') {
    return new Promise((resolve) => {
      const https = require('https');
      const normalizedEngine = (engine || 'google').toLowerCase();
      let url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`;

      if (normalizedEngine === 'duckduckgo') {
        url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`;
      } else if (normalizedEngine === 'bing') {
        url = `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(query)}`;
      } else if (normalizedEngine === 'yahoo') {
        url = `https://search.yahoo.com/sugg/gossip/gossip-us-ura/?output=sd1&command=${encodeURIComponent(query)}`;
      } else if (normalizedEngine === 'ecosia') {
        url = `https://ac.ecosia.org/autocomplete?q=${encodeURIComponent(query)}&type=list`;
      }

      const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, timeout: 800 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
              if (Array.isArray(parsed[1])) {
                return resolve(parsed[1].map(x => typeof x === 'string' ? x : x.phrase || x.suggestion || '').filter(Boolean));
              }
              // DuckDuckGo array of objects fallback
              if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0].phrase) {
                return resolve(parsed.map(p => p.phrase).filter(Boolean));
              }
            } else if (parsed && Array.isArray(parsed.r)) {
              // Yahoo format
              return resolve(parsed.r.map(item => item.k).filter(Boolean));
            }
          } catch (e) {}
          resolve([]);
        });
      });
      req.on('error', () => resolve([]));
      req.on('timeout', () => {
        req.destroy();
        resolve([]);
      });
    });
  }

  async getSuggestionsAsync(query) {
    const local = this.getOmniboxSuggestions(query);
    if (!query || typeof query !== 'string') return local;
    const q = query.trim();
    if (!q || q.startsWith('http://') || q.startsWith('https://') || q.startsWith('amiyo://') || q.startsWith('aether://')) {
      return local;
    }

    try {
      const settings = storageManager.getSettings();
      const engine = (settings.searchEngine || 'google').toLowerCase();
      const onlineQueries = await this.fetchSearchSuggestions(q, engine);
      if (onlineQueries && onlineQueries.length > 0) {
        const enriched = [local[0]]; // Primary search query with active engine
        for (const oQuery of onlineQueries) {
          if (oQuery && oQuery.toLowerCase() !== q.toLowerCase()) {
            enriched.push({
              type: 'search',
              title: oQuery,
              url: this.buildSearchUrl(oQuery, engine),
              query: oQuery,
              engine: engine
            });
            if (enriched.length >= 6) break;
          }
        }
        // Append history/bookmarks
        for (let i = 1; i < local.length; i++) {
          if (enriched.length >= 8) break;
          enriched.push(local[i]);
        }
        return enriched;
      }
    } catch (e) {}

    return local;
  }
}

module.exports = new NavigationController();

