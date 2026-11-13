# Electron & Runtime Forensics Audit

**Target Application:** AMIYO Browser  
**Audit Date:** 2026-11-13  
**Audit Status:** Complete & Verified

---

## 1. Runtime Versions & Binaries
- **Electron Version:** `45.3.0`
- **Bundled Chromium Version:** `156.0.8078.96`
- **Internal Node.js Engine (Electron):** `24.22.2`
- **Host Development Node.js:** `v26.5.0`
- **V8 JavaScript Engine:** `15.6.75.50-electron.0`
- **ABI / Module Version:** `150`
- **N-API Version:** `10`
- **SQLite Engine:** `3.53.4`
- **ICU Internationalization:** `78.2`
- **Unicode Version:** `17.0`
- **Compression / Cryptography:** Brotli 1.2.0, Zstandard 1.6.0, zlib 1.3.2.1, nghttp2 1.70.0

---

## 2. View Hierarchy & Browser Implementation
- **View Mechanism:** `WebContentsView` (Chromium native view attached directly to `BaseWindow.contentView`).
- **Legacy Components Avoided:**
  - `BrowserView`: Deprecated in Electron >=30; completely removed in favor of `WebContentsView`.
  - `<webview>` tag: Avoided due to out-of-process frame tearing, memory bloat, and sandbox synchronization lag.
  - `<iframe>`: Avoided for web navigation to preserve cross-process site isolation and prevent same-origin policy leaks.
- **Process Topology:**
  - **Main Process (Node.js):** Coordinates window management, session partitions, native context menus, network request filtering, and atomic JSON persistence.
  - **Browser UI Renderer (Chromium):** Loads trusted shell (`src/index.html`) under `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`. Communicates strictly via `window.amiyoAPI`.
  - **Web Tab Renderers (Chromium WebContentsView):** Each tab runs in an isolated Chromium renderer process with zero Node.js access and no custom preload script injection.

---

## 3. Package Management & Build Infrastructure
- **Package Manager:** `npm` / `pnpm`
- **Packaging Tools:** `electron-builder` (x64 Windows, macOS, Linux targets) and custom portable packager `scripts/build-portable-windows.js`.
- **Native Addons:** Zero proprietary native C++ addons required; uses native Electron bindings, eliminating ABI incompatibility risks.
- **Executable Format:** Win32 x64 standalone binary (`AMIYO Browser.exe`).

---

## 4. Electron Security Fuses & Defaults
- **RunAsNode:** Disabled in production execution.
- **EnableEmbeddedAsarIntegrityValidation:** Enforced in production packaging.
- **OnlyLoadAppFromAsar:** Supported in release builds.
- **Sandbox:** Mandatory sandbox flag set to `true` on all browser window instances.
