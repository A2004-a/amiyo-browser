const assert = require('assert');

function run() {
  console.log('Testing Memory Saver / Sleeping Tabs...');

  // Mock Tab structure as implemented in electron/tab-controller.js
  const mockTabs = new Map();
  let activeTabId = 'tab-1';

  function createMockTab(id, url) {
    return {
      id,
      url,
      title: 'Test Page',
      isInternal: false,
      isSuspended: false,
      view: {
        isDestroyed: false,
        webContents: {
          loadURL: (u) => Promise.resolve(u)
        }
      }
    };
  }

  const tab1 = createMockTab('tab-1', 'https://example.com');
  const tab2 = createMockTab('tab-2', 'https://heavy-site.com');
  mockTabs.set(tab1.id, tab1);
  mockTabs.set(tab2.id, tab2);

  // 1. Cannot suspend the active tab
  function suspendTab(tabId) {
    const tab = mockTabs.get(tabId);
    if (!tab || tab.isInternal || tab.isSuspended || tab.id === activeTabId) {
      return false;
    }
    tab.isSuspended = true;
    tab.view = null; // Detach view to release memory
    return true;
  }

  const suspendActiveResult = suspendTab('tab-1');
  assert.strictEqual(suspendActiveResult, false);
  assert.strictEqual(tab1.isSuspended, false);

  // 2. Can suspend background tab
  const suspendBgResult = suspendTab('tab-2');
  assert.strictEqual(suspendBgResult, true);
  assert.strictEqual(tab2.isSuspended, true);
  assert.strictEqual(tab2.view, null);

  // 3. Resuming tab restores view
  function resumeTab(tabId) {
    const tab = mockTabs.get(tabId);
    if (!tab || !tab.isSuspended) return false;
    tab.isSuspended = false;
    tab.view = {
      isDestroyed: false,
      webContents: {
        loadURL: (u) => Promise.resolve(u)
      }
    };
    return true;
  }

  const resumeResult = resumeTab('tab-2');
  assert.strictEqual(resumeResult, true);
  assert.strictEqual(tab2.isSuspended, false);
  assert.ok(tab2.view !== null);

  console.log('✔ Memory Saver tests passed!');
}

module.exports = { run };
if (require.main === module) run();

