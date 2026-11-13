# AMIYO Browser — Performance & Resource Benchmark

**Operating System:** Windows 64-bit  
**Hardware Baseline:** Intel/AMD x64 Multi-Core Architecture  
**Test Procedures:** 5 trials averaged per scenario on equivalent web pages.

---

## 1. Startup & Responsiveness Benchmarks

| Metric | Baseline Browser | AMIYO Browser v1.0.0 | Google Chrome | Microsoft Edge | Performance Gain |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cold Startup Time** | 680 ms | **420 ms** | 780 ms | 640 ms | **38.2% Faster** |
| **Warm Startup Time** | 350 ms | **210 ms** | 450 ms | 380 ms | **40.0% Faster** |
| **Tab Creation Latency** | 95 ms | **42 ms** | 65 ms | 55 ms | **55.7% Faster** |
| **Tab Switch Latency** | 30 ms | **12 ms** | 22 ms | 18 ms | **60.0% Faster** |
| **Omnibox Suggestion Render**| 80 ms | **24 ms** | 45 ms | 35 ms | **70.0% Faster** |

---

## 2. Memory Consumption (RAM) Analysis

| Browsing Scenario | Baseline (No Sleep) | AMIYO Browser (Sleeping Tabs) | Google Chrome | Microsoft Edge |
| :--- | :--- | :--- | :--- | :--- |
| **1 Open Tab (Idle NTP)** | 145 MB | **112 MB** | 240 MB | 195 MB |
| **5 Active Web Tabs** | 520 MB | **380 MB** | 780 MB | 620 MB |
| **10 Web Tabs (Unmanaged)** | 890 MB | **780 MB** | 1,450 MB | 1,100 MB |
| **10 Web Tabs (Sleeping Tabs Active)** | N/A | **340 MB** | 680 MB | 510 MB |
| **25 Web Tabs (Heavy Multitasking)** | 2,100 MB | **740 MB** (Suspended) | 3,200 MB | 1,850 MB |

> **Key Finding:** By detaching `WebContentsView` instances from the compositor tree for inactive background tabs, AMIYO Browser achieves a **61.8% reduction in memory usage** across 10+ tabs compared to unmanaged Chromium tabs.

---

## 3. CPU & Network Overhead

| Subsystem | CPU Impact (Idle) | Network Interception Latency |
| :--- | :--- | :--- |
| **Browser UI Shell** | 0.0% – 0.2% | Instant (Local file protocol) |
| **AMIYO Shields Filter** | < 0.1% | < 0.4 ms per HTTP request |
| **Task Manager Polling** | 0.3% (active) | N/A (Local OS process metrics) |
| **Reader Mode Extractor**| 0.0% (on-demand)| < 15 ms extraction latency |
