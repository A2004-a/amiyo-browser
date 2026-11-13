# AMIYO Browser — Security Baseline Audit

## 1. Process & Sandbox Boundary Analysis

```
┌────────────────────────────────────────────────────────┐
│ Host Operating System: Windows 64-bit                  │
│ Chromium Sandbox: ENABLED                              │
│ Node.js Integration in Web Content: DISABLED           │
│ Context Isolation: ENFORCED                            │
└────────────────────────────────────────────────────────┘
```

### Security Directives Audited
| Directive | Value | Purpose | Status |
| :--- | :--- | :--- | :--- |
| `contextIsolation` | `true` | Separates renderer scripts from preload scripts | **PASS** |
| `nodeIntegration` | `false` | Completely blocks web access to `require()`, `process`, and `Buffer` | **PASS** |
| `sandbox` | `true` | Restricts OS-level system calls using Chromium sandboxing | **PASS** |
| `webSecurity` | `true` | Enforces Same-Origin Policy (SOP) and CORS | **PASS** |
| `allowRunningInsecureContent` | `false` | Disallows loading insecure HTTP resources on HTTPS pages | **PASS** |

---

## 2. Navigation & Origin Protection

### A. Navigation Guardrails (`will-navigate` & `will-redirect`)
- **Threat:** Malicious web pages redirecting to privileged `file://` URIs or internal `amiyo://` administrative settings.
- **Mitigation:** Strict protocol validation intercepting `will-navigate` and `will-redirect`. Attempts to navigate to `file:`, `amiyo:`, or `javascript:` from remote tabs are blocked immediately.

### B. Popup & New Window Security (`setWindowOpenHandler`)
- **Threat:** Phishing attacks and popup clickjacking opening unauthorized local filesystem links.
- **Mitigation:** All window opens are denied by default (`action: 'deny'`) and validated. Only valid `http:` and `https:` targets are spawned into controlled new tabs.

### C. Permission Controller
- **Threat:** Silent hardware access (webcam, microphone, location) without user authorization.
- **Mitigation:** Explicit `setPermissionRequestHandler` and `setPermissionCheckHandler` blocks sensitive device requests by default unless explicitly granted.

---

## 3. Session & Storage Security

### A. Incognito / Private Session Isolation
- Ephemeral session partition: `session.fromPartition('private-session-${id}')`.
- `cache: false` ensures zero disk caching.
- On window closure, `clearStorageData()` clears cookies, cache, storage, and indexedDB entirely.

### B. Anti-Tracking & Network Security
- Automatic HTTPS upgrades on all unencrypted web traffic.
- Active blocking of 50+ known tracking and telemetry networks.
- Injection of `Sec-GPC: 1` (Global Privacy Control) and `DNT: 1` (Do Not Track) on every request.

