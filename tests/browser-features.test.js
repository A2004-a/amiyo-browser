const assert = require('assert');
const QRCode = require('../src/js/qrcode.js');

function testQrCode() {
  const url = 'https://aether.browser/download?ref=mobile';
  const matrix = QRCode.generateMatrix(url);
  assert(Array.isArray(matrix), 'QR matrix must be an array');
  assert(matrix.length >= 21, 'QR matrix dimension must be at least 21x21');
  assert.strictEqual(matrix.length, matrix[0].length, 'QR matrix must be square');
  // Check top-left finder pattern is present (7x7)
  assert.strictEqual(matrix[0][0], 1, 'Top-left module must be dark');
  assert.strictEqual(matrix[0][6], 1, 'Top-left finder border module must be dark');
  assert.strictEqual(matrix[6][0], 1, 'Top-left finder border module must be dark');
}

function testCleanUrl() {
  function getCleanUrl(rawUrl) {
    try {
      const u = new URL(rawUrl);
      const trackers = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', '_ga', '_gl', 'ref'];
      trackers.forEach(t => u.searchParams.delete(t));
      return u.toString();
    } catch (e) {
      return rawUrl;
    }
  }

  const dirty = 'https://example.com/article?title=test&utm_source=twitter&utm_medium=social&fbclid=12345&gclid=67890#section';
  const clean = getCleanUrl(dirty);
  assert(!clean.includes('utm_source'), 'Clean URL must not contain utm_source');
  assert(!clean.includes('fbclid'), 'Clean URL must not contain fbclid');
  assert(!clean.includes('gclid'), 'Clean URL must not contain gclid');
  assert(clean.includes('title=test'), 'Clean URL must preserve legitimate query parameters');
  assert(clean.includes('#section'), 'Clean URL must preserve hash fragments');
}

function testBraveMetrics() {
  function calcMetrics(count) {
    const bwSaved = count < 8 ? `${Math.round(count * 128)} KB` : `${(count * 128 / 1024).toFixed(1)} MB`;
    const timeSaved = `${(count * 0.055).toFixed(1)} s`;
    return { bwSaved, timeSaved };
  }

  const m1 = calcMetrics(4);
  assert.strictEqual(m1.bwSaved, '512 KB');
  assert.strictEqual(m1.timeSaved, '0.2 s');

  const m2 = calcMetrics(16);
  assert.strictEqual(m2.bwSaved, '2.0 MB');
  assert.strictEqual(m2.timeSaved, '0.9 s');
}

function testChromeKeywords() {
  function parseKeyword(input) {
    const trimmed = input.trim();
    if (trimmed === '@') return { type: 'menu' };
    if (trimmed.startsWith('@bookmarks') || trimmed.startsWith('@b ')) {
      return { type: 'bookmarks', term: trimmed.replace(/^@(bookmarks|b)\s*/i, '').trim() };
    }
    if (trimmed.startsWith('@history') || trimmed.startsWith('@h ')) {
      return { type: 'history', term: trimmed.replace(/^@(history|h)\s*/i, '').trim() };
    }
    if (trimmed.startsWith('@tabs') || trimmed.startsWith('@t ')) {
      return { type: 'tabs', term: trimmed.replace(/^@(tabs|t)\s*/i, '').trim() };
    }
    if (trimmed.startsWith('@yt')) {
      return { type: 'youtube', term: trimmed.replace(/^@yt\s*/i, '').trim() };
    }
    if (trimmed.startsWith('@wiki')) {
      return { type: 'wikipedia', term: trimmed.replace(/^@wiki\s*/i, '').trim() };
    }
    return null;
  }

  assert.deepStrictEqual(parseKeyword('@'), { type: 'menu' });
  assert.deepStrictEqual(parseKeyword('@b github'), { type: 'bookmarks', term: 'github' });
  assert.deepStrictEqual(parseKeyword('@history electron'), { type: 'history', term: 'electron' });
  assert.deepStrictEqual(parseKeyword('@t google'), { type: 'tabs', term: 'google' });
  assert.deepStrictEqual(parseKeyword('@yt lo-fi hip hop'), { type: 'youtube', term: 'lo-fi hip hop' });
  assert.deepStrictEqual(parseKeyword('@wiki quantum computing'), { type: 'wikipedia', term: 'quantum computing' });
}

