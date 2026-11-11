const assert = require('assert');
const storageManager = require('../electron/storage-manager');

function run() {
  console.log('Testing History Storage...');

  // 1. Add valid entry
  const entry = storageManager.addHistory({
    title: 'Test Page',
    url: 'https://testsite.org/page',
    favicon: 'https://testsite.org/fav.ico'
  });
  assert.ok(entry);
  assert.ok(entry.id);

  // 2. Ignore internal pages
  const internalEntry = storageManager.addHistory({
    title: 'Internal',
    url: 'amiyo://newtab'
  });
  assert.strictEqual(internalEntry, null);

  // 3. Ignore private browsing
  const privateEntry = storageManager.addHistory({
    title: 'Private Page',
    url: 'https://secret.com',
    isPrivate: true
  });
  assert.strictEqual(privateEntry, null);

  // 4. Delete item
  storageManager.deleteHistoryItem(entry.id);
  const history = storageManager.getHistory();
  const exists = history.some(h => h.id === entry.id);
  assert.strictEqual(exists, false);

  console.log('✔ History tests passed!');
}

module.exports = { run };
if (require.main === module) run();

