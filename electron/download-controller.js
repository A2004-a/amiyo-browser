const { shell } = require('electron');
const path = require('path');
const storageManager = require('./storage-manager');

class DownloadController {
  constructor() {
    this.activeDownloads = new Map(); // downloadId -> DownloadItem
    this.windowManager = null;
  }

  setWindowManager(winManager) {
    this.windowManager = winManager;
  }

  handleDownloadItem(event, item, webContents) {
    const downloadId = `dl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const filename = item.getFilename();
    const totalBytes = item.getTotalBytes();
    const startTime = Date.now();
    const savePath = item.getSavePath();

    const downloadRecord = {
      id: downloadId,
      filename,
      savePath,
      totalBytes,
      receivedBytes: 0,
      state: 'progressing',
      url: item.getURL(),
      startTime,
      speed: 0,
      percent: 0
    };

    this.activeDownloads.set(downloadId, item);
    storageManager.saveDownload(downloadRecord);
    this.notifyRenderer('download-started', downloadRecord);

    let lastBytes = 0;
    let lastTime = startTime;

    item.on('updated', (evt, state) => {
      const now = Date.now();
      const timeDiff = (now - lastTime) / 1000;
      const received = item.getReceivedBytes();
      let speed = 0;
      if (timeDiff > 0.5) {
        speed = (received - lastBytes) / timeDiff;
        lastBytes = received;
        lastTime = now;
      }

      const percent = totalBytes > 0 ? Math.round((received / totalBytes) * 100) : 0;

      downloadRecord.receivedBytes = received;
      downloadRecord.totalBytes = item.getTotalBytes();
      downloadRecord.state = state;
      downloadRecord.speed = speed;
      downloadRecord.percent = percent;
      downloadRecord.savePath = item.getSavePath();

      storageManager.saveDownload(downloadRecord);
      this.notifyRenderer('download-progress', downloadRecord);
    });

    item.once('done', (evt, state) => {
      this.activeDownloads.delete(downloadId);
      downloadRecord.state = state;
      downloadRecord.savePath = item.getSavePath();
      downloadRecord.receivedBytes = item.getReceivedBytes();
      downloadRecord.percent = 100;
      downloadRecord.speed = 0;
      downloadRecord.completedTime = Date.now();

      storageManager.saveDownload(downloadRecord);
      this.notifyRenderer('download-completed', downloadRecord);
    });
  }

  pauseDownload(id) {
    const item = this.activeDownloads.get(id);
    if (item && !item.isPaused() && item.canResume()) {
      item.pause();
      return true;
    }
    return false;
  }

  resumeDownload(id) {
    const item = this.activeDownloads.get(id);
    if (item && item.canResume()) {
      item.resume();
      return true;
    }
    return false;
  }

  cancelDownload(id) {
    const item = this.activeDownloads.get(id);
    if (item) {
      item.cancel();
      this.activeDownloads.delete(id);
      return true;
    }
    return false;
  }

  async openFile(filePath) {
    if (!filePath) return false;
    try {
      const res = await shell.openPath(filePath);
      return res === '';
    } catch (e) {
      console.error('Failed to open file:', e);
      return false;
    }
  }

  showInFolder(filePath) {
    if (!filePath) return false;
    try {
      shell.showItemInFolder(filePath);
      return true;
    } catch (e) {
      console.error('Failed to show in folder:', e);
      return false;
    }
  }

  notifyRenderer(channel, data) {
    if (this.windowManager) {
      this.windowManager.broadcast(channel, data);
    }
  }
}

module.exports = new DownloadController();

