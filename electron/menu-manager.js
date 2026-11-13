const { Menu, MenuItem, clipboard } = require('electron');

class MenuManager {
  setupAppMenu(windowManager) {
    const isMac = process.platform === 'darwin';

    const template = [
      ...(isMac ? [{
        label: 'AETHER Browser',
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      }] : []),
      {
        label: 'File',
        submenu: [
          {
            label: 'New Tab',
            accelerator: 'CmdOrCtrl+T',
            click: () => windowManager.handleAction('new-tab')
          },
          {
            label: 'New Window',
            accelerator: 'CmdOrCtrl+N',
            click: () => windowManager.createWindow(false)
          },
          {
            label: 'New Private Window',
            accelerator: 'CmdOrCtrl+Shift+N',
            click: () => windowManager.createWindow(true)
          },
          {
            label: 'Close Tab',
            accelerator: 'CmdOrCtrl+W',
            click: () => windowManager.handleAction('close-tab')
          },
          {
            label: 'Reopen Closed Tab',
            accelerator: 'CmdOrCtrl+Shift+T',
            click: () => windowManager.handleAction('restore-closed-tab')
          },
          { type: 'separator' },
          isMac ? { role: 'close' } : { role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Find in Page',
            accelerator: 'CmdOrCtrl+F',
            click: () => windowManager.handleAction('open-find-in-page')
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: () => windowManager.handleAction('reload')
          },
          {
            label: 'Force Reload',
            accelerator: 'CmdOrCtrl+Shift+R',
            click: () => windowManager.handleAction('force-reload')
          },
          { type: 'separator' },
          {
            label: 'Zoom In',
            accelerator: 'CmdOrCtrl+Plus',
            click: () => windowManager.handleAction('zoom-in')
          },
          {
            label: 'Zoom Out',
            accelerator: 'CmdOrCtrl+-',
            click: () => windowManager.handleAction('zoom-out')
          },
          {
            label: 'Reset Zoom',
            accelerator: 'CmdOrCtrl+0',
            click: () => windowManager.handleAction('zoom-reset')
          },
          { type: 'separator' },
          { role: 'togglefullscreen' },
          {
            label: 'Toggle Developer Tools',
            accelerator: 'CmdOrCtrl+Shift+I',
            click: (item, focusedWindow) => {
              if (focusedWindow) {
                focusedWindow.webContents.toggleDevTools();
              }
            }
          }
        ]
      },
      {
        label: 'History',
        submenu: [
          {
            label: 'Show Full History',
            accelerator: 'CmdOrCtrl+H',
            click: () => windowManager.handleAction('open-history')
          },
          {
            label: 'Back',
            accelerator: 'Alt+Left',
            click: () => windowManager.handleAction('go-back')
          },
          {
            label: 'Forward',
            accelerator: 'Alt+Right',
            click: () => windowManager.handleAction('go-forward')
          }
        ]
      },
      {
        label: 'Bookmarks',
        submenu: [
          {
            label: 'Bookmark Current Tab',
            accelerator: 'CmdOrCtrl+D',
            click: () => windowManager.handleAction('bookmark-current-tab')
          },
          {
            label: 'Show All Bookmarks',
            click: () => windowManager.handleAction('open-bookmarks')
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  showContextMenu(browserWindow, tabController, params) {
    const menu = new Menu();

    // Tab context menu (Chrome style)
    if (params.tabId) {
      const tab = tabController.getTab(params.tabId);
      const isPinned = tab?.isPinned;
      const isMuted = tab?.isMuted;

      menu.append(new MenuItem({
        label: 'New Tab to the Right',
        click: () => {
          const idx = tabController.tabs.findIndex(t => t.id === params.tabId);
          tabController.createTab('aether://newtab', { index: idx !== -1 ? idx + 1 : undefined, active: true });
        }
      }));
      menu.append(new MenuItem({
        label: 'Reload',
        accelerator: 'Ctrl+R',
        click: () => tabController.reload(params.tabId)
      }));
      menu.append(new MenuItem({
        label: 'Duplicate',
        click: () => tabController.duplicateTab(params.tabId)
      }));
      menu.append(new MenuItem({
        label: isPinned ? 'Unpin Tab' : 'Pin Tab',
        click: () => tabController.pinTab(params.tabId, !isPinned)
      }));
      menu.append(new MenuItem({
        label: isMuted ? 'Unmute Site' : 'Mute Site',
        click: () => tabController.muteTab(params.tabId, !isMuted)
      }));
      menu.append(new MenuItem({
        label: tabController.splitTabId === params.tabId ? '◫ Exit Split Screen' : '◫ View in Split Screen',
        click: () => {
          if (tabController.splitTabId === params.tabId) {
            tabController.closeSplitTab();
          } else {
            tabController.setSplitTab(params.tabId);
          }
        }
      }));

      // Sleeping Tab / Tab Suspension
      if (tab && !tab.isInternal && tab.id !== tabController.activeTabId) {
        menu.append(new MenuItem({
          label: tab.isSuspended ? '⚡ Wake Up Tab' : '💤 Put Tab to Sleep (Free Memory)',
          click: () => {
            if (tab.isSuspended) {
              tabController.resumeTab(params.tabId);
            } else {
              tabController.suspendTab(params.tabId);
            }
          }
        }));
      }

      // Tab Groups
      const groupsSubmenu = new Menu();
      groupsSubmenu.append(new MenuItem({
        label: 'New Group...',
        click: () => {
          browserWindow.webContents.send('trigger-create-tab-group', params.tabId);
        }
      }));

      const existingGroups = tabController.getGroups();
      if (existingGroups.length > 0) {
        groupsSubmenu.append(new MenuItem({ type: 'separator' }));
        existingGroups.forEach(grp => {
          groupsSubmenu.append(new MenuItem({
            label: grp.title,
            click: () => tabController.setTabGroup(params.tabId, grp.id)
          }));
        });
      }

      if (tab?.groupId) {
        groupsSubmenu.append(new MenuItem({ type: 'separator' }));
        groupsSubmenu.append(new MenuItem({
          label: 'Remove from Group',
          click: () => tabController.setTabGroup(params.tabId, null)
        }));
      }

      menu.append(new MenuItem({
        label: 'Tab Groups',
        submenu: groupsSubmenu
      }));

      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({
        label: 'Close Tab',
        accelerator: 'Ctrl+W',
        click: () => tabController.closeTab(params.tabId)
      }));
      menu.append(new MenuItem({
        label: 'Close Other Tabs',
        click: () => {
          const toClose = tabController.tabs.filter(t => t.id !== params.tabId);
          toClose.forEach(t => tabController.closeTab(t.id));
        }
      }));
      menu.append(new MenuItem({
        label: 'Close Tabs to the Right',
        click: () => {
          const idx = tabController.tabs.findIndex(t => t.id === params.tabId);
          if (idx !== -1) {
            const toClose = tabController.tabs.slice(idx + 1);
            toClose.forEach(t => tabController.closeTab(t.id));
          }
        }
      }));

      menu.popup({ window: browserWindow });
      return;
    }

    if (params.linkURL) {
      menu.append(new MenuItem({
        label: 'Open Link in New Tab',
        click: () => tabController.createTab(params.linkURL, { active: true })
      }));
      menu.append(new MenuItem({
        label: 'Copy Link Address',
        click: () => clipboard.writeText(params.linkURL)
      }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    if (params.srcURL && params.mediaType === 'image') {
      menu.append(new MenuItem({
        label: 'Open Image in New Tab',
        click: () => tabController.createTab(params.srcURL, { active: true })
      }));
      menu.append(new MenuItem({
        label: 'Copy Image Address',
        click: () => clipboard.writeText(params.srcURL)
      }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    if (params.selectionText) {
      menu.append(new MenuItem({
        label: '✨ Ask AETHER Intelligence about this',
        click: () => {
          browserWindow.webContents.send('ai:ask-selection', params.selectionText);
        }
      }));
      menu.append(new MenuItem({
        label: 'Copy',
        role: 'copy'
      }));
      menu.append(new MenuItem({
        label: `Search for "${params.selectionText.slice(0, 20)}..."`,
        click: () => tabController.createTab(params.selectionText, { active: true })
      }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    if (params.isEditable) {
      menu.append(new MenuItem({ role: 'undo' }));
      menu.append(new MenuItem({ role: 'redo' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'cut' }));
      menu.append(new MenuItem({ role: 'copy' }));
      menu.append(new MenuItem({ role: 'paste' }));
      menu.append(new MenuItem({ role: 'selectAll' }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    // AI Page Summary
    menu.append(new MenuItem({
      label: '✨ Summarize Page with AETHER Intelligence',
      click: () => {
        browserWindow.webContents.send('ai:trigger-summarize');
      }
    }));
    menu.append(new MenuItem({
      label: '📖 Open in Reader Mode',
      click: () => {
        browserWindow.webContents.send('trigger-reading-mode');
      }
    }));
    menu.append(new MenuItem({
      label: '📷 Capture Page (Screenshot)',
      accelerator: 'CmdOrCtrl+Shift+S',
      click: () => {
        browserWindow.webContents.send('trigger-web-capture');
      }
    }));
    menu.append(new MenuItem({ type: 'separator' }));

    // Navigation items
    menu.append(new MenuItem({
      label: 'Back',
      click: () => tabController.goBack(),
      enabled: tabController.getActiveTab()?.canGoBack || false
    }));
    menu.append(new MenuItem({
      label: 'Forward',
      click: () => tabController.goForward(),
      enabled: tabController.getActiveTab()?.canGoForward || false
    }));
    menu.append(new MenuItem({
      label: 'Reload',
      click: () => tabController.reload()
    }));

    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({
      label: 'Inspect Element',
      click: () => {
        const activeTab = tabController.getActiveTab();
        if (activeTab && activeTab.view) {
          activeTab.view.webContents.inspectElement(params.x, params.y);
        }
      }
    }));

    menu.popup({ window: browserWindow });
  }
}

module.exports = new MenuManager();

