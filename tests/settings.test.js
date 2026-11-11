const assert = require('assert');
const storageManager = require('../electron/storage-manager');

function run() {
  console.log('Testing Settings Storage...');

  const settings = storageManager.getSettings();
  assert.ok(settings);
  assert.ok(typeof settings.theme === 'string');
  assert.ok(typeof settings.searchEngine === 'string');

  // Update setting
  const originalTheme = settings.theme;
  const newTheme = originalTheme === 'dark' ? 'light' : 'dark';

  storageManager.saveSettings({ theme: newTheme });
  assert.strictEqual(storageManager.getSettings().theme, newTheme);

  // Restore
  storageManager.saveSettings({ theme: originalTheme });
  assert.strictEqual(storageManager.getSettings().theme, originalTheme);

  console.log('✔ Settings tests passed!');
}

module.exports = { run };
if (require.main === module) run();

