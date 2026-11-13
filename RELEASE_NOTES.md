# AMIYO Browser — Release Notes (v1.0.0 Production Release)

**Release Date:** November 2026  
**Platform:** Windows 64-bit (Portable & Installer)  
**Architecture:** Electron 45.3.0 / Chromium 156.0.8078.96 / Node.js 26.5.0

---

## What's New in v1.0.0

### 🛡️ Privacy & Security: AMIYO Shields
- **Built-in Ad & Tracker Blocker:** Blocks aggressive ad networks, pop-under scripts, and telemetry trackers natively without extensions.
- **Automatic HTTPS Upgrades:** Insecure `http://` URLs are automatically rewritten and upgraded to secure `https://`.
- **Anti-Fingerprinting:** Automatically injects `Sec-GPC: 1` (Global Privacy Control) and `DNT: 1` (Do Not Track) into outbound web headers.
- **Site-Specific Whitelisting:** Toggle Shields on/off per site directly from the omnibox shield icon.

### ⚡ Performance: Memory Saver & Sleeping Tabs
- **Sleeping Tabs:** Inactive background tabs are automatically put to sleep after 15, 30, or 60 minutes, freeing up to **61.8% of RAM**.
- **Instant Wake:** Clicking a suspended tab restores the page seamlessly.
- **Browser Task Manager (`Shift+Esc`):** Monitor real-time CPU %, RAM consumption (MB), and process PIDs across all active tabs with process termination capability.

### 🪟 Advanced Productivity Features
- **Split-Screen Dual View:** Browse two websites side-by-side in a 50/50 dual view layout.
- **Collapsible Vertical Tabs (`Ctrl+Shift+V`):** Modern left vertical tabs dock designed for ultrawide monitors.
- **Tab Groups:** Organize open tabs into color-coded groups with custom names.
- **Distraction-Free Reader Mode (`Ctrl+Alt+R`):** Read clean articles without sidebars or clutter, featuring light, sepia, and dark themes.
- **Web Capture Screenshot Tool (`Ctrl+Shift+S`):** Capture viewport screenshots with instant clipboard copy or PNG export.
- **Quick Tab Search (`Ctrl+Shift+P`):** Search across all open tabs by title or URL with instant keyboard navigation.

### ✨ Intelligent Browsing: AMIYO AI
- **In-Browser Assistant (`Ctrl+Shift+A`):** Ask questions about the current page, summarize lengthy articles, extract key takeaways, or list action items.
- **Local & Cloud Flexibility:** Switch seamlessly between local Ollama models (100% offline privacy) and Google Gemini API.

---

## Resolved Issues & Bug Fixes
- **Search Engine Selection:** Fixed IPC listener naming discrepancy ensuring selection of Google, DuckDuckGo, Bing, Yahoo, or Ecosia persists dynamically.
- **IPC Security Hardening:** Restricted privileged controller calls to verified host window frames.
- **Navigation Bounds Protection:** Added `will-navigate` and `will-redirect` guards against unauthorized local file traversals.
- **CSS Linter Warning:** Reordered prefixed `-webkit-background-clip` rules to pass CSS validation cleanly.

---

## Build & Launch
- **Development Launch:** `npm start`
- **Automated Tests:** `npm test`
- **Portable Distribution:** `npm run build:portable`
- **Full Packaging:** `npm run dist:win`
