/**
 * AMIYO Shields — Real-time Ad & Tracker Blocker, HTTPS Enforcement, and Privacy Shield.
 * High-performance domain-based request filter inspired by Brave Shields.
 */

const storageManager = require('./storage-manager');

class ShieldsController {
  constructor() {
    this.enabled = true;
    this.stats = {
      totalBlocked: 0,
      adsBlocked: 0,
      trackersBlocked: 0,
      httpsUpgrades: 0
    };

    // Per-tab blocked request counts: tabId -> { ads: number, trackers: number, total: number, blockedUrls: [] }
    this.tabStats = new Map();

    // Whitelist domains where shields are disabled by user: Set of domains
    this.whitelist = new Set();

    // High-performance domain blocklists
    this.adDomains = new Set([
      'doubleclick.net',
      'googlesyndication.com',
      'adservice.google.com',
      'adnxs.com',
      'criteo.com',
      'criteo.net',
      'rubiconproject.com',
      'pubmatic.com',
      'openx.net',
      'casalemedia.com',
      'outbrain.com',
      'taboola.com',
      'adroll.com',
      'advertising.com',
      'serving-sys.com',
      'smartadserver.com',
      'exponential.com',
      'zedo.com',
      'media.net',
      'bidswitch.net',
      'sovrn.com',
      'lijit.com',
      'adtechus.com',
      'contextweb.com',
      'turn.com',
      'invitemedia.com',
      'yieldmo.com',
      'sharethrough.com',
      'applovin.com',
      'unityads.unity3d.com',
      'ironsrc.com',
      'chartboost.com',
      'vungle.com',
      'admob.com',
      'flurry.com',
      'inmobi.com',
      'moatads.com',
      'adsafeprotected.com',
      'iasds.com',
      'scorecardresearch.com',
      'quantserve.com',
      'advertising.amazon.com',
      'aax.amazon-adsystem.com',
      'assoc-amazon.com',
      'adcolony.com',
      'popads.net',
      'propellerads.com',
      'adcash.com',
      'revcontent.com',
      'mgid.com',
      'adblade.com'
    ]);

    this.trackerDomains = new Set([
      'google-analytics.com',
      'googletagmanager.com',
      'analytics.google.com',
      'hotjar.com',
      'mouseflow.com',
      'crazyegg.com',
      'mixpanel.com',
      'segment.com',
      'segment.io',
      'amplitude.com',
      'optimizely.com',
      'fullstory.com',
      'logrocket.com',
      'heapanalytics.com',
      'kissmetrics.com',
      'statcounter.com',
      'chartbeat.com',
      'newrelic.com',
      'nr-data.net',
      'branch.io',
      'appsflyer.com',
      'adjust.com',
      'kochava.com',
      'clarity.ms',
      'bing.com/clarity',
      'yandex.ru/metrika',
      'mc.yandex.ru',
      'facebook.com/tr',
      'connect.facebook.net/en_US/fbevents.js',
      'pixel.wp.com',
      'stats.wp.com',
      'analytics.twitter.com',
      't.co/i/adsct',
      'ads-twitter.com',
      'analytics.tiktok.com',
      'tr.snapchat.com',
      'sc-static.net/scevent.min.js',
      'licdn.com/tag',
      'px.ads.linkedin.com',
      'redditstatic.com/ads/pixel.js',
      'alb.reddit.com/rp.gif',
      'quora.com/_/ad',
      'pinterest.com/ct.html'
    ]);

    // Fast keyword patterns for script/pixel blockers
    this.blockPatterns = [
      /\/ads?[\.\/_\-]/i,
      /\/analytics[\.\/_\-]/i,
      /\/telemetry[\.\/_\-]/i,
      /\/tracking[\.\/_\-]/i,
      /\/tracker[\.\/_\-]/i,
      /\/pageview[\.\/_\-]/i,
      /\/pixel[\.\/_\-]/i,
      /\/beacon[\.\/_\-]/i,
      /\/advert[\.\/_\-]/i,
      /\/banner[\.\/_\-]/i,
      /\/popunder/i,
      /\/popup[\.\/_\-]ad/i
    ];
  }

  init(settings = {}) {
    if (settings.shieldsEnabled !== undefined) {
      this.enabled = !!settings.shieldsEnabled;
    }
  }

  isDomainBlocked(hostname) {
    if (!hostname) return { blocked: false };
    const lowerHost = hostname.toLowerCase();

    // Check exact matches
    if (this.adDomains.has(lowerHost)) return { blocked: true, type: 'ad' };
    if (this.trackerDomains.has(lowerHost)) return { blocked: true, type: 'tracker' };

    // Check parent domains (e.g. ad1.doubleclick.net -> doubleclick.net)
    const parts = lowerHost.split('.');
    for (let i = 1; i < parts.length - 1; i++) {
      const parentDomain = parts.slice(i).join('.');
      if (this.adDomains.has(parentDomain)) return { blocked: true, type: 'ad' };
      if (this.trackerDomains.has(parentDomain)) return { blocked: true, type: 'tracker' };
    }

    return { blocked: false };
  }

