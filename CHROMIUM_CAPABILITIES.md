# Chromium Capabilities & Upstream Boundaries

**Engine:** Chromium 156.0.8078.96 (Blink / V8)  
**Host Architecture:** Electron 45.3.0

---

## 1. Supported Native Chromium Capabilities

### A. Rendering & View Composition
- **Multi-View Bounds Allocation:** Native Chromium compositor supports multiple `WebContentsView` children inside a single `contentView`. Enables:
  - 50/50 Dual Split-Screen browsing without iframe encapsulation.
  - Multi-tab view bounds dynamic resizing on window resize.
  - Memory saver detachment: Detaching view from the view tree drops the GPU swapchain and draw surface immediately.
- **Hardware Acceleration:** Full GPU rasterization, WebGL 2.0, WebGPU (Dawn/Graphite), and Direct3D 11/12 on Windows.

### B. Network Stack & Interception
- **WebRequest API:** Synchronous and asynchronous interception of all HTTP/HTTPS requests at:
  - `onBeforeRequest`: Intercepts URLs before socket connection. Used for ad/tracker blocking and automatic `http://` -> `https://` upgrades.
  - `onBeforeSendHeaders`: Modifies outbound request headers. Used to inject `Sec-GPC: 1` and `DNT: 1`, and strip tracking referrers.
  - `onHeadersReceived`: Audits response headers for security and Content Security Policy enforcement.
- **Protocol Handlers:** Native support for `http:`, `https:`, `data:`, `file:`, `blob:`, and custom `amiyo:` protocol schemes.

### C. Web Content Isolation & Sandboxing
- **Site Isolation:** Out-of-process iframes and distinct origin renderers are enforced by Chromium's security sandbox.
- **Permission Requests:** Fine-grained delegate handlers for camera, microphone, geolocation, clipboard, and notifications.
- **Find-In-Page:** Low-level text search API with match ordinal highlighting and selection bounding rectangles.

---

## 2. Upstream Limitations & Technical Boundaries

### A. Chrome Web Store Extensions (Manifest V3 CRX3)
- **Constraint:** Google Chrome Web Store extensions require Google's proprietary extension service worker bindings, private Chrome APIs (`chrome.management`, `chrome.declarativeNetRequest`, etc.), and Web Store installation handshakes.
- **Technical Boundary:** Electron supports basic unpacked extensions via `session.loadExtension()`, but full automatic installation and syncing from the Chrome Web Store is unsupported upstream by Electron without custom Chromium forks.
- **Architectural Solution:** Instead of relying on third-party extensions, all critical browser capabilities (Ad/tracker blocking, Reader mode, Screenshot capture, Tab groups, Split-screen, AI assistant) were built natively into the core browser codebase.

### B. Chromium Sync Engine (Google Account Sync)
- **Constraint:** Chromium's built-in Google Account Sync relies on private Google API keys and proprietary Google OAuth endpoints restricted exclusively to official Google Chrome builds.
- **Architectural Solution:** Local atomic JSON storage (`data/bookmarks.json`, `data/history.json`, `data/settings.json`) ensures zero reliance on third-party cloud infrastructure.

