const IpcClient = {
  api: window.aetherAPI || window.amiyoAPI,

  // Window
  minimize() { return this.api.window.minimize(); },
  maximize() { return this.api.window.maximize(); },
  close() { return this.api.window.close(); },
  isMaximized() { return this.api.window.isMaximized(); },
  createNewWindow() { return this.api.window.createNew(); },
  createPrivate() { return this.api.window.createPrivate(); },
  toggleFullscreen() { return this.api.window.toggleFullscreen(); },
  setTopOffset(offset) { return this.api.window.setTopOffset(offset); },
  setLeftOffset(offset) { return this.api.window.setLeftOffset ? this.api.window.setLeftOffset(offset) : Promise.resolve(); },
  print(tabId) { return this.api.window.print ? this.api.window.print(tabId) : Promise.resolve(false); },

  // Tabs
  createTab(url, options) { return this.api.tabs.create(url, options); },
  switchTab(tabId) { return this.api.tabs.switch(tabId); },
  closeTab(tabId) { return this.api.tabs.close(tabId); },
  duplicateTab(tabId) { return this.api.tabs.duplicate(tabId); },
  pinTab(tabId, isPinned) { return this.api.tabs.pin(tabId, isPinned); },
  muteTab(tabId, isMuted) { return this.api.tabs.mute(tabId, isMuted); },
  reorderTabs(fromIdx, toIdx) { return this.api.tabs.reorder(fromIdx, toIdx); },
  restoreTab() { return this.api.tabs.restore(); },
  navigateTab(tabId, url) { return this.api.tabs.navigate(tabId, url); },
  getTabs() { return this.api.tabs.list(); },
  setViewVisible(visible) { return this.api.tabs && this.api.tabs.setViewVisible ? this.api.tabs.setViewVisible(visible) : Promise.resolve(); },

  // Navigation
  goBack(tabId) { return this.api.navigation.back(tabId); },
  goForward(tabId) { return this.api.navigation.forward(tabId); },
  reload(tabId, ignoreCache) { return this.api.navigation.reload(tabId, ignoreCache); },
  stop(tabId) { return this.api.navigation.stop(tabId); },
  getSuggestions(query) { return this.api.navigation.getSuggestions(query); },
  getSecurityStatus(url) { return this.api.navigation.getSecurityStatus(url); },

  // Bookmarks
  getBookmarks() { return this.api.bookmarks.get(); },
  addBookmark(item) { return this.api.bookmarks.add(item); },
  removeBookmark(id) { return this.api.bookmarks.remove(id); },
  updateBookmark(id, updates) { return this.api.bookmarks.update(id, updates); },
  exportBookmarks() { return this.api.bookmarks.export(); },
  importBookmarks(json) { return this.api.bookmarks.import(json); },

  // History
  getHistory() { return this.api.history.get(); },
  deleteHistoryItem(id) { return this.api.history.delete(id); },
  clearHistory(range) { return this.api.history.clear(range); },
  clearData(options) { return this.api.history?.clearData ? this.api.history.clearData(options) : Promise.resolve({ success: true }); },

  // Downloads
  getDownloads() { return this.api.downloads.get(); },
  pauseDownload(id) { return this.api.downloads.pause(id); },
  resumeDownload(id) { return this.api.downloads.resume(id); },
  cancelDownload(id) { return this.api.downloads.cancel(id); },
  openDownloadFile(path) { return this.api.downloads.openFile(path); },
  showDownloadInFolder(path) { return this.api.downloads.showInFolder(path); },
  clearDownloads() { return this.api.downloads.clear(); },

  // Settings
  getSettings() { return this.api.settings.get(); },
  saveSettings(updates) { return this.api.settings.save(updates); },
  updateSettings(updates) { return this.api.settings.save(updates); },
  selectDownloadDir() { return this.api.settings.selectDownloadDir(); },

  // Permissions
  getPermissions() { return this.api.permissions.get(); },
  setPermission(origin, perm, state) { return this.api.permissions.set(origin, perm, state); },

  // Find in page
  find(tabId, text, options) { return this.api.find.start(tabId, text, options); },
  stopFind(tabId, action) { return this.api.find.stop(tabId, action); },

  // Zoom
  setZoom(tabId, factor) { return this.api.zoom.set(tabId, factor); },

  // Context Menu & App Menu
  showContextMenu(params) { return this.api.contextMenu.show(params); },
  showAppMenu(coords) { return this.api.contextMenu?.showAppMenu ? this.api.contextMenu.showAppMenu(coords) : Promise.resolve(false); },

  // AI Assistant
  aiChat(data) { return this.api.ai ? this.api.ai.chat(data) : Promise.resolve('AI service unavailable'); },
  aiSummarize(tabId) { return this.api.ai ? this.api.ai.summarize(tabId) : Promise.resolve({ summary: 'Unavailable' }); },
  aiGetPageContent(tabId) { return this.api.ai ? this.api.ai.getPageContent(tabId) : Promise.resolve({ title: '', url: '', text: '' }); },
  setSideOffset(offset) { return this.api.ai ? this.api.ai.setSideOffset(offset) : Promise.resolve(); },
  onAiAskSelection(callback) {
    if (this.api.ai && this.api.ai.onAskSelection) {
      return this.api.ai.onAskSelection(callback);
    }
    return () => {};
  },
  onAiTriggerSummarize(callback) {
    if (this.api.ai && this.api.ai.onTriggerSummarize) {
      return this.api.ai.onTriggerSummarize(callback);
    }
    return () => {};
  },

  // AMIYO Shields
  getShieldsStatus() { return this.api.shields ? this.api.shields.getStatus() : Promise.resolve({ enabled: true, totalBlocked: 0 }); },
  toggleShields(enabled) { return this.api.shields ? this.api.shields.toggle(enabled) : Promise.resolve(true); },
  getShieldsTabStats(tabId) { return this.api.shields ? this.api.shields.getTabStats(tabId) : Promise.resolve({ total: 0 }); },
  toggleShieldsWhitelist(domain, allow) { return this.api.shields ? this.api.shields.toggleWhitelist(domain, allow) : Promise.resolve(false); },

  // Tab Suspension & Memory Saver
  suspendTab(tabId) { return this.api.tabs ? this.api.tabs.suspend(tabId) : Promise.resolve(false); },
  resumeTab(tabId) { return this.api.tabs ? this.api.tabs.resume(tabId) : Promise.resolve(true); },

  // Tab Groups
  createTabGroup(data) { return this.api.tabs ? this.api.tabs.createGroup(data) : Promise.resolve(null); },
  updateTabGroup(id, updates) { return this.api.tabs ? this.api.tabs.updateGroup(id, updates) : Promise.resolve(null); },
  deleteTabGroup(id) { return this.api.tabs ? this.api.tabs.deleteGroup(id) : Promise.resolve(false); },
  setTabGroup(tabId, groupId) { return this.api.tabs ? this.api.tabs.setGroup(tabId, groupId) : Promise.resolve(false); },
  getTabGroups() { return this.api.tabs ? this.api.tabs.getGroups() : Promise.resolve([]); },

  // Split-Screen Dual View
  setSplitTab(tabId) { return this.api.tabs ? this.api.tabs.setSplit(tabId) : Promise.resolve(true); },
  closeSplitTab() { return this.api.tabs ? this.api.tabs.closeSplit() : Promise.resolve(true); },
  getSplitTab() { return this.api.tabs ? this.api.tabs.getSplit() : Promise.resolve(null); },
  getSplitId() { return this.getSplitTab(); },

  // Reading Mode
  extractArticle(tabId) { return this.api.reader ? this.api.reader.extract(tabId) : Promise.resolve({ success: false }); },

  // Web Capture / Screenshot
  captureViewport(tabId) { return this.api.capture ? this.api.capture.viewport(tabId) : Promise.resolve({ success: false }); },
  captureClipboard(tabId) { return this.api.capture ? this.api.capture.clipboard(tabId) : Promise.resolve(false); },
  captureSave(tabId, name) { return this.api.capture ? this.api.capture.save(tabId, name) : Promise.resolve(false); },

  // Task Manager
  getSystemTasks() { return this.api.system ? this.api.system.getTasks() : Promise.resolve([]); },
  killSystemProcess(pid, tabId) { return this.api.system ? this.api.system.killProcess(pid, tabId) : Promise.resolve(false); }
};

