const assert = require('assert');
const navigationController = require('../electron/navigation-controller');

function run() {
  console.log('Testing NavigationController...');

  // 1. Internal URL detection
  assert.strictEqual(navigationController.isInternalUrl('amiyo://newtab'), true);
  assert.strictEqual(navigationController.isInternalUrl('amiyo://settings'), true);
  assert.strictEqual(navigationController.isInternalUrl('https://google.com'), false);

  // 2. Resolve URLs
  assert.strictEqual(navigationController.resolveUrl('https://example.com'), 'https://example.com');
  assert.strictEqual(navigationController.resolveUrl('http://insecure.org'), 'http://insecure.org');
  assert.strictEqual(navigationController.resolveUrl('github.com'), 'https://github.com');
  assert.strictEqual(navigationController.resolveUrl('wikipedia.org/wiki/Main_Page'), 'https://wikipedia.org/wiki/Main_Page');
  assert.strictEqual(navigationController.resolveUrl('localhost:3000'), 'http://localhost:3000');
  assert.strictEqual(navigationController.resolveUrl('127.0.0.1:8080'), 'http://127.0.0.1:8080');

  // 3. Search query conversion
  const queryGoogle = navigationController.resolveUrl('hello world', 'google');
  assert.strictEqual(queryGoogle, 'https://www.google.com/search?q=hello%20world');

  const queryDdg = navigationController.resolveUrl('hello world', 'duckduckgo');
  assert.strictEqual(queryDdg, 'https://duckduckgo.com/?q=hello%20world');

  const queryBing = navigationController.resolveUrl('hello world', 'bing');
  assert.strictEqual(queryBing, 'https://www.bing.com/search?q=hello%20world');

  const queryYahoo = navigationController.resolveUrl('hello world', 'yahoo');
  assert.strictEqual(queryYahoo, 'https://search.yahoo.com/search?p=hello%20world');

  const queryEcosia = navigationController.resolveUrl('hello world', 'ecosia');
  assert.strictEqual(queryEcosia, 'https://www.ecosia.org/search?q=hello%20world');

  // 4. Security status
  const sec1 = navigationController.getSecurityStatus('https://google.com');
  assert.strictEqual(sec1.isSecure, true);
  assert.strictEqual(sec1.type, 'secure');

  const sec2 = navigationController.getSecurityStatus('http://example.com');
  assert.strictEqual(sec2.isSecure, false);
  assert.strictEqual(sec2.type, 'insecure');

  const sec3 = navigationController.getSecurityStatus('amiyo://newtab');
  assert.strictEqual(sec3.isSecure, true);
  assert.strictEqual(sec3.type, 'internal');

  // 5. Suggestions
  const suggestions = navigationController.getOmniboxSuggestions('new');
  assert.ok(Array.isArray(suggestions));
  assert.ok(suggestions.length > 0);
  assert.strictEqual(suggestions[0].type, 'search');

  console.log('✔ NavigationController tests passed!');
}

module.exports = { run };
if (require.main === module) run();

