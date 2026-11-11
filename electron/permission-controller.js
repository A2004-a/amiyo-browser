const storageManager = require('./storage-manager');

class PermissionController {
  setupSession(sessionInstance) {
    sessionInstance.setPermissionRequestHandler((webContents, permission, callback, details) => {
      const url = details.requestingUrl || webContents.getURL();
      let origin = '';
      try {
        origin = new URL(url).origin;
      } catch (e) {
        origin = url;
      }

      const permissions = storageManager.getPermissions();
      const originPerms = permissions[origin] || {};

      if (originPerms[permission] !== undefined) {
        return callback(originPerms[permission]);
      }

      // Default safe policies:
      // clipboard-read, fullscreen are allowed
      // camera, microphone, geolocation, notifications prompt or deny by default
      if (permission === 'clipboard-read' || permission === 'fullscreen') {
        return callback(true);
      }

      // Allow notifications and media if origin is trusted or ask
      callback(false);
    });

    sessionInstance.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
      const permissions = storageManager.getPermissions();
      const originPerms = permissions[requestingOrigin] || {};
      if (originPerms[permission] !== undefined) {
        return originPerms[permission];
      }
      if (permission === 'clipboard-read' || permission === 'fullscreen') {
        return true;
      }
      return false;
    });
  }

  getPermissions() {
    return storageManager.getPermissions();
  }

  setPermission(origin, permission, allowed) {
    return storageManager.setPermission(origin, permission, allowed);
  }
}

module.exports = new PermissionController();

