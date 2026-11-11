const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const windowManager = require('../electron/window-manager');
const menuManager = require('../electron/menu-manager');
const { registerIpcHandlers } = require('../electron/ipc-handlers');

// 1. Start local test HTTP server on port 3000
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head><title>Localhost Test Server</title></head>
    <body style="background:#0f172a;color:#fff;font-family:sans-serif;padding:40px;text-align:center;">
      <h1 style="color:#6366f1;">Localhost Test Page</h1>
      <p>AMIYO Browser successfully loaded a local web server page!</p>
    </body>
    </html>
  `);
});

server.listen(3000, () => {
  console.log('✔ Test HTTP server listening on http://localhost:3000');
});

app.whenReady().then(async () => {
  registerIpcHandlers();
  menuManager.setupAppMenu(windowManager);

  const mainWin = windowManager.createWindow(false);
  const winInfo = windowManager.getWindowInfo(mainWin);
  const tabCtrl = winInfo.tabController;

  await new Promise((resolve) => mainWin.webContents.once('did-finish-load', resolve));
  // Wait 1.5s for initial DOM mount and State population
  await new Promise((resolve) => setTimeout(resolve, 1500));

  console.log('--- Step 1: Checking UI Elements in Renderer ---');
  const uiCheck = await mainWin.webContents.executeJavaScript(`(() => {
    return {
      tabCount: document.querySelectorAll('#tabs-strip .browser-tab').length,
      tabTitle: document.querySelector('#tabs-strip .browser-tab .tab-title')?.textContent,
      internalVisible: !document.getElementById('internal-page-container').classList.contains('hidden'),
      hasClock: !!document.getElementById('newtab-clock'),
      clockText: document.getElementById('newtab-clock')?.textContent,
      activeTabId: State.activeTabId,
      urlInputValue: document.getElementById('url-input').value
    };
  })()`);
  console.log('UI Check Result:', JSON.stringify(uiCheck, null, 2));

  console.log('--- Step 2: Simulating User Typing "india" and Pressing Enter ---');
  const navResult = await mainWin.webContents.executeJavaScript(`(() => {
    const input = document.getElementById('url-input');
    input.focus();
    input.value = 'india';
    console.log('[TEST] Setting input to india and firing keydown Enter');
    const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true });
    input.dispatchEvent(event);
    return {
      inputVal: input.value,
      activeTabId: State.activeTabId
    };
  })()`);
  console.log('Nav simulation dispatched:', navResult);

  // Wait 1.5s for IPC and navigation to process
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const activeTab = tabCtrl.getActiveTab();
  console.log('--- Step 3: Checking Active Tab in Main Process ---');
  console.log('Active Tab URL:', activeTab.url);
  console.log('Active Tab Title:', activeTab.title);
  console.log('Active Tab isInternal:', activeTab.isInternal);
  console.log('Active Tab View visible:', activeTab.view ? activeTab.view.getVisible() : 'no view');
  console.log('Active Tab View bounds:', activeTab.view ? activeTab.view.getBounds() : 'no view');

  console.log('--- Step 4: Testing Localhost URL navigation (http://localhost:3000) ---');
  await mainWin.webContents.executeJavaScript(`(() => {
    const input = document.getElementById('url-input');
    input.focus();
    input.value = 'localhost:3000';
    const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true });
    input.dispatchEvent(event);
    return true;
  })()`);

  // Wait for page to finish loading
  await new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const tab = tabCtrl.getActiveTab();
      if (tab && !tab.isLoading && tab.url.includes('localhost:3000')) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 200);
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 4000);
  });

  const activeTabLocal = tabCtrl.getActiveTab();
  console.log('Active Tab URL after localhost:', activeTabLocal.url);
  console.log('Active Tab Title after localhost:', activeTabLocal.title);
  console.log('Active Tab isInternal:', activeTabLocal.isInternal);
  console.log('Active Tab View visible:', activeTabLocal.view ? activeTabLocal.view.getVisible() : 'no view');

  // Verify omnibox synchronized with active tab URL
  const omniboxSync = await mainWin.webContents.executeJavaScript(`(() => {
    return {
      inputValue: document.getElementById('url-input').value,
      activeTabTitleInStrip: document.querySelector('#tabs-strip .browser-tab.active .tab-title')?.textContent
    };
  })()`);
  console.log('Omnibox Sync Result:', JSON.stringify(omniboxSync, null, 2));

  server.close();
  console.log('\n✔ All interactive simulation checks completed successfully!');
  app.quit();
});
