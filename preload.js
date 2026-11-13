const { contextBridge, ipcRenderer } = require('electron');

const validChannels = [
  'tabs-updated',
  'tab-updated',
  'tab-switched',
  'window-maximized-changed',
  'download-started',
  'download-progress',
  'download-completed',
  'download-failed',
  'found-in-page-result',
  'trigger-find-in-page',
  'trigger-bookmark-current'
];

contextBridge.exposeInMainWorld('amiyoAPI', {
  // --- Window ---
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    createNew: () => ipcRenderer.invoke('window:create-new'),
    createPrivate: () => ipcRenderer.invoke('window:create-private'),
    toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
    setTopOffset: (offset) => ipcRenderer.invoke('window:set-top-offset', offset),
    onMaximizedChanged: (callback) => {
      const listener = (event, val) => callback(val);
      ipcRenderer.on('window-maximized-changed', listener);
      return () => ipcRenderer.removeListener('window-maximized-changed', listener);
    }
  },

  // --- Tabs ---
  tabs: {
    create: (url, options) => ipcRenderer.invoke('tab:create', url, options),
    switch: (tabId) => ipcRenderer.invoke('tab:switch', tabId),
    close: (tabId) => ipcRenderer.invoke('tab:close', tabId),
    duplicate: (tabId) => ipcRenderer.invoke('tab:duplicate', tabId),
    pin: (tabId, isPinned) => ipcRenderer.invoke('tab:pin', tabId, isPinned),
    mute: (tabId, isMuted) => ipcRenderer.invoke('tab:mute', tabId, isMuted),
    reorder: (fromIndex, toIndex) => ipcRenderer.invoke('tab:reorder', fromIndex, toIndex),
    restore: () => ipcRenderer.invoke('tab:restore'),
    navigate: (tabId, url) => ipcRenderer.invoke('tab:navigate', tabId, url),
    list: () => ipcRenderer.invoke('tab:list'),
    onUpdated: (callback) => {
      const listener = (event, data) => callback(data);
      ipcRenderer.on('tab-updated', listener);
      return () => ipcRenderer.removeListener('tab-updated', listener);
    },
    onSwitched: (callback) => {
      const listener = (event, data) => callback(data);
      ipcRenderer.on('tab-switched', listener);
      return () => ipcRenderer.removeListener('tab-switched', listener);
    },
    onListUpdated: (callback) => {
      const listener = (event, data) => callback(data);
      ipcRenderer.on('tabs-updated', listener);
      return () => ipcRenderer.removeListener('tabs-updated', listener);
    }
  },

  // --- Navigation ---
  navigation: {
    back: (tabId) => ipcRenderer.invoke('nav:back', tabId),
    forward: (tabId) => ipcRenderer.invoke('nav:forward', tabId),
    reload: (tabId, ignoreCache) => ipcRenderer.invoke('nav:reload', tabId, ignoreCache),
    stop: (tabId) => ipcRenderer.invoke('nav:stop', tabId),
    getSuggestions: (query) => ipcRenderer.invoke('nav:suggestions', query),
    getSecurityStatus: (url) => ipcRenderer.invoke('nav:security-status', url)
  },

  // --- Bookmarks ---
  bookmarks: {
    get: () => ipcRenderer.invoke('bookmarks:get'),
    add: (item) => ipcRenderer.invoke('bookmarks:add', item),
    remove: (id) => ipcRenderer.invoke('bookmarks:remove', id),
    update: (id, updates) => ipcRenderer.invoke('bookmarks:update', id, updates),
    export: () => ipcRenderer.invoke('bookmarks:export'),
    import: (jsonString) => ipcRenderer.invoke('bookmarks:import', jsonString)
  },

  // --- History ---
  history: {
    get: () => ipcRenderer.invoke('history:get'),
    delete: (id) => ipcRenderer.invoke('history:delete', id),
    clear: (range) => ipcRenderer.invoke('history:clear', range)
  },

  // --- Downloads ---
  downloads: {
    get: () => ipcRenderer.invoke('downloads:get'),
    pause: (id) => ipcRenderer.invoke('downloads:pause', id),
    resume: (id) => ipcRenderer.invoke('downloads:resume', id),
    cancel: (id) => ipcRenderer.invoke('downloads:cancel', id),
    openFile: (savePath) => ipcRenderer.invoke('downloads:open-file', savePath),
    showInFolder: (savePath) => ipcRenderer.invoke('downloads:show-in-folder', savePath),
    clear: () => ipcRenderer.invoke('downloads:clear'),
    onStarted: (callback) => {
      const listener = (event, data) => callback(data);
      ipcRenderer.on('download-started', listener);
      return () => ipcRenderer.removeListener('download-started', listener);
    },
    onProgress: (callback) => {
      const listener = (event, data) => callback(data);
      ipcRenderer.on('download-progress', listener);
      return () => ipcRenderer.removeListener('download-progress', listener);
    },
    onCompleted: (callback) => {
      const listener = (event, data) => callback(data);
      ipcRenderer.on('download-completed', listener);
      return () => ipcRenderer.removeListener('download-completed', listener);
    }
  },

  // --- Settings ---
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (updates) => ipcRenderer.invoke('settings:save', updates),
    selectDownloadDir: () => ipcRenderer.invoke('settings:select-download-dir'),
    onUpdated: (callback) => {
      const listener = (event, data) => callback(data);
      ipcRenderer.on('settings-updated', listener);
      return () => ipcRenderer.removeListener('settings-updated', listener);
    }
  },

  // --- Permissions ---
  permissions: {
    get: () => ipcRenderer.invoke('permissions:get'),
    set: (origin, permission, allowed) => ipcRenderer.invoke('permissions:set', origin, permission, allowed)
  },

  // --- Find in Page ---
  find: {
    start: (tabId, text, options) => ipcRenderer.invoke('find:start', tabId, text, options),
    stop: (tabId, action) => ipcRenderer.invoke('find:stop', tabId, action),
    onResult: (callback) => {
      const listener = (event, data) => callback(data);
      ipcRenderer.on('found-in-page-result', listener);
      return () => ipcRenderer.removeListener('found-in-page-result', listener);
    }
  },

  // --- Zoom ---
  zoom: {
    set: (tabId, factor) => ipcRenderer.invoke('zoom:set', tabId, factor)
  },

  // --- Context Menu ---
  contextMenu: {
    show: (params) => ipcRenderer.invoke('context-menu:show', params)
  },

  // --- AI Assistant ---
  ai: {
    chat: (data) => ipcRenderer.invoke('ai:chat', data),
    summarize: (tabId) => ipcRenderer.invoke('ai:summarize', tabId),
    getPageContent: (tabId) => ipcRenderer.invoke('ai:get-page-content', tabId),
    setSideOffset: (offset) => ipcRenderer.invoke('window:set-side-offset', offset),
    onAskSelection: (callback) => {
      const listener = (event, text) => callback(text);
      ipcRenderer.on('ai:ask-selection', listener);
      return () => ipcRenderer.removeListener('ai:ask-selection', listener);
    },
    onTriggerSummarize: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('ai:trigger-summarize', listener);
      return () => ipcRenderer.removeListener('ai:trigger-summarize', listener);
    }
  },

  // --- Triggers ---
  triggers: {
    onFindInPage: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('trigger-find-in-page', listener);
      return () => ipcRenderer.removeListener('trigger-find-in-page', listener);
    },
    onBookmarkCurrent: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('trigger-bookmark-current', listener);
      return () => ipcRenderer.removeListener('trigger-bookmark-current', listener);
    }
  }
});

