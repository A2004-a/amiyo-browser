# AETHER Browser — Brand Identity Guidelines

## 1. Brand Vision & Positioning
**AETHER Browser** is a premium, next-generation desktop browser designed for professionals, developers, researchers, and power users who demand speed, security, and intelligence.

- **Primary Slogan:** *Explore Without Limits.*
- **Sub-slogans:**
  - *The Next Frontier of Browsing.*
  - *Beyond Ordinary Browsing.*
  - *Intelligence Meets Exploration.*
- **Zero-Cloning Policy:** Strictly original visual identity and naming. No imitations of Chrome, Brave, Edge, Firefox, Safari, or Opera.

---

## 2. Logo Mark: "The Infinite A"
The AETHER emblem is a geometric monogram combining:
1. **The Infinite A**: Precision beveled facets in Platinum Silver (`#DCE3EB`).
2. **Horizon Cut Beam**: Electric Cyan (`#35D8F2`) apex horizon laser representing forward innovation.
3. **Orbital Glow Curve**: An elliptical orbit angled at -15° representing limitless digital navigation.

### Logo Assets Directory (`assets/branding/`)
- `icon.svg` — Primary app icon (square platter, orbit beam, beveled Infinite A).
- `logo.svg` — Primary horizontal lockup (Infinite A + Space Grotesk AETHER wordmark + "EXPLORE WITHOUT LIMITS").
- `logo-dark.svg` — High-contrast mark optimized for obsidian dark backgrounds (`#0B0F14`).
- `logo-light.svg` — Mark optimized for light surfaces (`#FFFFFF`).
- `logo-monochrome.svg` — Single-color silhouette for printing and high-contrast accessibility.
- `favicon.svg` — 32x32 optimized favicon vector.

---

## 3. Official Color Palette & Design Tokens
Defined in `src/styles/variables.css`:

| Token Name | Hex Code | Role | Description |
|---|---|---|---|
| **Obsidian Black** | `#0B0F14` | Primary Surface / Canvas | Deepest dark background, eliminating eye fatigue |
| **Midnight Navy** | `#121B2B` | Secondary Surface | Toolbars, tab bar container, dialog panels |
| **Graphite** | `#252D38` | Structural / Borders | High-definition subtle outlines and inactive tab backgrounds |
| **Platinum Silver** | `#DCE3EB` | Primary Typography | Clean, crisp, high-legibility readability |
| **Electric Cyan** | `#35D8F2` | Primary Accent / Interaction | Active states, focus rings, progress indicators, shield badges |
| **Arctic Blue** | `#7AAEFF` | Secondary Accent | AI cognition badges, highlights, links |

---

## 4. Subsystem Naming Architecture
Every browser subsystem carries a dedicated AETHER signature identity:

- **AETHER Core / Nexus**: Browser foundation, New Tab Page, and central control hub.
- **AETHER Shield**: Zero-telemetry privacy engine blocking ads, trackers, and fingerprinting with HTTPS upgrade enforcement.
- **AETHER Intelligence**: Integrated AI assistant with page summarization, question answering, and prompt routing.
- **AETHER Spaces / Orbit**: Workspaces, tab groups, and vertical tabs.
- **AETHER Pulse / Flux**: Real-time performance, memory saver, and task manager.
- **AETHER Vault**: End-to-end encrypted local storage for bookmarks, history, and credentials.
- **AETHER Prism**: Distraction-free reader view, web capture, and lens search.

---

## 5. Search Engine Architecture
AETHER Browser supports instant, dynamic switching between major privacy and search providers:
- **Google** (`https://www.google.com/search?q=%s`)
- **DuckDuckGo** (`https://duckduckgo.com/?q=%s`)
- **Bing** (`https://www.bing.com/search?q=%s`)
- **Yahoo** (`https://search.yahoo.com/search?p=%s`)
- **Ecosia** (`https://www.ecosia.org/search?q=%s`)
- **Custom Search Provider** (`https://...%s`)

Direct bang shortcuts supported in the address bar:
- `!g <query>` → Instant Google search
- `!d <query>` → Instant DuckDuckGo search
- `!b <query>` → Instant Bing search
- `!w <query>` → Instant Wikipedia search
- `!y <query>` → Instant YouTube search
- `!e <query>` → Instant Ecosia search

