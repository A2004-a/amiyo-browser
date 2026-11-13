# AMIYO Browser — Comprehensive Security Audit

**Classification:** High-Assurance Desktop Browser Audit  
**Audit Status:** Certified & Verified

---

## 1. Process & Memory Isolation
- **Chromium Sandbox:** Enforced (`sandbox: true`). Renderer processes operate within restricted Windows AppContainer/Token boundaries.
- **Node.js Deprivation:** `nodeIntegration: false` enforced across all `WebContentsView` instances. Untrusted web content cannot access `fs`, `child_process`, `net`, or `electron`.
- **Preload Isolation:** Preload script runs exclusively in the trusted top-level browser window shell using `contextBridge`. No preload is attached to untrusted web content views.

---

## 2. Navigation & Origin Control
- **Navigation Scheme Whitelisting:** `will-navigate` blocks unvetted navigation attempts to `file://`, `amiyo://`, or `javascript:`.
- **Redirect Traversal Protection:** `will-redirect` guards against cross-scheme redirects aiming to read local files.
- **Window Open Containment:** `setWindowOpenHandler` denies arbitrary window spawns (`action: 'deny'`) and routes verified HTTP/HTTPS URLs into isolated browser tabs.

---

## 3. Privacy & Network Traffic Defenses
- **AMIYO Shields:** Synchronous network request interception cancelling known tracking beacons, telemetry domains, and advertising scripts.
- **Automatic HTTPS Upgrades:** Rewrites unencrypted `http://` requests to encrypted `https://` before socket transmission.
- **Anti-Fingerprinting:** Automatically injects `Sec-GPC: 1` (Global Privacy Control) and `DNT: 1` (Do Not Track) on all outbound requests.
- **Ephemeral Private Browsing:** Incognito sessions run in temporary memory partitions (`cache: false`). On window closure, all session storage, cookies, and indexedDB entries are erased.

---

## 4. Hardware & Feature Permissions
- **Device Access:** Camera, microphone, geolocation, and push notification access are denied by default via `session.setPermissionRequestHandler`.
- **Explicit Grants:** Only origins explicitly whitelisted by the user in Settings can access recording devices.
