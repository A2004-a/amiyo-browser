# 🍏 AETHER Browser for iOS (iPhone & iPad)

Welcome to **AETHER Browser for iOS**, the mobile companion to AETHER Browser desktop, delivering blazing performance, native WebKit speed, and built-in privacy protection.

---

## 📲 Installation Options

### Option 1: Progressive Web App (Instant Setup — No App Store Needed)

You can run AETHER Browser directly on any iPhone or iPad as a standalone full-screen web app:

1. Open Safari on your iPhone or iPad.
2. Navigate to your hosted AETHER instance or local server (`http://<your-ip>:3000`).
3. Tap the **Share** button (the square with an arrow pointing up at the bottom of the screen).
4. Scroll down and tap **Add to Home Screen**.
5. Tap **Add** in the top-right corner.
6. Launch **AETHER** directly from your iOS Home Screen — it will run in full-screen standalone mode without Safari address bars!

---

### Option 2: Native iOS App (Xcode / AltStore / TestFlight)

The `ios/AetherBrowser` directory contains the native Swift WKWebView application:

1. **Open in Xcode**:
   ```bash
   cd ios/AetherBrowser
   open .
   ```
2. **Build and Run**:
   - Select your connected iPhone or iPad (or iOS Simulator).
   - Sign with your free Apple Developer ID in **Signing & Capabilities**.
   - Press **Cmd + R** to install and run.

3. **Sideloading (AltStore / Sideloadly)**:
   - Archive the app into an `.ipa` file.
   - Sideload onto any non-jailbroken iOS device using [AltStore](https://altstore.io/) or [Sideloadly](https://sideloadly.io/).

---

## 🛡️ iOS Features
- **Fast WKWebView Engine**: Native iOS rendering with JIT-accelerated JavaScript.
- **Privacy & Shields**: Pre-configured with DuckDuckGo default anti-tracking search and Sec-GPC headers.
- **Obsidian Dark Theme**: Pure `#0B0F14` dark palette matching AETHER desktop.
- **Adaptive Layout**: Optimized for Dynamic Island, Notch, and iPad split-screen multitasking.

