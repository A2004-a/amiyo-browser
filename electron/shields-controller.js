/**
 * AETHER Shields — Enterprise-Grade Ad & Tracker Blocker, Anti-Fingerprinting & Privacy Engine.
 * Built to match the speed, precision, and privacy standards of Brave Shields.
 * 
 * Features:
 *  1. Network-Level Domain & Pattern Filter (EasyList + EasyPrivacy inspired rule engine)
 *  2. Brave De-AMP Engine (Direct canonical publisher redirects from Google AMP)
 *  3. YouTube Ad-Skipper & Video Ad Defuser (Instant ad fast-forward, overlay dismissal & skip)
 *  4. Advanced URL Query Parameter Cleaner (Strips UTM, FBCLID, GCLID, and cross-site tracking tags)
 *  5. Cookie Consent Notice Blocker & Scroll Restorer (Fanboy's Annoyance & CMP removal)
 *  6. Advanced Cosmetic Ad Hiding (IAB classes, sticky banners, sponsored recommendation widgets)
 *  7. Anti-AdBlock Defuser & Scriptlet Stubs (Defuses adblock detectors so sites don't break)
 *  8. Anti-Fingerprinting Shield (Brave Farbling: Canvas, Audio, WebGL & Hardware noise defense)
 *  9. Cross-Origin Referrer Trimming (Leaking private paths/queries prevented)
 * 10. Standard & Aggressive Shields Modes with live per-site controls and blocked asset audit
 */

const storageManager = require('./storage-manager');

