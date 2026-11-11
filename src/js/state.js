const State = {
  tabs: [],
  activeTabId: null,
  settings: {},
  bookmarks: [],
  history: [],
  downloads: [],
  permissions: {},
  isMaximized: false,
  isPrivate: false,

  getActiveTab() {
    return this.tabs.find(t => t.id === this.activeTabId) || null;
  },

  updateTab(updatedTab) {
    const idx = this.tabs.findIndex(t => t.id === updatedTab.id);
    if (idx !== -1) {
      this.tabs[idx] = { ...this.tabs[idx], ...updatedTab };
    } else {
      this.tabs.push(updatedTab);
    }
  },

  setTabs(tabsList, activeId) {
    this.tabs = tabsList;
    if (activeId) {
      this.activeTabId = activeId;
    }
  }
};

