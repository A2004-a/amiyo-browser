const assert = require('assert');
const storageManager = require('../electron/storage-manager');

function run() {
  console.log('Testing Bookmarks Storage...');

  const initialCount = storageManager.getBookmarks().length;

  // Add bookmark
  const testBm = storageManager.addBookmark({
    title: 'Test Bookmark',
    url: 'https://test-example-site.com',
    favicon: 'https://test-example-site.com/fav.ico'
  });
  assert.ok(testBm.id);
  assert.strictEqual(testBm.title, 'Test Bookmark');

  // Verify addition
  const bookmarksAfterAdd = storageManager.getBookmarks();
  const found = bookmarksAfterAdd.find(b => b.id === testBm.id);
  assert.ok(found);

  // Update bookmark
  storageManager.updateBookmark(testBm.id, { title: 'Updated Test Bookmark' });
  const updated = storageManager.getBookmarks().find(b => b.id === testBm.id);
  assert.strictEqual(updated.title, 'Updated Test Bookmark');

  // Remove bookmark
  storageManager.removeBookmark(testBm.id);
  const afterRemove = storageManager.getBookmarks().find(b => b.id === testBm.id);
  assert.strictEqual(afterRemove, undefined);

  console.log('✔ Bookmarks tests passed!');
}

module.exports = { run };
if (require.main === module) run();

