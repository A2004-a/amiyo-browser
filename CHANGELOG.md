# Changelog

All notable changes to AMIYO Browser will be documented in this file.

## [1.0.0] - 2026-11-11

### Initial Release
- **Architecture**: Multi-process Electron desktop browser powered by Chromium `WebContentsView`.
- **Tab Management**: Full tab lifecycle (create, close, reorder, duplicate, pin, audio mute, and restore).
- **Omnibox**: Intelligent search, URL detection, HTTPS auto-upgrade, and search engine integration (Google, Bing, DuckDuckGo, custom).
- **Navigation Controls**: Back, Forward, Reload, Stop, Home, and live loading progress track.
- **Bookmarks**: Bookmark bar and dedicated manager (`amiyo://bookmarks`) with JSON import/export.
- **History**: Grouped browsing history with search and granular time-range clearing.
- **Downloads**: Progress tracker with pause, resume, cancel, and reveal in folder.
- **Private Browsing**: Ephemeral in-memory partition (`Ctrl + Shift + N`).
- **Settings**: Comprehensive preferences for themes, search engines, startup behavior, and downloads.
- **Productivity**: Find in Page (`Ctrl + F`), Zoom controls, and custom context menu.
