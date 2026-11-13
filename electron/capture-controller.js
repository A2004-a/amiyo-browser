/**
 * AMIYO Capture Controller — Full & Viewport Web Capture and Screenshot Tool.
 */

const { dialog, clipboard, nativeImage } = require('electron');
const fs = require('fs');

class CaptureController {
  async captureViewport(webContents) {
    if (!webContents || webContents.isDestroyed()) {
      return { success: false, error: 'WebContents unavailable' };
    }

    try {
      const image = await webContents.capturePage();
      const pngBuffer = image.toPNG();
      const dataUrl = image.toDataURL();

      return {
        success: true,
        dataUrl,
        size: image.getSize(),
        buffer: pngBuffer
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async copyToClipboard(webContents) {
    if (!webContents || webContents.isDestroyed()) return false;
    try {
      const image = await webContents.capturePage();
      clipboard.writeImage(image);
      return true;
    } catch (e) {
      return false;
    }
  }

  async saveToFile(browserWindow, webContents, defaultFilename = 'amiyo-capture.png') {
    if (!webContents || webContents.isDestroyed()) return false;
    try {
      const image = await webContents.capturePage();
      const { canceled, filePath } = await dialog.showSaveDialog(browserWindow, {
        title: 'Save Screenshot',
        defaultPath: defaultFilename,
        filters: [
          { name: 'PNG Image', extensions: ['png'] },
          { name: 'JPEG Image', extensions: ['jpg', 'jpeg'] }
        ]
      });

      if (canceled || !filePath) return false;

      const buffer = filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')
        ? image.toJPEG(90)
        : image.toPNG();

      fs.writeFileSync(filePath, buffer);
      return true;
    } catch (e) {
      return false;
    }
  }
}

module.exports = new CaptureController();
