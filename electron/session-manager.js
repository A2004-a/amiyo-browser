const { session } = require('electron');
const dns = require('dns');
const downloadController = require('./download-controller');
const permissionController = require('./permission-controller');
const shieldsController = require('./shields-controller');

function prewarmDnsAndConnections(s) {
  const topHosts = [
    'google.com', 'www.google.com',
    'duckduckgo.com',
    'bing.com', 'www.bing.com',
    'github.com',
    'youtube.com', 'www.youtube.com',
    'wikipedia.org',
    'cloudflare.com'
  ];
  topHosts.forEach(host => {
    try {
      dns.lookup(host, { all: false }, () => {});
    } catch (e) {}
  });

  if (s && typeof s.preconnect === 'function') {
    try {
      s.preconnect({ url: 'https://www.google.com', numSockets: 2 });
      s.preconnect({ url: 'https://duckduckgo.com', numSockets: 2 });
    } catch (e) {}
  }
}

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

    setImmediate(() => {
      prewarmDnsAndConnections(s);
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

