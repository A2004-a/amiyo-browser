const IpcClient = {
  api: window.amiyoAPI,

  // Window
  minimize() { return this.api.window.minimize(); },
  maximize() { return this.api.window.maximize(); },
  close() { return this.api.window.close(); },
  isMaximized() { return this.api.window.isMaximized(); },
  createNewWindow() { return this.api.window.createNew(); },
  createPrivate() { return this.api.window.createPrivate(); },
  toggleFullscreen() { return this.api.window.toggleFullscreen(); },
  setTopOffset(offset) { return this.api.window.setTopOffset(offset); },

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

  // Context Menu
  showContextMenu(params) { return this.api.contextMenu.show(params); },

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
  }
};

