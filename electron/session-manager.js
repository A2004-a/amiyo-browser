const { session } = require('electron');
const downloadController = require('./download-controller');
const permissionController = require('./permission-controller');
const shieldsController = require('./shields-controller');

class SessionManager {
  constructor() {
    this.privateSessions = new Map();
  }

  initDefaultSession() {
    const s = session.defaultSession;
    permissionController.setupSession(s);
    shieldsController.attachToSession(s);
    s.on('will-download', (event, item, webContents) => {
      downloadController.handleDownloadItem(event, item, webContents);
    });
    return s;
  }

  createPrivateSession(windowId) {
    const partitionName = `private-session-${windowId}-${Date.now()}`;
    const privSession = session.fromPartition(partitionName, { cache: false });
    permissionController.setupSession(privSession);
    shieldsController.attachToSession(privSession);
    privSession.on('will-download', (event, item, webContents) => {
      downloadController.handleDownloadItem(event, item, webContents);
    });
    this.privateSessions.set(windowId, privSession);
    return privSession;
  }

  destroyPrivateSession(windowId) {
    const privSession = this.privateSessions.get(windowId);
    if (privSession) {
      privSession.clearStorageData();
      this.privateSessions.delete(windowId);
    }
  }
}

module.exports = new SessionManager();

