/**
 * AETHER Picture-in-Picture (PiP) Controller
 * Manages floating always-on-top video playback window with playback controls.
 */

const { BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

class PipController {
  constructor() {
    this.pipWindow = null;
    this.sourceTabId = null;
    this.sourceWebContents = null;
    this.isPlaying = false;
    this.isMuted = false;
  }

  async togglePip(tabCtrl, tabId) {
    if (this.pipWindow && !this.pipWindow.isDestroyed()) {
      this.closePip();
      return { active: false };
    }

    const tab = tabCtrl.getTab(tabId || tabCtrl.activeTabId);
    if (!tab || !tab.view || tab.isInternal) {
      return { active: false, error: 'No active web media found' };
    }

    const wc = tab.view.webContents;
    this.sourceTabId = tab.id;
    this.sourceWebContents = wc;

    // Probe if video element exists on page
    const videoInfo = await wc.executeJavaScript(`
      (() => {
        const video = document.querySelector('video');
        if (!video) return null;
        return {
          paused: video.paused,
          muted: video.muted,
          duration: video.duration || 0,
          currentTime: video.currentTime || 0,
          src: video.currentSrc || video.src || ''
        };
      })()
    `).catch(() => null);

    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    const pipW = 460;
    const pipH = 260;

    this.pipWindow = new BrowserWindow({
      width: pipW,
      height: pipH,
      x: screenWidth - pipW - 24,
      y: screenHeight - pipH - 24,
      alwaysOnTop: true,
      frame: false,
      resizable: true,
      skipTaskbar: false,
      title: 'AETHER Picture in Picture',
      backgroundColor: '#070A0E',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const pageTitle = (tab.title || 'Playing Video').replace(/"/g, '&quot;');
    const pageUrl = tab.url || '';

    const pipHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>AETHER PiP</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          body { background: #070A0E; color: #E2E8F0; width: 100vw; height: 100vh; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid rgba(53, 216, 242, 0.3); border-radius: 8px; }
          #titlebar { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(11, 15, 20, 0.85); -webkit-app-region: drag; }
          #title { font-size: 11px; font-weight: 600; color: #35D8F2; max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .window-actions { display: flex; gap: 6px; -webkit-app-region: no-drag; }
          .btn-icon { background: none; border: none; color: #94A3B8; cursor: pointer; padding: 2px 6px; font-size: 12px; border-radius: 4px; }
          .btn-icon:hover { color: #FFF; background: rgba(255,255,255,0.1); }
          #video-placeholder { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #64748B; font-size: 12px; }
          #video-placeholder svg { width: 36px; height: 36px; fill: #35D8F2; opacity: 0.8; }
          #controls { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 10px; background: rgba(11, 15, 20, 0.95); -webkit-app-region: no-drag; }
          .ctrl-btn { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); color: #E2E8F0; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s ease; }
          .ctrl-btn:hover { background: #35D8F2; color: #070A0E; border-color: #35D8F2; transform: scale(1.05); }
          .ctrl-btn.play-btn { width: 38px; height: 38px; background: #35D8F2; color: #070A0E; }
        </style>
      </head>
      <body>
        <div id="titlebar">
          <div id="title">${pageTitle}</div>
          <div class="window-actions">
            <button class="btn-icon" id="btn-return" title="Back to tab">↗</button>
            <button class="btn-icon" id="btn-close" title="Close">✕</button>
          </div>
        </div>
        <div id="video-placeholder">
          <svg viewBox="0 0 24 24"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z"/></svg>
          <span>Picture in Picture Mode Active</span>
        </div>
        <div id="controls">
          <button class="ctrl-btn" id="btn-rewind" title="Rewind 10s">⏪</button>
          <button class="ctrl-btn play-btn" id="btn-play" title="Play/Pause">⏯</button>
          <button class="ctrl-btn" id="btn-forward" title="Forward 10s">⏩</button>
          <button class="ctrl-btn" id="btn-mute" title="Toggle Mute">🔊</button>
        </div>
        <script>
          const { ipcRenderer } = require('electron');
          document.getElementById('btn-close').onclick = () => ipcRenderer.send('pip:action', 'close');
          document.getElementById('btn-return').onclick = () => ipcRenderer.send('pip:action', 'return');
          document.getElementById('btn-play').onclick = () => ipcRenderer.send('pip:action', 'toggle-play');
          document.getElementById('btn-rewind').onclick = () => ipcRenderer.send('pip:action', 'rewind');
          document.getElementById('btn-forward').onclick = () => ipcRenderer.send('pip:action', 'forward');
          document.getElementById('btn-mute').onclick = () => ipcRenderer.send('pip:action', 'toggle-mute');
        </script>
      </body>
      </html>
    `;

    this.pipWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(pipHtml)}`);

    this.pipWindow.on('closed', () => {
      this.pipWindow = null;
      this.sourceTabId = null;
      this.sourceWebContents = null;
    });

    return { active: true, title: tab.title };
  }

  handlePipAction(action, tabCtrl) {
    if (!this.sourceWebContents || this.sourceWebContents.isDestroyed()) {
      if (action === 'close') this.closePip();
      return;
    }

    const wc = this.sourceWebContents;

    switch (action) {
      case 'close':
        this.closePip();
        break;
      case 'return':
        if (tabCtrl && this.sourceTabId) {
          tabCtrl.switchTab(this.sourceTabId);
        }
        this.closePip();
        break;
      case 'toggle-play':
        wc.executeJavaScript(`
          (() => {
            const v = document.querySelector('video');
            if (v) { v.paused ? v.play() : v.pause(); }
          })()
        `).catch(() => {});
        break;
      case 'rewind':
        wc.executeJavaScript(`
          (() => {
            const v = document.querySelector('video');
            if (v) { v.currentTime = Math.max(0, v.currentTime - 10); }
          })()
        `).catch(() => {});
        break;
      case 'forward':
        wc.executeJavaScript(`
          (() => {
            const v = document.querySelector('video');
            if (v) { v.currentTime = Math.min(v.duration || v.currentTime + 10, v.currentTime + 10); }
          })()
        `).catch(() => {});
        break;
      case 'toggle-mute':
        wc.executeJavaScript(`
          (() => {
            const v = document.querySelector('video');
            if (v) { v.muted = !v.muted; }
          })()
        `).catch(() => {});
        break;
    }
  }

  closePip() {
    if (this.pipWindow && !this.pipWindow.isDestroyed()) {
      try {
        this.pipWindow.close();
      } catch (e) {}
    }
    this.pipWindow = null;
    this.sourceTabId = null;
    this.sourceWebContents = null;
  }
}

module.exports = new PipController();
