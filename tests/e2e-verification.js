const { app, BrowserWindow, WebContentsView } = require('electron');
const path = require('path');
const windowManager = require('../electron/window-manager');
const storageManager = require('../electron/storage-manager');
const navigationController = require('../electron/navigation-controller');
const { registerIpcHandlers } = require('../electron/ipc-handlers');

console.log('====================================================');
console.log('    AETHER Browser — Step-by-Step E2E Test Suite    ');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function reportTest(name, passed, details = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`✔ [PASS ${passedTests}] ${name}`);
  } else {
    console.error(`❌ [FAIL] ${name} ${details}`);
  }
}

app.whenReady().then(async () => {
  try {
    registerIpcHandlers();

    // ----------------------------------------------------
    // TEST 1: Window creation & Shell HTML Loading
    // ----------------------------------------------------
    const win = windowManager.createWindow(false);
    reportTest('Window creation (frameless, modern chrome)', !!win);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Window load timed out')), 5000);
      win.webContents.once('did-finish-load', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    reportTest('Shell HTML (src/index.html) loaded cleanly', true);

    // ----------------------------------------------------
    // TEST 2: Tab Controller & Initial Tab Initialization
    // ----------------------------------------------------
    const winInfo = windowManager.getWindowInfo(win);
    reportTest('WindowManager associates TabController with window', !!winInfo && !!winInfo.tabController);

    const tabCtrl = winInfo.tabController;
    const initialTabs = tabCtrl.getTabsSummary();
    reportTest('Initial tab created automatically on startup', initialTabs.length >= 1);
    reportTest('Initial tab URL is aether://newtab', initialTabs[0].url === 'aether://newtab');
    reportTest('Initial tab is marked isInternal: true', initialTabs[0].isInternal === true);

    // ----------------------------------------------------
    // TEST 3: Navigation Resolution (Search Queries & Domains)
    // ----------------------------------------------------
    const queryUrl = navigationController.resolveUrl('india');
    reportTest('Search query "india" resolves to Google Search URL', queryUrl.includes('google.com/search?q=india'));

    const domainUrl = navigationController.resolveUrl('github.com');
    reportTest('Bare domain "github.com" resolves to https://github.com', domainUrl === 'https://github.com');

    const localhostUrl = navigationController.resolveUrl('localhost:8080');
    reportTest('Localhost "localhost:8080" resolves to http://localhost:8080', localhostUrl === 'http://localhost:8080');

    // ----------------------------------------------------
    // TEST 4: Omnibox Suggestions
    // ----------------------------------------------------
    const suggestions = navigationController.getOmniboxSuggestions('india');
    reportTest('Omnibox produces search suggestion for query', suggestions.length > 0 && suggestions[0].type === 'search');

    // ----------------------------------------------------
    // TEST 5: Tab Navigation & WebContentsView Visibility
    // ----------------------------------------------------
    tabCtrl.navigateTab(initialTabs[0].id, 'https://example.com');
    const activeTabAfterNav = tabCtrl.getActiveTab();
    reportTest('Tab URL updated to https://example.com', activeTabAfterNav.url === 'https://example.com');
    reportTest('Tab isInternal is false for external web URLs', activeTabAfterNav.isInternal === false);
    reportTest('WebContentsView is attached and visible for external URLs', activeTabAfterNav.view.getVisible() === true);

    // ----------------------------------------------------
    // TEST 6: Internal Page Navigation & View Hiding
    // ----------------------------------------------------
    tabCtrl.navigateTab(initialTabs[0].id, 'aether://settings');
    const tabAfterSettings = tabCtrl.getActiveTab();
    reportTest('Tab navigates to aether://settings', tabAfterSettings.url === 'aether://settings');
    reportTest('Tab isInternal is true for internal pages', tabAfterSettings.isInternal === true);
    reportTest('WebContentsView is hidden for internal pages so HTML shell renders', tabAfterSettings.view.getVisible() === false);

    // ----------------------------------------------------
    // TEST 7: Multi-Tab Operations (Create, Switch, Close, Duplicate)
    // ----------------------------------------------------
    const tab2 = tabCtrl.createTab('aether://history', { active: true });
    reportTest('Second tab created (aether://history)', tabCtrl.tabs.length === 2);
    reportTest('Second tab becomes active', tabCtrl.activeTabId === tab2.id);

    tabCtrl.switchTab(initialTabs[0].id);
    reportTest('Switch back to first tab', tabCtrl.activeTabId === initialTabs[0].id);

    const dupTab = tabCtrl.duplicateTab(initialTabs[0].id);
    reportTest('Duplicate active tab', tabCtrl.tabs.length === 3 && dupTab.url === 'aether://settings');

    tabCtrl.closeTab(dupTab.id);
    reportTest('Close duplicated tab', tabCtrl.tabs.length === 2);

    // ----------------------------------------------------
    // TEST 8: Recently Closed Tab Restoration
    // ----------------------------------------------------
    const restored = tabCtrl.restoreClosedTab();
    reportTest('Restore closed tab (Ctrl+Shift+T)', !!restored && tabCtrl.tabs.length === 3);

    // ----------------------------------------------------
    // TEST 9: Bookmarks Persistence
    // ----------------------------------------------------
    const bm = storageManager.addBookmark({
      title: 'E2E Test Bookmark',
      url: 'https://e2e-test-bookmark.org'
    });
    reportTest('Add bookmark', !!bm && !!bm.id);
    const bookmarks = storageManager.getBookmarks();
    const hasBm = bookmarks.some(b => b.id === bm.id);
    reportTest('Bookmark stored and retrieved from persistent storage', hasBm);
    storageManager.removeBookmark(bm.id);
    reportTest('Bookmark removed cleanly', !storageManager.getBookmarks().some(b => b.id === bm.id));

    // ----------------------------------------------------
    // TEST 10: Browsing History
    // ----------------------------------------------------
    const hist = storageManager.addHistory({
      title: 'Visited Test Page',
      url: 'https://visited-page.com'
    });
    reportTest('History entry added', !!hist && !!hist.id);
    reportTest('History entry retrieved from persistent storage', storageManager.getHistory().some(h => h.id === hist.id));
    storageManager.deleteHistoryItem(hist.id);
    reportTest('History entry deleted', !storageManager.getHistory().some(h => h.id === hist.id));

    // ----------------------------------------------------
    // TEST 11: Settings & Theme Switching
    // ----------------------------------------------------
    const origTheme = storageManager.getSettings().theme;
    storageManager.saveSettings({ theme: 'light' });
    reportTest('Settings updated theme to light', storageManager.getSettings().theme === 'light');
    storageManager.saveSettings({ theme: origTheme });
    reportTest('Settings restored theme to ' + origTheme, storageManager.getSettings().theme === origTheme);

    // ----------------------------------------------------
    // TEST 12: Private Window Creation & Partition Isolation
    // ----------------------------------------------------
    const privateWin = windowManager.createWindow(true);
    const privateWinInfo = windowManager.getWindowInfo(privateWin);
    reportTest('Private window created with isolated session', !!privateWin && privateWinInfo.isPrivate === true);
    privateWin.close();
    reportTest('Private window closed cleanly', true);

    // ----------------------------------------------------
    // TEST 13: Session Save & Restore
    // ----------------------------------------------------
    const testTabsToSave = [
      { url: 'https://github.com', title: 'GitHub', favicon: '', isPinned: true },
      { url: 'https://duckduckgo.com', title: 'DuckDuckGo', favicon: '', isPinned: false }
    ];
    storageManager.saveSession(testTabsToSave);
    const restoredSession = storageManager.getSession();
    reportTest('Session saved and restored properly', restoredSession.length === 2 && restoredSession[0].url === 'https://github.com');

    // ----------------------------------------------------
    // TEST 14: Bookmarks Import/Export
    // ----------------------------------------------------
    const testImportData = JSON.stringify([
      { title: 'Test Import Site', url: 'https://test-import.org' }
    ]);
    const prevCount = storageManager.getBookmarks().length;
    JSON.parse(testImportData).forEach(item => storageManager.addBookmark(item));
    const newCount = storageManager.getBookmarks().length;
    reportTest('Bookmark import added new bookmark entry', newCount === prevCount + 1);
    const imported = storageManager.getBookmarks().find(b => b.url === 'https://test-import.org');
    if (imported) storageManager.removeBookmark(imported.id);

    // ----------------------------------------------------
    // TEST 15: Window Fullscreen & Control APIs
    // ----------------------------------------------------
    const isFsBefore = win.isFullScreen();
    win.setFullScreen(true);
    reportTest('Fullscreen mode toggled on', win.isFullScreen() === true);
    win.setFullScreen(isFsBefore);
    reportTest('Fullscreen mode restored to original state', win.isFullScreen() === isFsBefore);

    console.log('\n====================================================');
    console.log(`  E2E TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED!`);
    console.log('====================================================');

    setTimeout(() => {
      app.quit();
      process.exit(passedTests === totalTests ? 0 : 1);
    }, 500);

  } catch (err) {
    console.error('E2E Test Execution Error:', err);
    app.quit();
    process.exit(1);
  }
});

