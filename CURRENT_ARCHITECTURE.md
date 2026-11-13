# AMIYO Browser — System Architecture Specification

## 1. Process & View Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MAIN PROCESS (Node.js 24.22)                          │
│                                                                             │
│  ┌─────────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │ WindowManager           │  │ SessionManager (Default & Incognito)     │  │
│  │ TabController           │  │ ShieldsController (Ad/Tracker Blocker)   │  │
│  │ NavigationController    │  │ PermissionController                     │  │
│  │ DownloadController      │  │ ReaderController & CaptureController     │  │
│  │ StorageManager (Atomic) │  │ AIController (Gemini / Ollama / Local)   │  │
│  └─────────────────────────┘  └──────────────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (IPC via Preload contextBridge)
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│ TRUSTED BROWSER UI RENDERER   │             │ UNTRUSTED WEB TABS (Per Tab)  │
│                               │             │                               │
│ - URL: src/index.html         │             │ - Native WebContentsView      │
│ - Sandbox: TRUE               │             │ - Sandbox: TRUE               │
│ - ContextIsolation: TRUE      │             │ - NodeIntegration: FALSE      │
│ - NodeIntegration: FALSE      │             │ - Preload: NONE               │
│ - Modules:                    │             │ - Navigation: will-navigate   │
│   • App & State               │             │   and will-redirect guarded   │
│   • Omnibox & Shields Popover │             │ - Popups: setWindowOpenHandler│
│   • TabManager (Groups/Sleep) │             │   restricted to HTTP/HTTPS    │
│   • AIPanel (Chat / Summary)  │             │                               │
│   • Settings & Themes         │             │                               │
└───────────────────────────────┘             └───────────────────────────────┘
```

---

## 2. Core Controller Specifications

### A. WindowManager (`electron/window-manager.js`)
- Manages window lifecycle, coordinates frame offsets, broadcasts events, and tracks private vs standard windows.
- Automatically persists window sessions and manages clean teardown.

### B. TabController (`electron/tab-controller.js`)
- Instantiates and controls Chromium `WebContentsView` instances.
- **Tab Suspension:** Detaches inactive views from the visual tree to release GPU memory and garbage-collect V8 heaps (`suspendTab(tabId)`).
- **Tab Groups:** Manages group metadata, custom colors, and child tab associations.
- **Split-Screen Dual View:** Allocates 50/50 dual view bounds side-by-side (`setSplitTab(tabId)`).
- **Navigation Safety:** Intercepts `will-navigate`, `will-redirect`, and `setWindowOpenHandler` to prevent cross-origin privilege escalation.

### C. ShieldsController (`electron/shields-controller.js`)
- Native ad and tracker blocking engine hooked into `session.webRequest`.
- Maintains 50+ domain rule sets and regex patterns.
- Upgrades insecure HTTP traffic to HTTPS automatically.
- Injects `Sec-GPC: 1` and `DNT: 1` anti-fingerprinting headers.
- Tracks per-tab blocked metrics for the omnibox shields badge.

### D. NavigationController (`electron/navigation-controller.js`)
- Resolves inputs into valid URLs or multi-engine search queries (Google, DuckDuckGo, Bing, Yahoo, Ecosia, or custom URL).
- Computes connection security classification (Secure, Insecure, Internal, Local File).
- Generates real-time omnibox search suggestions from history, bookmarks, and internal pages.

### E. StorageManager (`electron/storage-manager.js`)
- Atomic file transactions using temporary write-and-rename semantics (`data/*.json`).
- Prevents database corruption during unexpected process terminations.
- Maintains in-memory cache for sub-millisecond retrieval.

### F. AIController (`electron/ai-controller.js`)
- Provides in-browser conversational intelligence, page summarization, key points, and action items.
- Supports three backends:
  1. Built-in heuristic reasoning engine (100% offline).
  2. Google Gemini API (high-accuracy multimodal reasoning).
  3. Local Ollama HTTP endpoints (complete local privacy).

---

## 3. IPC Architecture & Security Protocol

All IPC communication flows through `preload.js` via `contextBridge.exposeInMainWorld`:

| Channel Category | Exposed API | Security Guard |
| :--- | :--- | :--- |
| **Window** | `amiyoAPI.window.*` | Sender validated to `win.webContents` |
| **Tabs** | `amiyoAPI.tabs.*` | Parameter validation + ID sanitization |
| **Shields** | `amiyoAPI.shields.*` | Tab isolation + domain normalization |
| **System** | `amiyoAPI.system.getTasks` | Reads live OS metrics via `app.getAppMetrics()` |
| **Capture** | `amiyoAPI.capture.*` | Internal buffer conversion; zero file path leak |
| **Reader** | `amiyoAPI.reader.extract` | In-memory text extraction; XSS sanitization |
| **Settings** | `amiyoAPI.settings.*` | Key allowlisting; atomic persistence |

