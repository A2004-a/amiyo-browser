const KeyboardShortcuts = {
  init() {
    window.addEventListener('keydown', (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Ctrl + T: New Tab
      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        IpcClient.createTab('amiyo://newtab');
        return;
      }

      // Ctrl + Shift + T: Restore Closed Tab
      if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        IpcClient.restoreTab();
        return;
      }

      // Ctrl + W: Close Active Tab
      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (State.activeTabId) {
          IpcClient.closeTab(State.activeTabId);
        }
        return;
      }

      // Ctrl + L: Focus Address Bar
      if (isCtrlOrCmd && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        const urlInput = document.getElementById('url-input');
        if (urlInput) {
          urlInput.focus();
          urlInput.select();
        }
        return;
      }

      // Ctrl + R: Reload
      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        IpcClient.reload(State.activeTabId, false);
        return;
      }

      // Ctrl + Shift + R: Force Reload
      if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        IpcClient.reload(State.activeTabId, true);
        return;
      }

      // Alt + Left: Back
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        IpcClient.goBack(State.activeTabId);
        return;
      }

      // Alt + Right: Forward
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        IpcClient.goForward(State.activeTabId);
        return;
      }

      // Ctrl + D: Bookmark
      if (isCtrlOrCmd && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        Omnibox.toggleBookmarkCurrentTab();
        return;
      }

      // Ctrl + H: History
      if (isCtrlOrCmd && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        IpcClient.createTab('amiyo://history');
        return;
      }

      // Ctrl + J: Downloads
      if (isCtrlOrCmd && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        IpcClient.createTab('amiyo://downloads');
        return;
      }

      // Ctrl + F: Find in page
      if (isCtrlOrCmd && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        App.toggleFindBar();
        return;
      }

      // Ctrl + Plus / = : Zoom in
      if (isCtrlOrCmd && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        const tab = State.getActiveTab();
        if (tab) {
          IpcClient.setZoom(tab.id, (tab.zoomFactor || 1) + 0.1);
        }
        return;
      }

      // Ctrl + - : Zoom out
      if (isCtrlOrCmd && e.key === '-') {
        e.preventDefault();
        const tab = State.getActiveTab();
        if (tab) {
          IpcClient.setZoom(tab.id, (tab.zoomFactor || 1) - 0.1);
        }
        return;
      }

      // Ctrl + 0 : Reset Zoom
      if (isCtrlOrCmd && e.key === '0') {
        e.preventDefault();
        const tab = State.getActiveTab();
        if (tab) {
          IpcClient.setZoom(tab.id, 1.0);
        }
        return;
      }

      // Ctrl + Tab: Next Tab
      if (isCtrlOrCmd && !e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        this.cycleTab(1);
        return;
      }

      // Ctrl + Shift + Tab: Previous Tab
      if (isCtrlOrCmd && e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        this.cycleTab(-1);
        return;
      }

      // Ctrl + 1-8: Switch to Tab 1-8
      if (isCtrlOrCmd && e.key >= '1' && e.key <= '8') {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        if (State.tabs[idx]) {
          IpcClient.switchTab(State.tabs[idx].id);
        }
        return;
      }

      // Ctrl + 9: Switch to Last Tab
      if (isCtrlOrCmd && e.key === '9') {
        e.preventDefault();
        if (State.tabs.length > 0) {
          IpcClient.switchTab(State.tabs[State.tabs.length - 1].id);
        }
        return;
      }

      // Ctrl + N: New Window
      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        IpcClient.createNewWindow();
        return;
      }

      // Ctrl + Shift + N: Private Window
      if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        IpcClient.createPrivate();
        return;
      }

      // F11: Fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        IpcClient.toggleFullscreen();
        return;
      }
    });

    // Listen for main process triggers
    window.amiyoAPI.triggers.onFindInPage(() => {
      App.toggleFindBar();
    });

    window.amiyoAPI.triggers.onBookmarkCurrent(() => {
      Omnibox.toggleBookmarkCurrentTab();
    });
  },

  cycleTab(direction) {
    if (State.tabs.length <= 1) return;
    const currentIdx = State.tabs.findIndex(t => t.id === State.activeTabId);
    if (currentIdx === -1) return;

    let nextIdx = currentIdx + direction;
    if (nextIdx >= State.tabs.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = State.tabs.length - 1;

    IpcClient.switchTab(State.tabs[nextIdx].id);
  }
};

