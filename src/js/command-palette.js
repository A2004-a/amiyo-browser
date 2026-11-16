/**
 * AETHER Universal Command Palette (Arc / Raycast-style)
 * Instant fuzzy action launcher & tab switcher invoked with Ctrl+K / Cmd+K
 */

const CommandPalette = {
  isOpen: false,
  selectedIndex: 0,
  filteredCommands: [],

  init() {
    // Global keyboard shortcut: Ctrl+K or Cmd+K
    window.addEventListener('keydown', (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggle();
      }
    });
  },

  getAllCommands() {
    const list = [
      { id: 'new-tab', title: 'New Tab', category: 'Tabs', icon: '📄', shortcut: 'Ctrl+T', run: () => IpcClient.createTab('aether://newtab') },
      { id: 'new-window', title: 'New Window', category: 'Window', icon: '🪟', shortcut: 'Ctrl+N', run: () => IpcClient.createNewWindow() },
      { id: 'new-private', title: 'New Private / Incognito Window', category: 'Window', icon: '🕶️', shortcut: 'Ctrl+Shift+N', run: () => IpcClient.createPrivate() },
      { id: 'reading-list', title: 'Open Reading List (Read Later)', category: 'Tools', icon: '📖', run: () => App.openReadingList() },
      { id: 'passwords', title: 'Open Passwords Vault & Generator', category: 'Security', icon: '🔑', run: () => App.openPasswordsVault() },
      { id: 'bookmarks', title: 'Open Bookmarks Vault', category: 'Navigation', icon: '⭐', shortcut: 'Ctrl+Shift+O', run: () => IpcClient.createTab('aether://bookmarks') },
      { id: 'history', title: 'Open History Vault', category: 'Navigation', icon: '🕒', shortcut: 'Ctrl+H', run: () => IpcClient.createTab('aether://history') },
      { id: 'downloads', title: 'Open Downloads Manager', category: 'Navigation', icon: '📥', shortcut: 'Ctrl+J', run: () => IpcClient.createTab('aether://downloads') },
      { id: 'settings', title: 'Open Browser Settings', category: 'Navigation', icon: '⚙️', run: () => IpcClient.createTab('aether://settings') },
      { id: 'web-capture', title: 'AETHER Prism Web Capture (Screenshot)', category: 'Tools', icon: '📸', shortcut: 'Ctrl+Shift+S', run: () => App.openWebCapture() },
      { id: 'split-screen', title: 'Toggle Split Screen Dual View', category: 'View', icon: '🪟', run: () => App.toggleSplitScreen() },
      { id: 'reader-mode', title: 'Toggle Distraction-Free Reader Mode', category: 'View', icon: '📖', shortcut: 'Ctrl+Alt+R', run: () => App.toggleReaderMode(State.activeTabId) },
      { id: 'read-aloud', title: 'Edge Read Aloud (Speech Synthesizer)', category: 'Accessibility', icon: '🔊', shortcut: 'Ctrl+Shift+U', run: () => SpeechEngine.togglePlayPause() },
      { id: 'ai-panel', title: 'AETHER Intelligence Side Panel', category: 'AI', icon: '✨', shortcut: 'Ctrl+Shift+A', run: () => AiPanel.toggle() },
      { id: 'quick-notes', title: 'AETHER Keep Notes & Checklists', category: 'Tools', icon: '💡', shortcut: 'Ctrl+Alt+N', run: () => App.toggleQuickNotes() },
      { id: 'task-manager', title: 'AETHER Pulse Task Manager (CPU & RAM)', category: 'System', icon: '⚡', shortcut: 'Shift+Esc', run: () => App.openTaskManager() },
      { id: 'eyedropper', title: 'Eyedropper / Screen Color Picker', category: 'Tools', icon: '🎨', run: () => App.openEyedropper() },
      { id: 'diagnostics', title: 'Network Latency & Connectivity Diagnostics', category: 'System', icon: '🌐', run: () => App.openNetworkDiagnostics() },
      { id: 'shortcuts', title: 'Keyboard Shortcuts Cheatsheet', category: 'Help', icon: '⌨️', shortcut: 'Ctrl+/', run: () => App.openKeyboardShortcuts() },
      { id: 'clear-data', title: 'Clear Browsing Data (Cache & Cookies)', category: 'Privacy', icon: '🧹', shortcut: 'Ctrl+Shift+Del', run: () => App.showClearBrowsingDataDialog() },
      { id: 'theme-dark', title: 'Switch Theme: Obsidian Dark', category: 'Appearance', icon: '🌙', run: () => ThemeManager.setTheme('dark') },
      { id: 'theme-light', title: 'Switch Theme: Modern Light', category: 'Appearance', icon: '☀️', run: () => ThemeManager.setTheme('light') },
      { id: 'theme-cyan', title: 'Switch Theme: AETHER Cyan', category: 'Appearance', icon: '⚡', run: () => ThemeManager.setTheme('cyan') }
    ];

    // Add open tabs dynamically
    (State.tabs || []).forEach(tab => {
      list.push({
        id: `tab-${tab.id}`,
        title: `Switch to Tab: ${tab.title || tab.url || 'Untitled'}`,
        category: 'Open Tabs',
        icon: '📑',
        url: tab.url,
        run: () => IpcClient.switchTab(tab.id)
      });
    });

    return list;
  },

  toggle(forceOpen = null) {
    this.isOpen = forceOpen !== null ? forceOpen : !this.isOpen;
    if (this.isOpen) {
      this.render();
    } else {
      this.close();
    }
  },

  close() {
    this.isOpen = false;
    const el = document.getElementById('command-palette-backdrop');
    if (el) el.remove();
  },

  render() {
    this.close();
    this.isOpen = true;
    this.selectedIndex = 0;

    const backdrop = document.createElement('div');
    backdrop.id = 'command-palette-backdrop';
    backdrop.className = 'command-palette-backdrop';

    backdrop.innerHTML = `
      <div class="command-palette-modal">
        <div class="command-palette-search-wrap">
          <span class="cp-search-icon">🔍</span>
          <input type="text" id="cp-search-input" class="command-palette-input" placeholder="Type a command or search tabs... (Esc to close)" autocomplete="off" />
          <kbd class="cp-esc-pill">Esc</kbd>
        </div>
        <div class="command-palette-list" id="cp-results-list"></div>
        <div class="command-palette-footer">
          <span><strong>↑↓</strong> to navigate</span>
          <span><strong>Enter</strong> to select</span>
          <span><strong>Esc</strong> to dismiss</span>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const input = backdrop.querySelector('#cp-search-input');
    const listEl = backdrop.querySelector('#cp-results-list');

    const updateList = (query = '') => {
      const q = query.toLowerCase().trim();
      const all = this.getAllCommands();
      this.filteredCommands = all.filter(c => 
        c.title.toLowerCase().includes(q) || 
        c.category.toLowerCase().includes(q) ||
        (c.url && c.url.toLowerCase().includes(q))
      );

      if (this.selectedIndex >= this.filteredCommands.length) {
        this.selectedIndex = Math.max(0, this.filteredCommands.length - 1);
      }

      if (this.filteredCommands.length === 0) {
        listEl.innerHTML = `<div class="cp-empty">No matching commands or tabs found.</div>`;
        return;
      }

      listEl.innerHTML = this.filteredCommands.map((cmd, idx) => `
        <div class="cp-item ${idx === this.selectedIndex ? 'selected' : ''}" data-idx="${idx}">
          <div class="cp-item-left">
            <span class="cp-item-icon">${cmd.icon}</span>
            <span class="cp-item-title">${Utils.escapeHtml(cmd.title)}</span>
          </div>
          <div class="cp-item-right">
            ${cmd.shortcut ? `<kbd class="cp-shortcut">${cmd.shortcut}</kbd>` : ''}
            <span class="cp-category-badge">${cmd.category}</span>
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('.cp-item').forEach(itemEl => {
        itemEl.addEventListener('click', () => {
          const idx = parseInt(itemEl.dataset.idx, 10);
          this.executeCommand(idx);
        });
      });

      const selectedEl = listEl.querySelector('.cp-item.selected');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    };

    updateList('');
    input.focus();

    input.addEventListener('input', (e) => {
      this.selectedIndex = 0;
      updateList(e.target.value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.filteredCommands.length > 0) {
          this.selectedIndex = (this.selectedIndex + 1) % this.filteredCommands.length;
          updateList(input.value);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.filteredCommands.length > 0) {
          this.selectedIndex = (this.selectedIndex - 1 + this.filteredCommands.length) % this.filteredCommands.length;
          updateList(input.value);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.executeCommand(this.selectedIndex);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this.close();
      }
    });
  },

  executeCommand(index) {
    const cmd = this.filteredCommands[index];
    if (cmd && typeof cmd.run === 'function') {
      this.close();
      try {
        cmd.run();
      } catch (err) {
        console.error('Command execution error:', err);
      }
    }
  }
};

if (typeof window !== 'undefined') {
  window.CommandPalette = CommandPalette;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CommandPalette;
}
