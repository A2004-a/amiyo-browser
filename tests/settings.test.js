const assert = require('assert');
const storageManager = require('../electron/storage-manager');
const shieldsController = require('../electron/shields-controller');

function run() {
  console.log('Testing Settings Storage & All 10 Feature Modules (One-by-One Self-Test)...');

  // Preserve initial settings to restore after testing
  const initialSettings = { ...storageManager.getSettings() };

  // ==========================================
  // 1. General Settings
  // ==========================================
  console.log('  [1/10] Testing General Settings...');
  // Startup option: restoreTabsOnStartup
  storageManager.saveSettings({ restoreTabsOnStartup: true });
  assert.strictEqual(storageManager.getSettings().restoreTabsOnStartup, true);
  storageManager.saveSettings({ restoreTabsOnStartup: false });
  assert.strictEqual(storageManager.getSettings().restoreTabsOnStartup, false);

  // Homepage URL & legacy migration
  storageManager.saveSettings({ homepage: 'https://duckduckgo.com' });
  assert.strictEqual(storageManager.getSettings().homepage, 'https://duckduckgo.com');
  // Legacy migration: amiyo://newtab -> aether://newtab
  storageManager.saveSettings({ homepage: 'amiyo://newtab' });
  assert.strictEqual(storageManager.getSettings().homepage, 'aether://newtab');

  // Bookmarks bar toggle
  storageManager.saveSettings({ showBookmarksBar: false });
  assert.strictEqual(storageManager.getSettings().showBookmarksBar, false);
  storageManager.saveSettings({ showBookmarksBar: true });
  assert.strictEqual(storageManager.getSettings().showBookmarksBar, true);

  // ==========================================
  // 2. Appearance & Theme Switching
  // ==========================================
  console.log('  [2/10] Testing Appearance & Theme Switching (Dark, Light, Cyan, System)...');
  const testThemes = ['dark', 'light', 'cyan', 'system'];
  testThemes.forEach(t => {
    storageManager.saveSettings({ theme: t });
    assert.strictEqual(storageManager.getSettings().theme, t);
  });

  // Zoom levels
  [75, 90, 100, 110, 125, 150].forEach(zoom => {
    storageManager.saveSettings({ defaultZoom: zoom });
    assert.strictEqual(storageManager.getSettings().defaultZoom, zoom);
  });

  // Font size
  ['small', 'medium', 'large', 'xlarge'].forEach(f => {
    storageManager.saveSettings({ fontSize: f });
    assert.strictEqual(storageManager.getSettings().fontSize, f);
  });

  // Vertical tabs
  storageManager.saveSettings({ verticalTabs: true });
  assert.strictEqual(storageManager.getSettings().verticalTabs, true);
  storageManager.saveSettings({ verticalTabs: false });
  assert.strictEqual(storageManager.getSettings().verticalTabs, false);

  // ==========================================
  // 3. Search Engine Settings
  // ==========================================
  console.log('  [3/10] Testing Search Engine Configuration...');
  const engines = ['google', 'duckduckgo', 'bing', 'yahoo', 'ecosia', 'custom'];
  engines.forEach(e => {
    storageManager.saveSettings({ searchEngine: e });
    assert.strictEqual(storageManager.getSettings().searchEngine, e);
  });

  // Custom search URL
  const customUrl = 'https://kagi.com/search?q=%s';
  storageManager.saveSettings({ customSearchUrl: customUrl });
  assert.strictEqual(storageManager.getSettings().customSearchUrl, customUrl);

  // Search suggestions
  storageManager.saveSettings({ searchSuggestions: false });
  assert.strictEqual(storageManager.getSettings().searchSuggestions, false);
  storageManager.saveSettings({ searchSuggestions: true });
  assert.strictEqual(storageManager.getSettings().searchSuggestions, true);

  // ==========================================
  // 4. AETHER Shield Settings (Brave-Grade Blocking)
  // ==========================================
  console.log('  [4/10] Testing AETHER Shield Settings & Synchronization...');
  // Master toggle
  storageManager.saveSettings({ shieldsEnabled: false });
  shieldsController.updateSettings({ shieldsEnabled: false });
  assert.strictEqual(storageManager.getSettings().shieldsEnabled, false);
  assert.strictEqual(shieldsController.enabled, false);

  storageManager.saveSettings({ shieldsEnabled: true });
  shieldsController.updateSettings({ shieldsEnabled: true });
  assert.strictEqual(storageManager.getSettings().shieldsEnabled, true);
  assert.strictEqual(shieldsController.enabled, true);

  // Mode: standard vs aggressive
  storageManager.saveSettings({ shieldsMode: 'aggressive' });
  shieldsController.updateSettings({ shieldsMode: 'aggressive' });
  assert.strictEqual(storageManager.getSettings().shieldsMode, 'aggressive');
  assert.strictEqual(shieldsController.mode, 'aggressive');

  storageManager.saveSettings({ shieldsMode: 'standard' });
  shieldsController.updateSettings({ shieldsMode: 'standard' });
  assert.strictEqual(storageManager.getSettings().shieldsMode, 'standard');
  assert.strictEqual(shieldsController.mode, 'standard');

  // Granular shield toggles
  const shieldToggles = [
    { key: 'blockCookieBanners', prop: 'blockCookieBanners' },
    { key: 'deAmpEnabled', prop: 'deAmpEnabled' },
    { key: 'stripTrackingParams', prop: 'stripTrackingParams' },
    { key: 'antiFingerprinting', prop: 'antiFingerprinting' },
    { key: 'youtubeAdSkip', prop: null },
    { key: 'httpsUpgrades', prop: null }
  ];

  shieldToggles.forEach(({ key, prop }) => {
    storageManager.saveSettings({ [key]: false });
    if (prop) shieldsController.updateSettings({ [key]: false });
    assert.strictEqual(storageManager.getSettings()[key], false);
    if (prop) assert.strictEqual(shieldsController[prop], false);

    storageManager.saveSettings({ [key]: true });
    if (prop) shieldsController.updateSettings({ [key]: true });
    assert.strictEqual(storageManager.getSettings()[key], true);
    if (prop) assert.strictEqual(shieldsController[prop], true);
  });

  // ==========================================
  // 5. Performance & Memory Saver
  // ==========================================
  console.log('  [5/10] Testing Performance & Memory Saver Settings...');
  storageManager.saveSettings({ memorySaver: false });
  assert.strictEqual(storageManager.getSettings().memorySaver, false);
  storageManager.saveSettings({ memorySaver: true });
  assert.strictEqual(storageManager.getSettings().memorySaver, true);

  ['15', '30', '60', '120'].forEach(timeout => {
    storageManager.saveSettings({ sleepTimeout: timeout });
    assert.strictEqual(storageManager.getSettings().sleepTimeout, timeout);
  });

  storageManager.saveSettings({ hardwareAcceleration: false });
  assert.strictEqual(storageManager.getSettings().hardwareAcceleration, false);
  storageManager.saveSettings({ hardwareAcceleration: true });
  assert.strictEqual(storageManager.getSettings().hardwareAcceleration, true);

  // ==========================================
  // 6. AETHER Intelligence Settings
  // ==========================================
  console.log('  [6/10] Testing AETHER Intelligence Configuration...');
  ['builtin', 'gemini', 'openai', 'ollama'].forEach(prov => {
    storageManager.saveSettings({ aiProvider: prov });
    assert.strictEqual(storageManager.getSettings().aiProvider, prov);
  });

  const testApiKey = 'AIzaSyAETHERSecretKey9988';
  storageManager.saveSettings({ aiApiKey: testApiKey });
  assert.strictEqual(storageManager.getSettings().aiApiKey, testApiKey);

  const testModel = 'gemini-1.5-pro';
  storageManager.saveSettings({ aiModel: testModel });
  assert.strictEqual(storageManager.getSettings().aiModel, testModel);

  const testOllamaUrl = 'http://localhost:11434';
  storageManager.saveSettings({ aiOllamaUrl: testOllamaUrl });
  assert.strictEqual(storageManager.getSettings().aiOllamaUrl, testOllamaUrl);

  storageManager.saveSettings({ aiPageContext: false });
  assert.strictEqual(storageManager.getSettings().aiPageContext, false);
  storageManager.saveSettings({ aiPageContext: true });
  assert.strictEqual(storageManager.getSettings().aiPageContext, true);

  // ==========================================
  // 7. Privacy & Security Settings
  // ==========================================
  console.log('  [7/10] Testing Privacy & Security Settings...');
  storageManager.saveSettings({ doNotTrack: false });
  assert.strictEqual(storageManager.getSettings().doNotTrack, false);
  storageManager.saveSettings({ doNotTrack: true });
  assert.strictEqual(storageManager.getSettings().doNotTrack, true);

  storageManager.saveSettings({ blockPopups: false });
  assert.strictEqual(storageManager.getSettings().blockPopups, false);
  storageManager.saveSettings({ blockPopups: true });
  assert.strictEqual(storageManager.getSettings().blockPopups, true);

  storageManager.saveSettings({ httpsOnly: true });
  assert.strictEqual(storageManager.getSettings().httpsOnly, true);
  storageManager.saveSettings({ httpsOnly: false });
  assert.strictEqual(storageManager.getSettings().httpsOnly, false);

  storageManager.saveSettings({ blockWebRtcLeak: false });
  assert.strictEqual(storageManager.getSettings().blockWebRtcLeak, false);
  storageManager.saveSettings({ blockWebRtcLeak: true });
  assert.strictEqual(storageManager.getSettings().blockWebRtcLeak, true);

  // ==========================================
  // 8. Downloads Settings
  // ==========================================
  console.log('  [8/10] Testing Downloads Settings...');
  const testDlPath = 'C:\\Users\\Test\\Downloads\\Aether';
  storageManager.saveSettings({ downloadPath: testDlPath });
  assert.strictEqual(storageManager.getSettings().downloadPath, testDlPath);

  storageManager.saveSettings({ askDownloadPath: true });
  assert.strictEqual(storageManager.getSettings().askDownloadPath, true);
  storageManager.saveSettings({ askDownloadPath: false });
  assert.strictEqual(storageManager.getSettings().askDownloadPath, false);

  // ==========================================
  // 9. Website Permissions Settings
  // ==========================================
  console.log('  [9/10] Testing Website Permissions Settings...');
  ['ask', 'allow', 'block'].forEach(policy => {
    storageManager.saveSettings({ permMedia: policy });
    assert.strictEqual(storageManager.getSettings().permMedia, policy);

    storageManager.saveSettings({ permGeo: policy });
    assert.strictEqual(storageManager.getSettings().permGeo, policy);

    storageManager.saveSettings({ permNotif: policy });
    assert.strictEqual(storageManager.getSettings().permNotif, policy);
  });

  ['block', 'allow'].forEach(policy => {
    storageManager.saveSettings({ permPopups: policy });
    assert.strictEqual(storageManager.getSettings().permPopups, policy);
  });

  // Per-origin permission storage
  const origin = 'https://example.com';
  storageManager.setPermission(origin, 'geolocation', true);
  assert.strictEqual(storageManager.getPermissions()[origin].geolocation, true);

  storageManager.setPermission(origin, 'camera', false);
  assert.strictEqual(storageManager.getPermissions()[origin].camera, false);

  // ==========================================
  // 10. Settings Restoration
  // ==========================================
  console.log('  [10/10] Restoring Initial Settings State...');
  storageManager.saveSettings(initialSettings);
  assert.strictEqual(storageManager.getSettings().theme, initialSettings.theme);
  assert.strictEqual(storageManager.getSettings().searchEngine, initialSettings.searchEngine);

  console.log('✔ All 10 Settings Feature Modules Tested & Verified Successfully!');
}

module.exports = { run };
if (require.main === module) run();
