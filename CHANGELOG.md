# Changelog

All notable changes to AETHER Browser will be documented in this file.

## [1.1.0] - 2026-11-15

### Added & Enhanced
- **Official Brand Artwork**: Transparent 3D illuminated **A** emblem across Desktop, Android, iOS, macOS, and Linux platforms.
- **AETHER Nexus Homepage**: Google Chrome-style New Tab page with customizable themes, search engine selector, shortcuts, and 3D visual mark.
- **Enhanced Incognito Mode**: Ephemeral non-persistent session partitions, strict history suppression, omnibox privacy filters, and private landing page.
- **Robust Shell Lifecycle**: Fixed debugger `NODE_OPTIONS` interception and `DOMContentLoaded` race conditions for instant startup.
- **Shields & Privacy Engine**: Ad and tracker blocker with Brave-style cosmetical filtering and cosmetic scriptlet injection.
- **Mobile Edition (Android)**: Full Android build with isolated Incognito mode, custom WebView client, and branding sync.

## [1.0.0] - 2026-11-11

### Initial Release
- **Architecture**: Multi-process Electron desktop browser powered by Chromium `WebContentsView`.
- **Tab Management**: Full tab lifecycle (create, close, reorder, duplicate, pin, audio mute, and restore).
- **Omnibox**: Intelligent search, URL detection, HTTPS auto-upgrade, and search engine integration (Google, Bing, DuckDuckGo, custom).
- **Navigation Controls**: Back, Forward, Reload, Stop, Home, and live loading progress track.
- **Bookmarks**: Bookmark bar and dedicated manager (`aether://bookmarks`) with JSON import/export.
- **History**: Grouped browsing history with search and granular time-range clearing.
- **Downloads**: Progress tracker with pause, resume, cancel, and reveal in folder.
- **Private Browsing**: Ephemeral in-memory partition (`Ctrl + Shift + N`).
- **Settings**: Comprehensive preferences for themes, search engines, startup behavior, and downloads.
- **Productivity**: Find in Page (`Ctrl + F`), Zoom controls, and custom context menu.