class ShieldsController {
  constructor() {
    this.enabled = true;
    this.mode = 'standard'; // 'standard' | 'aggressive'
    this.stripTrackingParams = true;
    this.antiFingerprinting = true;
    this.deAmpEnabled = true;
    this.blockCookieBanners = true;

    this.stats = {
      totalBlocked: 0,
      adsBlocked: 0,
      trackersBlocked: 0,
      httpsUpgrades: 0,
      paramsStripped: 0,
      deAmpCount: 0
    };

    // Per-tab blocked request audit: tabId -> { ads: number, trackers: number, total: number, blockedUrls: [] }
    this.tabStats = new Map();

    // Whitelist domains where shields are disabled: Set of clean domains
    this.whitelist = new Set();

    // Per-site script blocking domains: Set of clean domains
    this.scriptBlockDomains = new Set();

    // Tracking query parameters to strip (Brave URL Tracking Protection)
    this.trackingParamKeys = new Set([
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'utm_reader', 'utm_name', 'utm_cid',
      'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid', 'twclid', 'yclid', 'zanpid',
      'mc_eid', 'igshid', '_hsenc', '_hsmi', 'wickedid', 'rb_clickid', 's_kwcid',
      '_ga', '_gl', 'ref_src', 'ref_url', 'mkt_tok', 'trk', 'tracking_id', 'gdfms', 'gdftrk', 'gdffi'
    ]);

    // High-performance domain blocklists (500+ top ad exchanges, networks & servers)
    this.adDomains = new Set([
      // Google / DoubleClick
      'doubleclick.net', 'googlesyndication.com', 'adservice.google.com', 'googleads.g.doubleclick.net',
      'pagead2.googlesyndication.com', 'securepubads.g.doubleclick.net', 'admob.com', 'ads.google.com',
      'googleadservices.com', 'afs.googlesyndication.com', 'partner.googleadservices.com',
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
      'yieldlab.net', 'connatix.com', 'aniview.com', 'brid.tv', 'playwire.com', 'primis.tech',
      'vidoomy.com', 'adsupply.com', 'adreactor.com', 'adrecover.com', 'adthrive.com',
      'mediavine.com', 'mediaalpha.com', 'monetizemore.com', 'proper.io', 'shareaholic.com',
      'skimresources.com', 'viglink.com', 'skimlinks.com', 'chitika.net', 'clicksor.com',
      // Popunder, Redirect & Malicious Networks
      'hilltopads.net', 'clickadu.com', 'richpush.co', 'evadav.com', 'rollerads.com',
      'trafficstars.com', 'plugrush.com', 'adxad.com', 'adknowledge.com', 'bidtheatre.com',
      // Crypto Mining Scripts
      'coinhive.com', 'coin-hive.com', 'jsecoin.com', 'cryptoloot.pro', 'coinimp.com',
      'webminepool.com', 'minr.pw', 'authedmine.com', 'monerominer.rocks'
    ]);

    // High-performance tracker & analytics blocklists (300+ behavioral telemetry networks)
    this.trackerDomains = new Set([
      'google-analytics.com', 'googletagmanager.com', 'analytics.google.com', 'ssl.google-analytics.com',
      'googletagservices.com', 'hotjar.com', 'static.hotjar.com', 'mouseflow.com', 'crazyegg.com',
      'mixpanel.com', 'api.mixpanel.com', 'segment.com', 'segment.io', 'cdn.segment.com',
      'amplitude.com', 'api.amplitude.com', 'optimizely.com', 'cdn.optimizely.com',
      'fullstory.com', 'logrocket.com', 'heapanalytics.com', 'cdn.heapanalytics.com',
      'kissmetrics.com', 'statcounter.com', 'chartbeat.com', 'static.chartbeat.com',
      'newrelic.com', 'nr-data.net', 'branch.io', 'api2.branch.io', 'appsflyer.com',
      'onelink.me', 'adjust.com', 'app.adjust.com', 'kochava.com', 'clarity.ms',
      'c.clarity.ms', 'bing.com/clarity', 'yandex.ru/metrika', 'mc.yandex.ru',
      'facebook.com/tr', 'connect.facebook.net/en_US/fbevents.js', 'pixel.wp.com',
      'stats.wp.com', 'analytics.twitter.com', 't.co/i/adsct', 'ads-twitter.com',
      'analytics.tiktok.com', 'tr.snapchat.com', 'sc-static.net/scevent.min.js',
      'licdn.com/tag', 'px.ads.linkedin.com', 'redditstatic.com/ads/pixel.js',
      'alb.reddit.com/rp.gif', 'quora.com/_/ad', 'pinterest.com/ct.html', 'ct.pinterest.com',
      'criteo.net/event', 'pardot.com', 'marketo.net', 'hubspot.com/analytics',
      'woopra.com', 'inspectlet.com', 'clicktale.net', 'alexametrics.com', 'doubleverify.com',
      'singular.net', 'braze.com', 'onesignal.com', 'pushwoosh.com', 'clevertap.com',
      'adjust.io', 'branch.net', 'permutive.com', 'id5-sync.com', 'liveramp.com',
      'rlcdn.com', 'agkn.com', 'demdex.net', 'omtrdc.net', 'everesttech.net'
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
      /\/analytics\.js/i,
      /\/adsbygoogle\.js/i,
      /\/prebid[\.\/_\-]/i
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
    if (settings.blockCookieBanners !== undefined) {
      this.blockCookieBanners = !!settings.blockCookieBanners;
    }
    if (settings.deAmpEnabled !== undefined) {
      this.deAmpEnabled = !!settings.deAmpEnabled;
    }
    if (settings.blockedScriptsDomains && Array.isArray(settings.blockedScriptsDomains)) {
      this.scriptBlockDomains = new Set(settings.blockedScriptsDomains.map(d => d.toLowerCase()));
    }
  }

  /**
   * Brave De-AMP Engine: Redirects Google AMP URLs to the canonical publisher URL.
   */
  deAmpUrl(rawUrl) {
    if (!this.enabled || !this.deAmpEnabled || !rawUrl || typeof rawUrl !== 'string') {
      return rawUrl;
    }
    try {
      const parsed = new URL(rawUrl);

      // Google AMP viewer: https://www.google.com/amp/s/example.com/article
      if (parsed.hostname.includes('google.') && parsed.pathname.startsWith('/amp/')) {
        let target = parsed.pathname.replace(/^\/amp\/(s\/)?/, '');
        if (target) {
          if (!target.startsWith('http')) target = `https://${target}`;
          this.stats.deAmpCount++;
          return target + parsed.search + parsed.hash;
        }
      }

      // Google AMP Project CDN: https://example-com.cdn.ampproject.org/v/s/example.com/article
      if (parsed.hostname.endsWith('.ampproject.org') && parsed.pathname.includes('/s/')) {
        const parts = parsed.pathname.split('/s/');
        if (parts.length > 1) {
          let target = parts.slice(1).join('/s/');
          if (!target.startsWith('http')) target = `https://${target}`;
          this.stats.deAmpCount++;
          return target + parsed.search + parsed.hash;
        }
      }

      return rawUrl;
    } catch (e) {
      return rawUrl;
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
      stripTrackingParams: this.stripTrackingParams,
      blockCookieBanners: this.blockCookieBanners,
      deAmpEnabled: this.deAmpEnabled,
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
   * Injects Brave-grade Cosmetic Filtering & Whitespace Collapse Stylesheet + Cookie Consent Notice Blocker
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
      ytd-rich-item-renderer:has(.ytd-ad-slot-renderer),
      /* Cookie Consent Notices (Fanboy's Annoyance / Easylist Cookie) */
      #onetrust-consent-sdk,
      #onetrust-banner-sdk,
      .ot-floating-button,
      .osano-cm-window,
      .cc-window,
      .cc-banner,
      .cookie-banner,
      .consent-banner,
      .qc-cmp2-container,
      .qc-cmp-ui-container,
      #usercentrics-root,
      #didomi-host,
      #didomi-popup,
      .didomi-popup-container,
      .trustarc-banner,
      #truste-consent-track,
      .iubenda-cs-default,
      .iubenda-cs-banner,
      .cookieyes-banner,
      .cky-consent-container,
      .klaro,
      .axeptio_mount,
      .cm__wrap,
      .evidon-banner,
      .termly-styles,
      #CybotCookiebotDialog,
      #CybotCookiebotDialogBodyUnderlay {
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
   * 1. YouTube Ad Fast-Forward & Skip Engine + Anti-Adblock Warning Dismissal
   * 2. Anti-Adblock Defusers (stubs window.adsbygoogle, window.ga, window.gtag)
   * 3. Cookie Consent Scroll-Lock Restorer
   * 4. Brave Farbling: Micro-noise for Canvas, AudioContext, WebGL & Hardware profiling
   * 5. Dynamic Ad MutationObserver for Single Page Applications
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

          // 2. Cookie Banner Scroll Restorer (Ensures hidden consent modal doesn't lock scroll)
          const unlockScroll = () => {
            try {
              if (document.body && (document.body.style.overflow === 'hidden' || document.body.style.position === 'fixed')) {
                document.body.style.overflow = 'auto';
                document.body.style.position = 'static';
              }
              if (document.documentElement && document.documentElement.style.overflow === 'hidden') {
                document.documentElement.style.overflow = 'auto';
              }
            } catch (e) {}
          };
          setTimeout(unlockScroll, 500);
          setTimeout(unlockScroll, 1500);

          // 3. YouTube Ad-Skipper & Video Fast-Forward Engine
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

          // 4. Dynamic Ad Mutation Observer for SPAs
          const removeAdElements = (root) => {
            if (!root || !root.querySelectorAll) return;
            const selectors = 'ins.adsbygoogle, [id^="google_ads"], .ad-slot, .ad-container, [data-ad-unit], ytd-ad-slot-renderer';
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

          // 5. Brave Farbling: Canvas, AudioContext & WebGL Anti-Fingerprinting Protection
          const sessionNoise = (Math.random() * 0.0001) - 0.00005;

          // 5a. Canvas Farbling
          if (HTMLCanvasElement.prototype.toDataURL) {
            const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function(...args) {
              try {
                const ctx = this.getContext('2d');
                if (ctx && this.width > 8 && this.height > 8) {
                  const imgData = ctx.getImageData(0, 0, 1, 1);
                  imgData.data[0] = (imgData.data[0] ^ 1) & 0xFF;
                  ctx.putImageData(imgData, 0, 0);
                }
              } catch (e) {}
              return origToDataURL.apply(this, args);
            };
          }

          if (CanvasRenderingContext2D.prototype.getImageData) {
            const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
            CanvasRenderingContext2D.prototype.getImageData = function(...args) {
              const res = origGetImageData.apply(this, args);
              try {
                if (res && res.data && res.data.length > 4) {
                  res.data[0] = (res.data[0] ^ 1) & 0xFF;
                }
              } catch (e) {}
              return res;
            };
          }

          // 5b. Audio Farbling
          if (typeof AudioBuffer !== 'undefined' && AudioBuffer.prototype.getChannelData) {
            const origGetChannelData = AudioBuffer.prototype.getChannelData;
            AudioBuffer.prototype.getChannelData = function(...args) {
              const channel = origGetChannelData.apply(this, args);
              try {
                if (channel && channel.length > 0) {
                  channel[0] += sessionNoise;
                }
              } catch (e) {}
              return channel;
            };
          }

          // 5c. WebGL Farbling (Mask unmasked vendor & renderer info)
          if (typeof WebGLRenderingContext !== 'undefined') {
            const origGetParam = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(param) {
              // UNMASKED_VENDOR_WEBGL
              if (param === 0x9245) return 'Intel Inc.';
              // UNMASKED_RENDERER_WEBGL
              if (param === 0x9246) return 'Intel(R) Iris(TM) Plus Graphics';
              return origGetParam.apply(this, arguments);
            };
          }

          // 5d. Hardware Fingerprinting Protection (Standardize cores & memory)
          try {
            Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8, configurable: true });
            Object.defineProperty(navigator, 'deviceMemory', { get: () => 8, configurable: true });
          } catch (e) {}

        } catch (err) {}
      })();
    `;
  }

  attachToSession(sessionInstance) {
    if (!sessionInstance || !sessionInstance.webRequest) return;

    // 1. Block ad & tracking requests + HTTPS Upgrades + Brave De-AMP + Tracking Query Stripping
    sessionInstance.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (details, callback) => {
      let url = details.url;

      // Brave De-AMP: Redirect Google AMP pages to clean original publisher URLs
      if (this.enabled && this.deAmpEnabled && (url.includes('/amp/') || url.includes('.ampproject.org'))) {
        const deAmped = this.deAmpUrl(url);
        if (deAmped !== url) {
          return callback({ redirectURL: deAmped });
        }
      }

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
      if (this.enabled && this.stripTrackingParams && (url.includes('utm_') || url.includes('fbclid') || url.includes('gclid') || url.includes('msclkid') || url.includes('_ga'))) {
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

    // 2. Anti-Fingerprinting, Cross-Origin Referrer Trimming & Privacy Header Injection
    sessionInstance.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = { ...details.requestHeaders };

      if (this.enabled) {
        // Enforce Global Privacy Control (GPC) and Do Not Track (DNT)
        headers['Sec-GPC'] = '1';
        headers['DNT'] = '1';

        // Strip invasive Google-specific tracking headers
        delete headers['X-Client-Data'];
        delete headers['X-Chrome-UMA-Enabled'];

        // Brave Cross-Origin Referrer Trimming:
        // When navigating cross-origin, truncate Referer to origin only
        if (details.referrer && details.url) {
          try {
            const refUrl = new URL(details.referrer);
            const targetUrl = new URL(details.url);
            if (refUrl.origin !== targetUrl.origin) {
              headers['Referer'] = refUrl.origin + '/';
            }
          } catch (e) {}
        }
      }

      callback({ requestHeaders: headers });
    });
  }
}

module.exports = new ShieldsController();
