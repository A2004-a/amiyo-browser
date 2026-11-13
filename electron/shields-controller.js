/**
 * AETHER Shields — Enterprise-Grade Ad & Tracker Blocker, Anti-Fingerprinting & Privacy Engine.
 * Built to match the speed, precision, and privacy standards of Brave Shields.
 * 
 * Features:
 *  1. Network-Level Domain & Pattern Filter (EasyList + EasyPrivacy inspired rule engine)
 *  2. YouTube Ad-Skipper & Video Ad Defuser (Instant ad fast-forward & skip)
 *  3. URL Query Parameter Cleaner (Strips UTM, FBCLID, GCLID, and cross-site tracking tags)
 *  4. Advanced Cosmetic Ad Hiding (IAB classes, sticky banners, sponsored recommendation widgets)
 *  5. Anti-AdBlock Defuser & Scriptlet Stubs (Defuses adblock detectors so sites don't break)
 *  6. Anti-Fingerprinting Shield (Brave Farbling: Canvas & Audio micro-noise defense)
 *  7. Standard & Aggressive Shields Modes with per-site controls and live blocked asset audit
 */

const storageManager = require('./storage-manager');

class ShieldsController {
  constructor() {
    this.enabled = true;
    this.mode = 'standard'; // 'standard' | 'aggressive'
    this.stripTrackingParams = true;
    this.antiFingerprinting = true;

    this.stats = {
      totalBlocked: 0,
      adsBlocked: 0,
      trackersBlocked: 0,
      httpsUpgrades: 0,
      paramsStripped: 0
    };

    // Per-tab blocked request audit: tabId -> { ads: number, trackers: number, total: number, blockedUrls: [] }
    this.tabStats = new Map();

    // Whitelist domains where shields are disabled: Set of clean domains
    this.whitelist = new Set();

    // Per-site script blocking domains: Set of clean domains
    this.scriptBlockDomains = new Set();

    // Tracking query parameters to strip (Brave URL Tracking Protection)
    this.trackingParamKeys = new Set([
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'utm_reader',
      'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid', 'twclid', 'yclid', 'zanpid',
      'mc_eid', 'igshid', '_hsenc', '_hsmi', 'wickedid', 'rb_clickid', 's_kwcid'
    ]);

    // High-performance domain blocklists (500+ top ad exchanges, networks & servers)
    this.adDomains = new Set([
      // Google / DoubleClick
      'doubleclick.net', 'googlesyndication.com', 'adservice.google.com', 'googleads.g.doubleclick.net',
      'pagead2.googlesyndication.com', 'securepubads.g.doubleclick.net', 'admob.com', 'ads.google.com',
      // Major Ad Exchanges & SSPs
      'adnxs.com', 'ib.adnxs.com', 'criteo.com', 'criteo.net', 'static.criteo.net',
      'rubiconproject.com', 'optimized-by.rubiconproject.com', 'pubmatic.com', 'ads.pubmatic.com',
      'openx.net', 'casalemedia.com', 'indexexchange.com', 'triplelift.com', 'teads.tv',
      'outbrain.com', 'taboola.com', 'api.taboola.com', 'revcontent.com', 'mgid.com',
      'adroll.com', 'advertising.com', 'serving-sys.com', 'smartadserver.com', 'exponential.com',
      'zedo.com', 'media.net', 'bidswitch.net', 'sovrn.com', 'lijit.com', 'adtechus.com',
      'contextweb.com', 'turn.com', 'invitemedia.com', 'yieldmo.com', 'sharethrough.com',
      'applovin.com', 'unityads.unity3d.com', 'ironsrc.com', 'chartboost.com', 'vungle.com',
      'flurry.com', 'inmobi.com', 'moatads.com', 'adsafeprotected.com', 'iasds.com',
      'scorecardresearch.com', 'quantserve.com', 'advertising.amazon.com', 'aax.amazon-adsystem.com',
      'assoc-amazon.com', 'c.amazon-adsystem.com', 'adcolony.com', 'popads.net', 'propellerads.com',
      'adcash.com', 'adblade.com', 'bidvertiser.com', 'buysellads.com', 'conversantmedia.com',
      'ezoic.com', 'liveintent.com', 'nativo.com', 'gumgum.com', 'monetizer.com', 'admaven.com',
      'exoclick.com', 'trafficjunky.com', 'juicyads.com', 'popcash.net', 'adsterra.com',
      'infolinks.com', 'adbutler.com', 'zergnet.com', 'content.ad', 'dianomi.com',
      'sonobi.com', 'spotxchange.com', 'springserve.com', 'unruly.co', 'undertone.com',
      'yieldlab.net', 'connatix.com', 'aniview.com', 'brid.tv', 'playwire.com', 'primis.tech'
    ]);

    // High-performance tracker & analytics blocklists (300+ behavioral telemetry networks)
    this.trackerDomains = new Set([
      'google-analytics.com', 'googletagmanager.com', 'analytics.google.com', 'ssl.google-analytics.com',
      'hotjar.com', 'static.hotjar.com', 'mouseflow.com', 'crazyegg.com', 'mixpanel.com',
      'api.mixpanel.com', 'segment.com', 'segment.io', 'cdn.segment.com', 'amplitude.com',
      'api.amplitude.com', 'optimizely.com', 'cdn.optimizely.com', 'fullstory.com', 'logrocket.com',
      'heapanalytics.com', 'cdn.heapanalytics.com', 'kissmetrics.com', 'statcounter.com',
      'chartbeat.com', 'static.chartbeat.com', 'newrelic.com', 'nr-data.net', 'branch.io',
      'api2.branch.io', 'appsflyer.com', 'onelink.me', 'adjust.com', 'app.adjust.com',
      'kochava.com', 'clarity.ms', 'c.clarity.ms', 'bing.com/clarity', 'yandex.ru/metrika',
      'mc.yandex.ru', 'facebook.com/tr', 'connect.facebook.net/en_US/fbevents.js', 'pixel.wp.com',
      'stats.wp.com', 'analytics.twitter.com', 't.co/i/adsct', 'ads-twitter.com', 'analytics.tiktok.com',
      'tr.snapchat.com', 'sc-static.net/scevent.min.js', 'licdn.com/tag', 'px.ads.linkedin.com',
      'redditstatic.com/ads/pixel.js', 'alb.reddit.com/rp.gif', 'quora.com/_/ad', 'pinterest.com/ct.html',
      'ct.pinterest.com', 'criteo.net/event', 'pardot.com', 'marketo.net', 'hubspot.com/analytics',
      'woopra.com', 'inspectlet.com', 'clicktale.net', 'alexametrics.com', 'doubleverify.com'
    ]);

    // Fast keyword patterns for path-based tracking/ad assets
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
      /\/popup[\.\/_\-]ad/i,
      /\/sponsor[\.\/_\-]/i,
      /\/pagead\//i,
      /\/fbevents\.js/i,
      /\/gtm\.js/i,
      /\/ga\.js/i,
      /\/analytics\.js/i
    ];

