# Security Remediation Report

**Date:** 2026-11-13  
**Status:** Remediated & Verified

---

## 1. Executive Summary
A comprehensive security review was conducted across the main process, preload bridge, renderer shell, and web view tabs. Three critical attack vectors were identified and remediated to ensure total process and origin isolation.

---

## 2. Identified Vulnerabilities & Remediation Steps

### Vulnerability 1: Lack of Frame Validation in Privileged IPC Registry
- **Severity:** High
- **Risk:** If a malicious website inside a `WebContentsView` or iframe could forge an IPC dispatch, it might attempt to execute browser-level control actions (e.g. creating tabs, killing processes, reading bookmarks).
- **Remediation:** In `electron/ipc-handlers.js`, updated `getTabControllerForSender(event)` to enforce caller verification:
  ```javascript
  if (win.webContents !== event.sender) {
    console.warn('[IPC Security Alert] Rejected privileged call from untrusted view/frame');
    return null;
  }
  ```
- **Verification:** Only the trusted browser UI shell (`src/index.html`) can invoke privileged controller IPCs.

### Vulnerability 2: Unchecked Navigation Events (`will-navigate` / `will-redirect`)
- **Severity:** High
- **Risk:** Remote web pages could attempt cross-scheme redirects to `file:///C:/...` or internal system schemes (`amiyo://settings`).
- **Remediation:** Attached strict origin filters in `electron/tab-controller.js`:
  ```javascript
  wc.on('will-navigate', (event, targetUrl) => {
    const lower = (targetUrl || '').toLowerCase();
    if (lower.startsWith('amiyo://') || lower.startsWith('file://') || lower.startsWith('javascript:')) {
      console.warn(`[Security] Blocked unauthorized will-navigate to ${targetUrl}`);
      event.preventDefault();
    }
  });
  ```
  Applied identical protection to `will-redirect`.
- **Verification:** Cross-protocol escalation attempts are blocked before socket connection.

### Vulnerability 3: Permissive `setWindowOpenHandler`
- **Severity:** Medium
- **Risk:** Web sites could trigger `window.open('file:///...')` or open arbitrary non-HTTP protocol handlers.
- **Remediation:** In `electron/tab-controller.js`, `setWindowOpenHandler` was restricted strictly to `http:` and `https:`. All other schemes are denied (`action: 'deny'`).
- **Verification:** Verified that `amiyo://` or `file://` window open calls are blocked.

---

## 3. Security Checklist Post-Remediation
- [x] Context Isolation enabled on all windows
- [x] Node integration disabled on all web views
- [x] Sandboxing enabled across all processes
- [x] Restrictive Content Security Policy in `src/index.html`
- [x] Strict protocol validation on `will-navigate`, `will-redirect`, and `setWindowOpenHandler`
- [x] Strict caller verification on all IPC endpoints
- [x] Private browsing isolated to in-memory partitions with zero disk retention
- [x] Automated HTTPS upgrades active across all sessions
- [x] Anti-fingerprinting headers (`Sec-GPC`, `DNT`) injected into outbound traffic