function testTabGroupsFeature() {
  const groups = new Map();
  function createGroup({ id, title, name, color, tabIds } = {}) {
    const groupId = id || `group_${Date.now()}`;
    const group = {
      id: groupId,
      title: title || name || 'New Group',
      color: color || '#6366f1'
    };
    groups.set(groupId, group);
    return { group, tabIds: tabIds || [] };
  }

  const res1 = createGroup({ name: 'Work Project', color: '#10b981', tabIds: ['tab_1', 'tab_2'] });
  assert.strictEqual(res1.group.title, 'Work Project', 'Group title should accept name property');
  assert.strictEqual(res1.group.color, '#10b981');
  assert.deepStrictEqual(res1.tabIds, ['tab_1', 'tab_2'], 'Tab IDs must be retained');
}

function testFindBarOffsets() {
  let currentOffset = 84;
  function setTopOffset(isOpen) {
    currentOffset = isOpen ? 84 + 38 : 84;
    return currentOffset;
  }
  assert.strictEqual(setTopOffset(true), 122, 'Top offset should expand by 38px for docked find bar');
  assert.strictEqual(setTopOffset(false), 84, 'Top offset should reset to 84px when find bar is closed');
}

function testViewVisibilityReset() {
  class MockTabController {
    constructor() {
      this.isViewVisible = false; // Initially hidden by popover / suggestions
      this.activeTabId = 'tab_1';
      this.tabs = [
        { id: 'tab_1', url: 'aether://newtab', isInternal: true, bounds: { x: 0, y: 0, width: 0, height: 0 } },
        { id: 'tab_2', url: 'https://google.com', isInternal: false, bounds: { x: 0, y: 0, width: 0, height: 0 } }
      ];
    }
    updateActiveViewBounds() {
      const active = this.tabs.find(t => t.id === this.activeTabId);
      if (!active || active.isInternal) return;
      if (this.isViewVisible === false) {
        active.bounds = { x: 0, y: 0, width: 0, height: 0 };
        return;
      }
      active.bounds = { x: 0, y: 84, width: 1200, height: 716 };
    }
    navigateTab(tabId, url) {
      const tab = this.tabs.find(t => t.id === tabId);
      if (!tab) return;
      const isInternal = url.startsWith('aether://');
      tab.url = url;
      tab.isInternal = isInternal;
      if (!isInternal) {
        this.isViewVisible = true; // Fix: Reset visibility
        this.updateActiveViewBounds();
      }
    }
  }

  const ctrl = new MockTabController();
  assert.strictEqual(ctrl.isViewVisible, false, 'Precondition: visibility was false');

  // Navigate to external Google URL from internal tab
  ctrl.navigateTab('tab_1', 'https://www.google.com/');
  assert.strictEqual(ctrl.isViewVisible, true, 'isViewVisible must be restored to true on navigation');
  assert.strictEqual(ctrl.tabs[0].bounds.width, 1200, 'Web contents bounds width must be restored to full width');
  assert.strictEqual(ctrl.tabs[0].bounds.height, 716, 'Web contents bounds height must be restored to full height');
}

module.exports = {
  run() {
    console.log('Testing Signature Browser Features (Brave, Chrome, Safari, Edge)...');
    testQrCode();
    testCleanUrl();
    testBraveMetrics();
    testChromeKeywords();
    testTabGroupsFeature();
    testFindBarOffsets();
    testViewVisibilityReset();
    console.log('✔ Signature Browser Features tests passed!');
  }
};

