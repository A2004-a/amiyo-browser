# AMIYO Browser — Known Issues & Technical Limitations

**Current Version:** 1.0.0  
**Last Updated:** November 2026

---

## 1. Upstream Engine Limitations

### A. Chrome Web Store Extensions (CRX3)
- **Status:** Technically Unsupported by Upstream Electron.
- **Description:** Google Chrome Web Store extensions require Google's proprietary extension service worker bindings and private Chrome APIs (`chrome.management`, `chrome.declarativeNetRequest`, etc.). Electron does not include the Chrome Web Store client runtime.
- **Mitigation:** High-value browser utilities (Ad/tracker blocking, Reader mode, Screenshot capture, Tab groups, Split-screen, AI assistant) have been built directly into the browser core.

### B. Widevine DRM for Encrypted Media (Netflix, Spotify Web)
- **Status:** Requires Google Widevine CDM Binary Licensing.
- **Description:** Encrypted video streaming platforms (Netflix, Disney+, Spotify Web) require Google Widevine CDM binaries and a signed VMP (Verified Media Path) certificate from Google.
- **Mitigation:** Standard HTML5 video/audio playback (YouTube, Vimeo, WebM, MP4, MP3, AAC, FLAC, Opus) operates with full hardware acceleration.

### C. Cross-Device Cloud Account Sync
- **Status:** Missing External Backend Service.
- **Description:** Synchronizing bookmarks and settings across separate physical computers requires a hosted backend database and user authentication service.
- **Mitigation:** All data is stored in human-readable, atomic JSON files in the `data/` folder, enabling easy backup and migration.
