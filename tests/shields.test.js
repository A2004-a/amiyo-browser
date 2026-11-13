const assert = require('assert');
const shields = require('../electron/shields-controller');

function run() {
  console.log('Testing ShieldsController (Ad & Tracker Blocker)...');

  // Test 1: Block known ad domain
  const adCheck = shields.isDomainBlocked('doubleclick.net');
  assert.strictEqual(adCheck.blocked, true, 'doubleclick.net should be blocked');
  assert.strictEqual(adCheck.type, 'ad');

  const subAdCheck = shields.isDomainBlocked('sub.adservice.google.com');
  assert.strictEqual(subAdCheck.blocked, true, 'Subdomain of adservice.google.com should be blocked');

  // Test 2: Block known tracker domain
  const trackerCheck = shields.isDomainBlocked('google-analytics.com');
  assert.strictEqual(trackerCheck.blocked, true, 'google-analytics.com should be blocked');
  assert.strictEqual(trackerCheck.type, 'tracker');

  // Test 3: Do NOT block legitimate domains
  const normalCheck1 = shields.isDomainBlocked('github.com');
  assert.strictEqual(normalCheck1.blocked, false, 'github.com should not be blocked');

  const normalCheck2 = shields.isDomainBlocked('wikipedia.org');
  assert.strictEqual(normalCheck2.blocked, false, 'wikipedia.org should not be blocked');

  // Test 4: Pattern matching for ad paths
  const patternCheck = shields.isUrlBlocked('https://example.com/assets/ads-banner.js');
  assert.strictEqual(patternCheck.blocked, true, 'URL matching /ads/ pattern should be blocked');

  // Test 5: shouldBlock() logic and statistics recording
  const tabId = 'test_tab_1';
  shields.clearTabStats(tabId);
  const wasBlocked = shields.shouldBlock('https://securepubads.g.doubleclick.net/gampad/ads', tabId);
  assert.strictEqual(wasBlocked, true, 'Doubleclick ad should be blocked by shouldBlock()');

  const tabStats = shields.getTabStats(tabId);
  assert.ok(tabStats.total >= 1, 'Tab blocked count should increment');
  assert.ok(tabStats.ads >= 1, 'Tab ads count should increment');

  // Test 6: Whitelist logic
  shields.toggleSiteWhitelist('example.com', true);
  assert.strictEqual(shields.isSiteWhitelisted('example.com'), true, 'example.com should be whitelisted');

  const whitelistedBlock = shields.shouldBlock('https://doubleclick.net/ad', tabId, 'https://example.com/page');
  assert.strictEqual(whitelistedBlock, false, 'Requests from whitelisted site should bypass shields');

  shields.toggleSiteWhitelist('example.com', false);
  assert.strictEqual(shields.isSiteWhitelisted('example.com'), false, 'example.com should be un-whitelisted');

  // Test 7: Global Toggle
  shields.toggle(false);
  assert.strictEqual(shields.enabled, false, 'Shields should be disabled');
  assert.strictEqual(shields.shouldBlock('https://doubleclick.net/ad'), false, 'Disabled shields should not block');

  shields.toggle(true);
  assert.strictEqual(shields.enabled, true, 'Shields should be re-enabled');

  // Test 8: YouTube ad endpoints blocking
  const ytCheck1 = shields.isUrlBlocked('https://www.youtube.com/pagead/parallel?video_id=123');
  assert.strictEqual(ytCheck1.blocked, true, 'YouTube pagead endpoint should be blocked');

  const ytCheck2 = shields.isUrlBlocked('https://www.youtube.com/api/stats/ads?adformat=2');
  assert.strictEqual(ytCheck2.blocked, true, 'YouTube stats ads endpoint should be blocked');

  // Test 9: URL Tracking parameter stripping (Brave Query Filter)
  const dirtyUrl = 'https://news.ycombinator.com/item?id=123&utm_source=twitter&utm_medium=social&fbclid=IwAR123';
  const cleanUrl = shields.cleanTrackingUrl(dirtyUrl);
  assert.strictEqual(cleanUrl.includes('utm_source'), false, 'utm_source should be stripped');
  assert.strictEqual(cleanUrl.includes('fbclid'), false, 'fbclid should be stripped');
  assert.strictEqual(cleanUrl.includes('id=123'), true, 'legitimate id parameter should be preserved');

  // Test 10: Cosmetic CSS & In-Page Scriptlet
  const css = shields.getCosmeticCss();
  assert.ok(css.includes('ins.adsbygoogle'), 'Cosmetic CSS should hide adsbygoogle');
  assert.ok(css.includes('ytp-ad-module'), 'Cosmetic CSS should hide YouTube ad modules');

  const scriptlet = shields.getInPageScriptlet();
  assert.ok(scriptlet.includes('skipYouTubeAds'), 'Scriptlet should contain YouTube ad skipper');
  assert.ok(scriptlet.includes('canRunAds'), 'Scriptlet should contain anti-adblock defuser stubs');

  // Test 11: Shields Mode switching
  shields.setMode('aggressive');
  assert.strictEqual(shields.mode, 'aggressive', 'Shields mode should be aggressive');
  shields.setMode('standard');
  assert.strictEqual(shields.mode, 'standard', 'Shields mode should be standard');

  // Test 12: Brave De-AMP Engine
  const ampUrl = 'https://www.google.com/amp/s/example.com/breaking-news-story?utm_source=news';
  const deAmped = shields.deAmpUrl(ampUrl);
  assert.ok(deAmped.startsWith('https://example.com/breaking-news-story'), 'De-AMP should redirect directly to publisher domain');
  assert.ok(!deAmped.includes('google.com/amp'), 'De-AMP URL must not contain Google AMP proxy');

  // Test 13: Brave Cookie Notice & Annoyance Blocking
  assert.ok(css.includes('#onetrust-consent-sdk'), 'Cosmetic CSS should hide OneTrust banner');
  assert.ok(css.includes('#CybotCookiebotDialog'), 'Cosmetic CSS should hide Cookiebot dialog');
  assert.ok(scriptlet.includes('unlockScroll'), 'Scriptlet should unlock body scroll on hidden modals');

  // Test 14: Brave Farbling (Anti-Fingerprinting)
  assert.ok(scriptlet.includes('UNMASKED_RENDERER_WEBGL'), 'Scriptlet should mask WebGL renderer info');
  assert.ok(scriptlet.includes('AudioBuffer.prototype.getChannelData'), 'Scriptlet should farble AudioContext');
  assert.ok(scriptlet.includes('hardwareConcurrency'), 'Scriptlet should standardize CPU cores');

  console.log('✔ ShieldsController tests passed!');
}

module.exports = { run };