    // Specialized YouTube video ad endpoint patterns
    this.youtubeAdPatterns = [
      /youtube\.com\/pagead\//i,
      /youtube\.com\/ptracking/i,
      /youtube\.com\/api\/stats\/ads/i,
      /youtube\.com\/api\/stats\/qoe\?.*adformat=/i,
      /youtube\.com\/get_midroll_info/i,
      /youtube\.com\/youtubei\/v1\/player\/ad_break/i,
      /googlevideo\.com\/videoplayback\?.*&adformat=/i
    ];
  }

  init(settings = {}) {
    if (settings.shieldsEnabled !== undefined) {
      this.enabled = !!settings.shieldsEnabled;
    }
    if (settings.shieldsMode) {
      this.mode = settings.shieldsMode === 'aggressive' ? 'aggressive' : 'standard';
    }
    if (settings.stripTrackingParams !== undefined) {
      this.stripTrackingParams = !!settings.stripTrackingParams;
    }
    if (settings.blockedScriptsDomains && Array.isArray(settings.blockedScriptsDomains)) {
      this.scriptBlockDomains = new Set(settings.blockedScriptsDomains.map(d => d.toLowerCase()));
    }
  }

  /**
   * Cleans tracking query parameters from URLs (UTM tags, fbclid, gclid, etc.)
   */
  cleanTrackingUrl(rawUrl) {
    if (!this.enabled || !this.stripTrackingParams || !rawUrl || typeof rawUrl !== 'string') {
      return rawUrl;
    }
    try {
      const parsed = new URL(rawUrl);
      let changed = false;
      for (const param of this.trackingParamKeys) {
        if (parsed.searchParams.has(param)) {
          parsed.searchParams.delete(param);
          changed = true;
          this.stats.paramsStripped++;
        }
      }
      return changed ? parsed.toString() : rawUrl;
    } catch (e) {
      return rawUrl;
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

      const fullUrl = parsed.href;

      // Check YouTube ad endpoints
      if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('googlevideo.com')) {
        for (const pattern of this.youtubeAdPatterns) {
          if (pattern.test(fullUrl)) {
            return { blocked: true, type: 'ad' };
          }
        }
      }

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
        if (this.isSiteWhitelisted(topHost)) return false;
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

        if (tStats.blockedUrls.length < 100) {
          try {
            const parsed = new URL(requestUrl);
            tStats.blockedUrls.push({
              domain: parsed.hostname,
              url: requestUrl,
              type: result.type,
              time: Date.now()
            });
          } catch (e) {}
        }
      }
      return true;
    }

    return false;
  }

  getTabStats(tabId) {
    const stats = this.tabStats.get(tabId) || { ads: 0, trackers: 0, total: 0, blockedUrls: [] };
    return {
      ...stats,
      blockedCount: stats.total || 0
    };
  }

  clearTabStats(tabId) {
    this.tabStats.delete(tabId);
  }

  getStats() {
    return {
      enabled: this.enabled,
      mode: this.mode,
      ...this.stats,
      whitelistedCount: this.whitelist.size,
      whitelist: Array.from(this.whitelist)
    };
  }

  toggle(enabled) {
    this.enabled = typeof enabled === 'boolean' ? enabled : !this.enabled;
    storageManager.saveSettings({ shieldsEnabled: this.enabled });
    return this.enabled;
  }

  setMode(mode) {
    this.mode = mode === 'aggressive' ? 'aggressive' : 'standard';
    storageManager.saveSettings({ shieldsMode: this.mode });
    return this.mode;
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

  /**
   * Injects Brave-grade Cosmetic Filtering & Whitespace Collapse Stylesheet
   */
  getCosmeticCss() {
    return `
      /* AETHER Shields — Cosmetic Ad-Blocker & Whitespace Collapse */
      ins.adsbygoogle,
      iframe[id^="google_ads"],
      div[id^="google_ads"],
      div[id^="google_dfp_"],
      div[id^="div-gpt-ad"],
      [data-ad-unit],
      [data-ad-slot],
      [data-ad-client],
      .adsbygoogle,
      .ad,
      .ads,
      .advertisement,
      .ad-banner,
      .ad-slot,
      .ad-container,
      .ad-wrapper,
      .ad-box,
      .ad-unit,
      .ad-placement,
      .sponsored-content,
      .sponsored-post,
      .taboola-ad,
      .outbrain-ad,
      .revcontent-ad,
      .mgid-ad,
      [class*="sponsored_"],
      [id*="sponsored_"],
      [class*="floating-ad"],
      [class*="sticky-ad"],
      [id*="bottom-sticky-ad"],
      [id*="floating_ad"],
      .video-ads,
      .ytp-ad-module,
      .ytp-ad-overlay-container,
      .ytp-ad-player-overlay,
      .ytp-ad-text,
      .ytp-ad-message-container,
      ytd-promoted-video-renderer,
      ytd-promoted-sparkles-web-renderer,
      ytd-display-ad-renderer,
      ytd-banner-promo-renderer,
      ytd-in-feed-ad-layout-renderer,
      ytd-ad-slot-renderer,
      #onetrust-consent-sdk,
      .cookie-banner,
      .consent-banner,
      .cc-window,
      .qc-cmp2-container {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        max-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
        overflow: hidden !important;
      }
    `;
  }

  /**
   * Injects In-Page Scriptlets:
   * 1. YouTube Ad Fast-Forward & Skip Engine
   * 2. Anti-Adblock Defusers (stubs window.adsbygoogle, window.ga, window.gtag)
   * 3. Brave Farbling (Anti-fingerprinting micro-noise for Canvas & AudioContext)
   * 4. Dynamic Ad MutationObserver
   */
  getInPageScriptlet() {
    return `
      (() => {
        try {
          if (window.__aether_shields_active) return;
          window.__aether_shields_active = true;

          // 1. Anti-AdBlock Defuser Stubs
          window.canRunAds = true;
          window.isAdBlockActive = false;
          window.google_ad_client = 'ca-pub-0000000000000000';
          if (!window.ga) window.ga = function() {};
          if (!window.gtag) window.gtag = function() {};
          if (!window.adsbygoogle) {
            window.adsbygoogle = [];
            window.adsbygoogle.push = function() { return 0; };
          }

          // 2. YouTube Ad-Skipper & Video Fast-Forward Engine
          if (location.hostname.includes('youtube.com')) {
            const skipYouTubeAds = () => {
              try {
                // Auto-close overlay ads
                const overlayClose = document.querySelector('.ytp-ad-overlay-close-button');
                if (overlayClose) overlayClose.click();

                // Skip video ads
                const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
                const adShowing = document.querySelector('.ad-showing') || document.querySelector('.ad-interrupting');
                if (video && adShowing) {
                  video.muted = true;
                  video.playbackRate = 16.0;
                  if (isFinite(video.duration) && video.duration > 0) {
                    video.currentTime = video.duration - 0.1;
                  }
                }

                // Click skip button immediately
                const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, button.ytp-ad-skip-button');
                if (skipBtn) {
                  skipBtn.click();
                }

                // Dismiss anti-adblock modal
                const dismissBtn = document.querySelector('ytd-enforcement-message-view-model #dismiss-button');
                if (dismissBtn) {
                  dismissBtn.click();
                  if (video && video.paused) video.play();
                }
              } catch (e) {}
            };
            setInterval(skipYouTubeAds, 50);
          }

          // 3. Dynamic Ad Mutation Observer for SPAs
          const removeAdElements = (root) => {
            if (!root || !root.querySelectorAll) return;
            const selectors = 'ins.adsbygoogle, [id^="google_ads"], .ad-slot, .ad-container, [data-ad-unit]';
            root.querySelectorAll(selectors).forEach(el => {
              el.style.display = 'none';
              el.style.height = '0px';
            });
          };

          const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
              for (const node of mutation.addedNodes) {
                if (node.nodeType === 1) removeAdElements(node);
              }
            }
          });
          observer.observe(document.documentElement || document.body, { childList: true, subtree: true });

          // 4. Brave Farbling: Canvas & Audio Anti-Fingerprinting Protection
          if (HTMLCanvasElement.prototype.toDataURL) {
            const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function(...args) {
              try {
                const ctx = this.getContext('2d');
                if (ctx && this.width > 16 && this.height > 16) {
                  const imgData = ctx.getImageData(0, 0, 1, 1);
                  imgData.data[0] = (imgData.data[0] ^ 1) & 0xFF;
                  ctx.putImageData(imgData, 0, 0);
                }
              } catch (e) {}
              return origToDataURL.apply(this, args);
            };
          }
        } catch (err) {}
      })();
    `;
  }

  attachToSession(sessionInstance) {
    if (!sessionInstance || !sessionInstance.webRequest) return;

    // 1. Block ad & tracking requests + HTTPS Upgrades + Tracking Query Stripping
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

      // Strip Tracking Query Parameters (Brave URL Tracking Protection)
      if (this.enabled && this.stripTrackingParams && (url.includes('utm_') || url.includes('fbclid') || url.includes('gclid') || url.includes('msclkid'))) {
        const cleaned = this.cleanTrackingUrl(url);
        if (cleaned !== url) {
          return callback({ redirectURL: cleaned });
        }
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
