const TabManager = {
  stripEl: null,
  draggedIndex: null,

  init() {
    this.stripEl = document.getElementById('tabs-strip');
    const newTabBtn = document.getElementById('new-tab-btn');

    if (newTabBtn) {
      newTabBtn.innerHTML = Utils.icons.plus;
      newTabBtn.addEventListener('click', () => {
        IpcClient.createTab('amiyo://newtab');
      });
    }

    // Tab strip drag over
    this.stripEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    this.stripEl.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetTab = e.target.closest('.browser-tab');
      if (targetTab && this.draggedIndex !== null) {
        const targetIndex = parseInt(targetTab.dataset.index, 10);
        if (targetIndex !== this.draggedIndex) {
          IpcClient.reorderTabs(this.draggedIndex, targetIndex);
        }
      }
      this.draggedIndex = null;
    });

    // Listen for tab updates from main process
    window.amiyoAPI.tabs.onListUpdated(({ tabs, activeTabId }) => {
      State.setTabs(tabs, activeTabId);
      this.render();
      Navigation.updateToolbar();
      Omnibox.update();
      App.handleInternalPage(State.getActiveTab());
    });

    if (window.amiyoAPI?.tabs?.onGroupsUpdated) {
      window.amiyoAPI.tabs.onGroupsUpdated((groups) => {
        State.tabGroups = groups || [];
        this.render();
      });
    }

    // Toggle Vertical Tabs button
    const verticalBtn = document.getElementById('toggle-vertical-tabs-btn');
    if (verticalBtn) {
      const isVertical = localStorage.getItem('amiyo_vertical_tabs') === 'true';
      if (isVertical) {
        document.getElementById('app')?.classList.add('vertical-tabs-mode');
        verticalBtn.classList.add('active');
      }
      verticalBtn.addEventListener('click', () => {
        const app = document.getElementById('app');
        const active = app.classList.toggle('vertical-tabs-mode');
        verticalBtn.classList.toggle('active', active);
        localStorage.setItem('amiyo_vertical_tabs', active ? 'true' : 'false');
      });
    }

    // Tab Search button
    const tabSearchBtn = document.getElementById('tab-search-btn');
    if (tabSearchBtn) {
      tabSearchBtn.addEventListener('click', () => {
        if (typeof App !== 'undefined' && App.openTabSearch) {
          App.openTabSearch();
        }
      });
    }

    window.amiyoAPI.tabs.onUpdated((tabData) => {
      State.updateTab(tabData);
      this.updateSingleTabElement(tabData);
      if (State.activeTabId === tabData.id) {
        Navigation.updateToolbar();
        Omnibox.update();
        App.handleInternalPage(tabData);
        if (typeof AiPanel !== 'undefined' && AiPanel.updateActivePageContext) {
          AiPanel.updateActivePageContext();
        }
      }
    });

    window.amiyoAPI.tabs.onSwitched(({ activeTabId, tab }) => {
      State.activeTabId = activeTabId;
      State.updateTab(tab);
      this.render();
      Navigation.updateToolbar();
      Omnibox.update();
      App.handleInternalPage(tab);
      if (typeof AiPanel !== 'undefined' && AiPanel.updateActivePageContext) {
        AiPanel.updateActivePageContext();
      }
    });
  },

  render() {
    if (!this.stripEl) return;
    this.stripEl.innerHTML = '';

    State.tabs.forEach((tab, index) => {
      const tabEl = document.createElement('div');
      tabEl.className = `browser-tab ${tab.id === State.activeTabId ? 'active' : ''} ${tab.isPinned ? 'pinned' : ''} ${tab.isSuspended ? 'suspended' : ''}`;
      tabEl.dataset.tabId = tab.id;
      tabEl.dataset.index = index;
      tabEl.draggable = true;

      // Group styling
      if (tab.groupId && State.tabGroups) {
        const grp = State.tabGroups.find(g => g.id === tab.groupId);
        if (grp) {
          tabEl.dataset.groupColor = grp.color;
          tabEl.style.setProperty('--tab-group-color', grp.color);
        }
      }

      // Favicon or Spinner
      let iconHtml = '';
      if (tab.isLoading) {
        iconHtml = `<div class="tab-spinner"></div>`;
      } else if (tab.favicon) {
        iconHtml = `<div class="tab-favicon"><img src="${Utils.escapeHtml(tab.favicon)}" onerror="this.onerror=null; this.style.display='none';" /></div>`;
      } else {
        iconHtml = `<div class="tab-favicon">${Utils.icons.globe}</div>`;
      }

      // Audio indicator
      let audioHtml = '';
      if (tab.isMuted) {
        audioHtml = `<button class="tab-audio-btn muted" title="Unmute tab">${Utils.icons.audioMuted}</button>`;
      } else if (tab.isPlayingAudio) {
        audioHtml = `<button class="tab-audio-btn playing" title="Mute tab">${Utils.icons.audio}</button>`;
      }

      const sleepBadge = tab.isSuspended ? `<span class="tab-sleep-badge" title="Sleeping tab (Memory Saved)">💤</span>` : '';

      tabEl.innerHTML = `
        ${iconHtml}
        <span class="tab-title">${Utils.escapeHtml(tab.title || 'New Tab')}</span>
        ${sleepBadge}
        ${audioHtml}
        <button class="tab-close-btn" title="Close tab">${Utils.icons.close}</button>
      `;

      // Event handlers
      tabEl.addEventListener('click', (e) => {
        if (!e.target.closest('.tab-close-btn') && !e.target.closest('.tab-audio-btn')) {
          IpcClient.switchTab(tab.id);
        }
      });

      // Middle click to close
      tabEl.addEventListener('auxclick', (e) => {
        if (e.button === 1) { // Middle click
          e.preventDefault();
          IpcClient.closeTab(tab.id);
        }
      });

      // Close button
      const closeBtn = tabEl.querySelector('.tab-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          IpcClient.closeTab(tab.id);
        });
      }

      // Audio button
      const audioBtn = tabEl.querySelector('.tab-audio-btn');
      if (audioBtn) {
        audioBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          IpcClient.muteTab(tab.id, !tab.isMuted);
        });
      }

      // Context menu for tab (duplicate, pin, mute, close)
      tabEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        IpcClient.showContextMenu({
          tabId: tab.id,
          x: e.clientX,
          y: e.clientY
        });
      });

      // Drag & Drop
      tabEl.addEventListener('dragstart', (e) => {
        this.draggedIndex = index;
        e.dataTransfer.effectAllowed = 'move';
        tabEl.style.opacity = '0.4';
      });

      tabEl.addEventListener('dragend', () => {
        tabEl.style.opacity = '1';
        this.draggedIndex = null;
      });

      this.stripEl.appendChild(tabEl);
    });
  },

  updateSingleTabElement(tab) {
    const tabEl = this.stripEl?.querySelector(`[data-tab-id="${tab.id}"]`);
    if (!tabEl) return;

    const titleEl = tabEl.querySelector('.tab-title');
    if (titleEl && tab.title) {
      titleEl.textContent = tab.title;
    }

    if (tab.id === State.activeTabId && !tab.isInternal) {
      document.title = `${tab.title || 'AMIYO Browser'} - AMIYO Browser`;
    }
  }
};

