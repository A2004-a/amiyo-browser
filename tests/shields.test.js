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

  console.log('✔ ShieldsController tests passed!');
}

module.exports = { run };

