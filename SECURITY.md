# Security Policy for AETHER Browser

## Security Architecture

AETHER Browser uses a multi-process architecture to enforce boundaries between web content and the local desktop:

- **Isolated Web Content**: External websites render exclusively inside isolated `WebContentsView` instances with `nodeIntegration: false` and `contextIsolation: true`.
- **Restricted IPC Bridge**: The renderer communicates with Electron's main process via a curated `preload.js` bridge (`contextBridge.exposeInMainWorld`). Direct Node.js access is never exposed to renderer contexts.
- **Local Storage Isolation**: Personal browsing data (history, bookmarks, settings, session data) is stored strictly on the local filesystem and is never transmitted to external servers.
- **Private Browsing Session**: Ephemeral windows run in isolated in-memory partitions. All cookies, caches, and storage are erased when the private window is closed.

## Reporting a Vulnerability

If you discover a security vulnerability in AETHER Browser, please do not file a public GitHub issue. Send a private vulnerability report detailing:

1. Type of vulnerability and affected component (Main, Renderer, or Preload).
2. Step-by-step reproduction instructions or proof-of-concept.
3. Impact assessment.

We review security disclosures promptly and provide patched releases.

