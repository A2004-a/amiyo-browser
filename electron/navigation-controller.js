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
    // Fast in-memory LRU suggestion cache (5-minute TTL)
    this.suggestionCache = new Map();
  }

  isInternalUrl(url) {
    if (!url) return false;
    return url.startsWith('amiyo://') || url.startsWith('aether://');
  }

  isDirectUrl(input) {
    if (!input || typeof input !== 'string') return false;
    const trimmed = input.trim();
    if (!trimmed || trimmed.includes(' ')) return false;

    // Has scheme: http://, https://, file://, ftp://, aether://, amiyo://
    if (/^[a-zA-Z]+:\/\//i.test(trimmed)) return true;

    // Localhost or IPv4 loopback / LAN
    if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed) || /^127\.0\.0\.1(:\d+)?(\/.*)?$/.test(trimmed) || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/.*)?$/.test(trimmed)) return true;

    // Starts with www.
    if (/^www\./i.test(trimmed)) return true;

    // Domain structure with valid dot: e.g. scholarship.up.gov.in, domain.com, sub.domain.co.uk/path
    const hostPart = trimmed.split('/')[0].split('?')[0].split(':')[0];
    if (hostPart.includes('.') && !hostPart.startsWith('.') && !hostPart.endsWith('.')) {
      const parts = hostPart.split('.');
      const tld = parts[parts.length - 1];
      if (tld.length >= 2 && /^[a-zA-Z0-9]+$/.test(tld)) {
        return true;
      }
    }

    return false;
  }

  resolveBang(input) {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();
    const bangMatch = trimmed.match(/^!([a-zA-Z0-9]+)\s+(.+)$/);
    if (!bangMatch) return null;

    const bang = bangMatch[1].toLowerCase();
    const q = bangMatch[2].trim();
    const encQ = encodeURIComponent(q);

    const bangMap = {
      g: () => this.buildSearchUrl(q, 'google'),
      d: () => this.buildSearchUrl(q, 'duckduckgo'),
      ddg: () => this.buildSearchUrl(q, 'duckduckgo'),
      b: () => this.buildSearchUrl(q, 'bing'),
      e: () => this.buildSearchUrl(q, 'ecosia'),
      y: () => `https://www.youtube.com/results?search_query=${encQ}`,
      yt: () => `https://www.youtube.com/results?search_query=${encQ}`,
      w: () => `https://en.wikipedia.org/wiki/Special:Search?search=${encQ}`,
      wiki: () => `https://en.wikipedia.org/wiki/Special:Search?search=${encQ}`,
      gh: () => `https://github.com/search?q=${encQ}`,
      r: () => `https://www.reddit.com/search/?q=${encQ}`,
      so: () => `https://stackoverflow.com/search?q=${encQ}`,
      a: () => `https://www.amazon.com/s?k=${encQ}`,
      m: () => `https://www.google.com/maps/search/${encQ}`,
      maps: () => `https://www.google.com/maps/search/${encQ}`,
      t: () => `https://twitter.com/search?q=${encQ}`,
      npm: () => `https://www.npmjs.com/search?q=${encQ}`,
      mdn: () => `https://developer.mozilla.org/en-US/search?q=${encQ}`
    };

    if (bangMap[bang]) {
      return bangMap[bang]();
    }
    return null;
  }

  resolveCustomEngine(input, customEnginesList = null) {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();
    try {
      const customEngines = customEnginesList || (storageManager.getCustomSearchEngines ? storageManager.getCustomSearchEngines() : []);
      const spaceIdx = trimmed.indexOf(' ');
      if (spaceIdx > 0) {
        const potentialKw = trimmed.substring(0, spaceIdx).toLowerCase();
        const customQ = trimmed.substring(spaceIdx + 1).trim();
        const matched = customEngines.find(e => e.keyword.toLowerCase() === potentialKw);
        if (matched && matched.searchUrl) {
          return matched.searchUrl.split('%s').join(encodeURIComponent(customQ));
        }
      }
    } catch (e) {}
    return null;
  }

  formatUrl(input, customSearchEngine) {
    return this.resolveUrl(input, customSearchEngine);
  }

  resolveUrl(input, customSearchEngine) {
    if (!input || typeof input !== 'string') {
      return 'aether://newtab';
    }

    const trimmed = input.trim();
    if (!trimmed) {
      return 'aether://newtab';
    }

    // Check if the URL is a search engine wrapper around a direct URL (e.g. https://duckduckgo.com/?q=https%3A%2F%2Fscholarship.up.gov.in%2F)
    if (trimmed.includes('search?q=') || trimmed.includes('duckduckgo.com/?q=') || trimmed.includes('search?p=')) {
      try {
        const u = new URL(trimmed);
        const qParam = u.searchParams.get('q') || u.searchParams.get('p') || u.searchParams.get('text');
        if (qParam && this.isDirectUrl(qParam)) {
          return this.resolveUrl(qParam);
        }
      } catch (e) { }
    }

    // Check for view-source: prefix (Chrome standard)
    if (trimmed.toLowerCase().startsWith('view-source:')) {
      const targetUrl = trimmed.substring('view-source:'.length).trim();
      return `aether://source?url=${encodeURIComponent(targetUrl)}`;
    }

    // Check for internal protocols
    if (trimmed.startsWith('amiyo://') || trimmed.startsWith('aether://')) {
      return trimmed;
    }

    // Brave-style IPFS & IPNS Decentralized Web Gateways
    if (trimmed.startsWith('ipfs://')) {
      const cid = trimmed.substring('ipfs://'.length).replace(/^\/+/, '');
      return `https://dweb.link/ipfs/${cid}`;
    }
    if (trimmed.startsWith('ipns://')) {
      const name = trimmed.substring('ipns://'.length).replace(/^\/+/, '');
      return `https://dweb.link/ipns/${name}`;
    }

    // Check for DuckDuckGo & Chrome Search Bangs
    const bangResolved = this.resolveBang(trimmed);
    if (bangResolved) {
      return bangResolved;
    }

    // Check for user-defined Custom Search Engines (keyword + space + query)
    const customResolved = this.resolveCustomEngine(trimmed);
    if (customResolved) {
      return customResolved;
    }

    // Check for standard protocols
    if (/^[a-zA-Z]+:\/\//.test(trimmed)) {
      return trimmed;
    }

    // Check for localhost or IP
    if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed) || /^127\.0\.0\.1(:\d+)?(\/.*)?$/.test(trimmed) || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/.*)?$/.test(trimmed)) {
      return `http://${trimmed}`;
    }

    // Check if starts with www.
    if (/^www\./i.test(trimmed)) {
      return `https://${trimmed}`;
    }

    // Check if looks like a valid domain or IP
    // e.g. scholarship.up.gov.in, domain.com, sub.domain.co.uk/path, 192.168.1.1:8080
    if (!trimmed.includes(' ') && this.isDirectUrl(trimmed)) {
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

  getCleanUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
    try {
      const u = new URL(rawUrl);
      const trackers = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
        'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid', 'twclid', 'yclid', 'zanpid',
        'mc_eid', 'igshid', '_hsenc', '_hsmi', 'wickedid', 'rb_clickid', 's_kwcid',
        '_ga', '_gl', 'ref_src', 'ref_url', 'mkt_tok', 'trk', 'tracking_id', 'gdfms', 'gdftrk', 'gdffi'
      ];
      trackers.forEach(param => u.searchParams.delete(param));
      return u.toString();
    } catch (e) {
      return rawUrl;
    }
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

  getOmniboxSuggestions(query, isPrivate = false) {
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

    // 3. Check History (suppressed in private windows to protect privacy)
    if (!isPrivate) {
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
    }

    // 4. Add Search Query or Direct Navigate item
    if (this.isDirectUrl(query)) {
      const directUrl = this.resolveUrl(query);
      suggestions.unshift({
        type: 'navigate',
        title: `🌐 Open ${query} directly`,
        url: directUrl,
        query: query,
        isDirect: true
      });
    } else {
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
    }

    return suggestions.slice(0, 8);
  }

  fetchSearchSuggestions(query, engine = 'google') {
    const normalizedEngine = (engine || 'google').toLowerCase();
    const cacheKey = `${normalizedEngine}:${query.toLowerCase()}`;
    const cached = this.suggestionCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 300000)) { // 5-minute TTL
      return Promise.resolve(cached.results);
    }

    return new Promise((resolve) => {
      const https = require('https');
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

      const saveAndResolve = (results) => {
        if (this.suggestionCache.size > 500) {
          const firstKey = this.suggestionCache.keys().next().value;
          this.suggestionCache.delete(firstKey);
        }
        this.suggestionCache.set(cacheKey, { timestamp: Date.now(), results });
        resolve(results);
      };

      const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, timeout: 600 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
              if (Array.isArray(parsed[1])) {
                return saveAndResolve(parsed[1].map(x => typeof x === 'string' ? x : x.phrase || x.suggestion || '').filter(Boolean));
              }
              // DuckDuckGo array of objects fallback
              if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0].phrase) {
                return saveAndResolve(parsed.map(p => p.phrase).filter(Boolean));
              }
            } else if (parsed && Array.isArray(parsed.r)) {
              // Yahoo format
              return saveAndResolve(parsed.r.map(item => item.k).filter(Boolean));
            }
          } catch (e) { }
          saveAndResolve([]);
        });
      });
      req.on('error', () => resolve([]));
      req.on('timeout', () => {
        req.destroy();
        resolve([]);
      });
    });
  }

  async getSuggestionsAsync(query, isPrivate = false) {
    const local = this.getOmniboxSuggestions(query, isPrivate);
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

