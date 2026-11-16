const IpcClient = {
  api: window.aetherAPI || window.amiyoAPI,

  // Window
  minimize() { return this.api.window.minimize(); },
  maximize() { return this.api.window.maximize(); },
  snapWindow(layout) { return this.api.window.snap ? this.api.window.snap(layout) : Promise.resolve(null); },
  close() { return this.api.window.close(); },
  isMaximized() { return this.api.window.isMaximized(); },
  createNewWindow() { return this.api.window.createNew(); },
  createPrivate() { return this.api.window.createPrivate(); },
  newWindow(isPrivate = false) { return isPrivate ? this.createPrivate() : this.createNewWindow(); },
  isPrivate() { return this.api.window.isPrivate ? this.api.window.isPrivate() : Promise.resolve(false); },
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

  // AETHER Shields
  getShieldsStatus() { return this.api.shields ? this.api.shields.getStatus() : Promise.resolve({ enabled: true, totalBlocked: 0 }); },
  toggleShields(enabled) { return this.api.shields ? this.api.shields.toggle(enabled) : Promise.resolve(true); },
  setShieldsMode(mode) { return this.api.shields?.setMode ? this.api.shields.setMode(mode) : Promise.resolve(mode); },
  getShieldsTabStats(tabId) { return this.api.shields ? this.api.shields.getTabStats(tabId) : Promise.resolve({ total: 0 }); },
  toggleShieldsWhitelist(domain, allow) { return this.api.shields ? this.api.shields.toggleWhitelist(domain, allow) : Promise.resolve(false); },
  getCustomShieldRules() { return this.api.shields?.getCustomRules ? this.api.shields.getCustomRules() : Promise.resolve([]); },
  addCustomShieldRule(pattern, action) { return this.api.shields?.addCustomRule ? this.api.shields.addCustomRule(pattern, action) : Promise.resolve(null); },
  deleteCustomShieldRule(id) { return this.api.shields?.deleteCustomRule ? this.api.shields.deleteCustomRule(id) : Promise.resolve(true); },
  toggleSocialShield(enable) { return this.api.shields?.toggleSocial ? this.api.shields.toggleSocial(enable) : Promise.resolve(true); },
  toggleMinerShield(enable) { return this.api.shields?.toggleMiners ? this.api.shields.toggleMiners(enable) : Promise.resolve(true); },

  // Session Recovery
  getSessionBackup() { return this.api.sessionRecovery?.getBackup ? this.api.sessionRecovery.getBackup() : Promise.resolve(null); },
  restoreSessionBackup() { return this.api.sessionRecovery?.restoreBackup ? this.api.sessionRecovery.restoreBackup() : Promise.resolve(false); },

  // Global Media Controls
  getActiveMedia() { return this.api.media?.getActive ? this.api.media.getActive() : Promise.resolve([]); },
  toggleAllAudio(mute) { return this.api.media?.toggleAllAudio ? this.api.media.toggleAllAudio(mute) : Promise.resolve(true); },

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
  killSystemProcess(pid, tabId) { return this.api.system ? this.api.system.killProcess(pid, tabId) : Promise.resolve(false); },

  // Print to PDF
  printToPdf(tabId) { return this.api.window?.printToPdf ? this.api.window.printToPdf(tabId) : Promise.resolve({ success: false }); },

  // Bulk Tab Actions
  closeOtherTabs(tabId) { return this.api.tabs?.closeOther ? this.api.tabs.closeOther(tabId) : Promise.resolve(true); },
  closeTabsToRight(tabId) { return this.api.tabs?.closeRight ? this.api.tabs.closeRight(tabId) : Promise.resolve(true); },
  closeMultipleTabs(tabIds) { return this.api.tabs?.closeMultiple ? this.api.tabs.closeMultiple(tabIds) : Promise.resolve(true); },
  muteMultipleTabs(tabIds, isMuted) { return this.api.tabs?.muteMultiple ? this.api.tabs.muteMultiple(tabIds, isMuted) : Promise.resolve(true); },

  // Clean URL
  getCleanUrl(rawUrl) { return this.api.navigation?.getCleanUrl ? this.api.navigation.getCleanUrl(rawUrl) : Promise.resolve(rawUrl); },

  // Bookmarks Netscape HTML Export/Import
  exportBookmarksHtml() { return this.api.bookmarks?.exportHtml ? this.api.bookmarks.exportHtml() : Promise.resolve(''); },
  importBookmarksHtml(html) { return this.api.bookmarks?.importHtml ? this.api.bookmarks.importHtml(html) : Promise.resolve({ success: false }); },

  // Host Zoom Memory
  getHostZoom(host) { return this.api.zoom?.getHost ? this.api.zoom.getHost(host) : Promise.resolve(100); },
  setHostZoom(host, pct) { return this.api.zoom?.setHost ? this.api.zoom.setHost(host, pct) : Promise.resolve(); },

  // Picture-in-Picture
  togglePip(tabId) { return this.api.pip?.toggle ? this.api.pip.toggle(tabId) : Promise.resolve({ active: false }); },
  sendPipAction(action) { if (this.api.pip?.action) this.api.pip.action(action); },

  // Reading List
  getReadingList() { return this.api.readingList?.get ? this.api.readingList.get() : Promise.resolve([]); },
  addReadingListItem(item) { return this.api.readingList?.add ? this.api.readingList.add(item) : Promise.resolve(null); },
  toggleReadingListItem(id) { return this.api.readingList?.toggleRead ? this.api.readingList.toggleRead(id) : Promise.resolve(null); },
  removeReadingListItem(id) { return this.api.readingList?.remove ? this.api.readingList.remove(id) : Promise.resolve(true); },

  // Passwords Vault
  getPasswords() { return this.api.passwords?.get ? this.api.passwords.get() : Promise.resolve([]); },
  savePassword(entry) { return this.api.passwords?.save ? this.api.passwords.save(entry) : Promise.resolve(null); },
  deletePassword(id) { return this.api.passwords?.delete ? this.api.passwords.delete(id) : Promise.resolve(true); },

  // Custom Search Engines
  getCustomEngines() { return this.api.customEngines?.get ? this.api.customEngines.get() : Promise.resolve([]); },
  addCustomEngine(engine) { return this.api.customEngines?.add ? this.api.customEngines.add(engine) : Promise.resolve(null); },
  deleteCustomEngine(kw) { return this.api.customEngines?.delete ? this.api.customEngines.delete(kw) : Promise.resolve(true); },

  // Network Diagnostics
  pingDiagnostics() { return this.api.diagnostics?.ping ? this.api.diagnostics.ping() : Promise.resolve({ online: navigator.onLine }); },

  // AETHER Secure VPN
  getVpnStatus() { return this.api.vpn?.getStatus ? this.api.vpn.getStatus() : Promise.resolve({ connected: false }); },
  connectVpn(locId) { return this.api.vpn?.connect ? this.api.vpn.connect(locId) : Promise.resolve({ connected: false }); },
  disconnectVpn() { return this.api.vpn?.disconnect ? this.api.vpn.disconnect() : Promise.resolve({ connected: false }); },
  toggleVpn(locId) { return this.api.vpn?.toggle ? this.api.vpn.toggle(locId) : Promise.resolve({ connected: false }); },
  setVpnLocation(locId) { return this.api.vpn?.setLocation ? this.api.vpn.setLocation(locId) : Promise.resolve(); },
  getVpnLocations() { return this.api.vpn?.getLocations ? this.api.vpn.getLocations() : Promise.resolve([]); },
  setVpnKillSwitch(val) { return this.api.vpn?.setKillSwitch ? this.api.vpn.setKillSwitch(val) : Promise.resolve(); },
  setVpnDnsLeakProtection(val) { return this.api.vpn?.setDnsLeakProtection ? this.api.vpn.setDnsLeakProtection(val) : Promise.resolve(); },
  setVpnWebRtcProtection(val) { return this.api.vpn?.setWebRtcProtection ? this.api.vpn.setWebRtcProtection(val) : Promise.resolve(); },
  setVpnAutoConnect(val) { return this.api.vpn?.setAutoConnect ? this.api.vpn.setAutoConnect(val) : Promise.resolve(); },
  addVpnBypassDomain(dom) { return this.api.vpn?.addBypassDomain ? this.api.vpn.addBypassDomain(dom) : Promise.resolve([]); },
  removeVpnBypassDomain(dom) { return this.api.vpn?.removeBypassDomain ? this.api.vpn.removeBypassDomain(dom) : Promise.resolve([]); },
  measureVpnLatency() { return this.api.vpn?.measureLatency ? this.api.vpn.measureLatency() : Promise.resolve(20); },
  setVpnMultiHop(enabled, entryId, exitId) { return this.api.vpn?.setMultiHop ? this.api.vpn.setMultiHop(enabled, entryId, exitId) : Promise.resolve(); },
  setVpnRotatingIp(enabled, interval) { return this.api.vpn?.setRotatingIp ? this.api.vpn.setRotatingIp(enabled, interval) : Promise.resolve(); },
  rotateVpnIpNow() { return this.api.vpn?.rotateIpNow ? this.api.vpn.rotateIpNow() : Promise.resolve(null); },
  setVpnThreatProtection(enabled) { return this.api.vpn?.setThreatProtection ? this.api.vpn.setThreatProtection(enabled) : Promise.resolve(); },
  setVpnObfuscation(enabled) { return this.api.vpn?.setObfuscation ? this.api.vpn.setObfuscation(enabled) : Promise.resolve(); },
  setVpnTorOverVpn(enabled) { return this.api.vpn?.setTorOverVpn ? this.api.vpn.setTorOverVpn(enabled) : Promise.resolve(); },
  setVpnSplitTunnelMode(mode) { return this.api.vpn?.setSplitTunnelMode ? this.api.vpn.setSplitTunnelMode(mode) : Promise.resolve(); },
  addVpnOnlyDomain(dom) { return this.api.vpn?.addOnlyVpnDomain ? this.api.vpn.addOnlyVpnDomain(dom) : Promise.resolve([]); },
  removeVpnOnlyDomain(dom) { return this.api.vpn?.removeOnlyVpnDomain ? this.api.vpn.removeOnlyVpnDomain(dom) : Promise.resolve([]); },
  setVpnProtocol(proto) { return this.api.vpn?.setProtocol ? this.api.vpn.setProtocol(proto) : Promise.resolve(); }
};