  isUrlBlocked(url) {
    try {
      const parsed = new URL(url);
      const hostCheck = this.isDomainBlocked(parsed.hostname);
      if (hostCheck.blocked) return hostCheck;

      // Check path patterns for tracking pixels/scripts
      const fullPath = parsed.pathname + parsed.search;
      for (const pattern of this.blockPatterns) {
        if (pattern.test(fullPath)) {
          return { blocked: true, type: 'tracker' };
        }
      }

      return { blocked: false };
    } catch (e) {
      return { blocked: false };
    }
  }

  shouldBlock(requestUrl, tabId = null, topOrigin = null) {
    if (!this.enabled) return false;

    // Check whitelist
    if (topOrigin) {
      try {
        const topHost = new URL(topOrigin).hostname;
        if (this.whitelist.has(topHost)) return false;
      } catch (e) {}
    }

    const result = this.isUrlBlocked(requestUrl);
    if (result.blocked) {
      this.stats.totalBlocked++;
      if (result.type === 'ad') this.stats.adsBlocked++;
      else this.stats.trackersBlocked++;

      if (tabId) {
        let tStats = this.tabStats.get(tabId);
        if (!tStats) {
          tStats = { ads: 0, trackers: 0, total: 0, blockedUrls: [] };
          this.tabStats.set(tabId, tStats);
        }
        tStats.total++;
        if (result.type === 'ad') tStats.ads++;
        else tStats.trackers++;
        if (tStats.blockedUrls.length < 50) {
          tStats.blockedUrls.push({ url: requestUrl, type: result.type, time: Date.now() });
        }
      }
      return true;
    }

    return false;
  }

  getTabStats(tabId) {
    return this.tabStats.get(tabId) || { ads: 0, trackers: 0, total: 0, blockedUrls: [] };
  }

  clearTabStats(tabId) {
    this.tabStats.delete(tabId);
  }

  getStats() {
    return {
      enabled: this.enabled,
      ...this.stats,
      whitelistedCount: this.whitelist.size
    };
  }

  toggle(enabled) {
    this.enabled = typeof enabled === 'boolean' ? enabled : !this.enabled;
    storageManager.saveSettings({ shieldsEnabled: this.enabled });
    return this.enabled;
  }

  toggleSiteWhitelist(domain, allow) {
    if (!domain) return;
    const cleanDomain = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    if (allow) {
      this.whitelist.add(cleanDomain);
    } else {
      this.whitelist.delete(cleanDomain);
    }
    return this.whitelist.has(cleanDomain);
  }

  isSiteWhitelisted(domain) {
    if (!domain) return false;
    const cleanDomain = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    return this.whitelist.has(cleanDomain);
  }

  attachToSession(sessionInstance) {
    if (!sessionInstance || !sessionInstance.webRequest) return;

    // 1. Block ad & tracking requests + HTTPS Upgrades
    sessionInstance.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (details, callback) => {
      const url = details.url;

      // HTTPS Upgrade (Rewrite insecure HTTP to HTTPS where appropriate, except for localhost/private IPs)
      if (url.startsWith('http://') && this.enabled) {
        try {
          const parsed = new URL(url);
          const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || /^192\.168\./.test(parsed.hostname) || /^10\./.test(parsed.hostname);
          if (!isLocal) {
            this.stats.httpsUpgrades++;
            const upgradedUrl = url.replace(/^http:\/\//i, 'https://');
            return callback({ redirectURL: upgradedUrl });
          }
        } catch (e) {}
      }

      // Check Shield filter
      const tabId = details.webContentsId ? `wc_${details.webContentsId}` : null;
      const isBlocked = this.shouldBlock(url, tabId, details.referrer);

      if (isBlocked) {
        return callback({ cancel: true });
      }

      callback({ cancel: false });
    });

    // 2. Anti-Fingerprinting & Privacy Header Injection
    sessionInstance.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = { ...details.requestHeaders };

      if (this.enabled) {
        // Enforce Global Privacy Control (GPC) and Do Not Track (DNT)
        headers['Sec-GPC'] = '1';
        headers['DNT'] = '1';

        // Strip invasive Google-specific tracking headers
        delete headers['X-Client-Data'];
        delete headers['X-Chrome-UMA-Enabled'];
      }

      callback({ requestHeaders: headers });
    });
  }
}

module.exports = new ShieldsController();
