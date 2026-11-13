# AMIYO Browser — Existing Feature Inventory

| Subsystem | Feature Description | Trigger / Location | Architecture Implementation | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **Omnibox** | Unified Address & Search Bar | Top Navigation Bar | `Omnibox.js` + `NavigationController.js` | **PASS** |
| **Search Engine** | Search Provider Selection | Settings / Customize Modal | Dynamic URL query templates | **PASS** |
| **Tabs** | Dynamic Multi-Tabs | Tab Strip (`Ctrl+T`, `Ctrl+W`) | `WebContentsView` + `TabController.js` | **PASS** |
| **Tab Groups** | Color-Coded Tab Groups | Tab Context Menu / Strip | Group ID association & header badges | **PASS** |
| **Sleeping Tabs** | Memory Saver (Tab Suspension) | Inactive timeout / Context Menu | Detaches `WebContentsView` from view tree | **PASS** |
| **Vertical Tabs** | Left Vertical Tabs Dock | Header Toggle (`Ctrl+Shift+V`) | CSS Grid / Flex layout switch | **PASS** |
| **Split Screen** | 50/50 Dual Tab Browsing | Toolbar Button (`#split-screen-btn`)| Dual `WebContentsView` bounds allocation | **PASS** |
| **Tab Search** | Quick Tab Search Modal | Search Button (`Ctrl+Shift+P`) | Live fuzzy title and URL filtering | **PASS** |
| **Shields** | Ad & Tracker Blocker | Omnibox Shield Badge | `session.webRequest` domain rules | **PASS** |
| **HTTPS Upgrades** | Automatic Insecure Rewriting | Omnibox / Shields Engine | `onBeforeRequest` redirect to https | **PASS** |
| **Privacy Headers**| Anti-Fingerprinting (`Sec-GPC`, `DNT`) | All outbound web requests | `onBeforeSendHeaders` injection | **PASS** |
| **Reader Mode** | Distraction-Free Article View | Omnibox Book Icon (`Ctrl+Alt+R`)| In-memory DOM reader overlay | **PASS** |
| **Web Capture** | Viewport Screenshot Tool | Menu (`Ctrl+Shift+S`) | `webContents.capturePage()` to clipboard/PNG | **PASS** |
| **Task Manager** | Browser Process Monitor | Menu (`Shift+Esc`) | `app.getAppMetrics()` with PID & kill | **PASS** |
| **AI Assistant** | In-Browser AI Sidebar | Sparkle Button (`Ctrl+Shift+A`)| Gemini API, Ollama, & Local Heuristics | **PASS** |
| **Bookmarks Bar** | Quick Access Bookmarks Bar | Below Toolbar (`Ctrl+Shift+B`) | StorageManager atomic JSON | **PASS** |
| **History Manager**| Full Browsing History | Menu (`Ctrl+H`) | Search, filter by date, delete, clear all | **PASS** |
| **Downloads** | Download Tracking & Reveal | Toolbar Button (`Ctrl+J`) | Chromium `downloadItem` progress & speed | **PASS** |
| **Incognito Window**| Ephemeral Private Browsing | Menu (`Ctrl+Shift+N`) | In-memory `session.fromPartition` | **PASS** |
| **Find in Page** | Text Search Floating Bar | Shortcut (`Ctrl+F`) | Chromium native find-in-page API | **PASS** |
| **Zoom Controls** | Page Zoom In / Out / Reset | Omnibox Badge (`Ctrl+`, `Ctrl-`, `0`)| `webContents.setZoomFactor` | **PASS** |
| **Themes** | Dark, Light, & Custom Wallpapers| Settings / Customize Modal | CSS variables + localStorage persistence | **PASS** |
