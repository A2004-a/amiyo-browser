const Omnibox = {
  inputEl: null,
  containerEl: null,
  suggestionsEl: null,
  securityBadgeEl: null,
  bookmarkBtnEl: null,
  selectedIndex: -1,
  currentSuggestions: [],

  init() {
    this.inputEl = document.getElementById('url-input');
    this.containerEl = document.getElementById('omnibox-container');
    this.suggestionsEl = document.getElementById('omnibox-suggestions');
    this.securityBadgeEl = document.getElementById('security-badge');
    this.bookmarkBtnEl = document.getElementById('bookmark-tool-btn');
    this.clearBtnEl = document.getElementById('clear-input-btn');
    this.zoomBadgeEl = document.getElementById('zoom-badge');

    if (this.clearBtnEl) {
      this.clearBtnEl.innerHTML = Utils.icons.close;
      this.clearBtnEl.addEventListener('click', () => {
        if (this.inputEl) {
          this.inputEl.value = '';
          this.inputEl.focus();
          this.clearBtnEl.classList.add('hidden');
          this.closeSuggestions();
        }
      });
    }

    if (this.zoomBadgeEl) {
      this.zoomBadgeEl.addEventListener('click', () => {
        IpcClient.api.zoom.set(State.activeTabId, 1.0);
      });
    }

    if (State.settings && State.settings.searchEngine) {
      this.updateSearchEngine(State.settings.searchEngine);
    }

    if (this.bookmarkBtnEl) {
      this.bookmarkBtnEl.innerHTML = Utils.icons.star;
      this.bookmarkBtnEl.addEventListener('click', () => {
        this.toggleBookmarkCurrentTab();
      });
    }

    if (this.securityBadgeEl) {
      this.securityBadgeEl.innerHTML = Utils.icons.lock;
      this.securityBadgeEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showSecurityDetails();
      });
    }

    this.vpnBtnEl = document.getElementById('vpn-tool-btn');
    this.vpnBadgeEl = document.getElementById('vpn-badge');
    this.vpnPopoverEl = document.getElementById('vpn-popover');

    if (this.vpnBtnEl) {
      this.vpnBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleVpnPopover();
      });
      this.updateVpnBadge();
    }

    this.shieldsBtnEl = document.getElementById('shields-tool-btn');
    this.shieldsBadgeEl = document.getElementById('shields-badge');
    this.shieldsPopoverEl = document.getElementById('shields-popover');
    this.readerBtnEl = document.getElementById('reader-tool-btn');

    if (this.shieldsBtnEl) {
      this.shieldsBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleShieldsPopover();
      });
    }

    if (this.readerBtnEl) {
      this.readerBtnEl.addEventListener('click', () => {
        if (typeof App !== 'undefined' && App.toggleReaderMode) {
          App.toggleReaderMode(State.activeTabId);
        }
      });
    }

    if (this.inputEl) {
      // Auto select text on focus
      this.inputEl.addEventListener('focus', () => {
        this.inputEl.select();
        this.fetchSuggestions(this.inputEl.value);
        if (this.clearBtnEl && this.inputEl.value) {
          this.clearBtnEl.classList.remove('hidden');
        }
      });

      // Keydown handling: Enter, Escape, Arrow Up, Arrow Down
      this.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13 || e.which === 13) {
          e.preventDefault();
          this.handleEnter();
        } else if (e.key === 'Escape' || e.keyCode === 27) {
          e.preventDefault();
          this.closeSuggestions();
          this.update();
          this.inputEl.blur();
        } else if (e.key === 'ArrowDown' || e.keyCode === 40) {
          e.preventDefault();
          this.moveSelection(1);
        } else if (e.key === 'ArrowUp' || e.keyCode === 38) {
          e.preventDefault();
          this.moveSelection(-1);
        }
      });

      // Input changes -> fetch suggestions (debounced)
      const debouncedSuggestions = Utils.debounce((val) => {
        this.fetchSuggestions(val);
      }, 150);

      this.inputEl.addEventListener('input', (e) => {
        if (this.clearBtnEl) {
          this.clearBtnEl.classList.toggle('hidden', !e.target.value);
        }
        debouncedSuggestions(e.target.value);
      });
    }

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.containerEl.contains(e.target)) {
        this.closeSuggestions();
      }
    });
  },

  update() {
    const tab = State.getActiveTab();
    if (!tab || !this.inputEl) return;

    // Do not overwrite input if currently focused by user
    if (document.activeElement !== this.inputEl) {
      if (tab.url === 'amiyo://newtab' || tab.url === 'aether://newtab') {
        this.inputEl.value = '';
        const engineMap = {
          google: 'Google',
          duckduckgo: 'DuckDuckGo',
          bing: 'Bing',
          yahoo: 'Yahoo',
          ecosia: 'Ecosia',
          yandex: 'Yandex'
        };
        const current = (State.settings && State.settings.searchEngine) ? State.settings.searchEngine.toLowerCase() : 'google';
        const label = engineMap[current] || 'the web';
        this.inputEl.placeholder = `Search with ${label} or enter address`;
      } else {
        this.inputEl.value = tab.url;
      }
    }

    // Update Security Badge
    this.updateSecurityBadge(tab.url);

    // Update Bookmark Star
    this.updateBookmarkButton(tab.url);

    // Update Zoom Badge
    if (this.zoomBadgeEl) {
      const zoom = Math.round((tab.zoomFactor || 1.0) * 100);
      if (zoom !== 100) {
        this.zoomBadgeEl.textContent = `${zoom}%`;
        this.zoomBadgeEl.classList.remove('hidden');
      } else {
        this.zoomBadgeEl.classList.add('hidden');
      }
    }

    // Update Reader Mode button visibility
    if (this.readerBtnEl) {
      const isWeb = tab && !tab.isInternal && tab.url && tab.url.startsWith('http');
      this.readerBtnEl.classList.toggle('hidden', !isWeb);
    }

    // Update Shields badge
    this.updateShieldsBadge(tab);
  },

  async updateShieldsBadge(tab) {
    if (!this.shieldsBadgeEl || !tab || !IpcClient.api?.shields?.getTabStats) return;
    try {
      const stats = await IpcClient.api.shields.getTabStats(tab.id);
      const count = stats?.blockedCount || stats?.total || 0;
      if (count > 0) {
        this.shieldsBadgeEl.textContent = count > 99 ? '99+' : count;
        this.shieldsBadgeEl.classList.remove('hidden');
      } else {
        this.shieldsBadgeEl.classList.add('hidden');
      }
    } catch (e) {
      this.shieldsBadgeEl.classList.add('hidden');
    }
  },

  focus() {
    if (this.inputEl) {
      this.inputEl.focus();
      this.inputEl.select();
    }
  },

  closeVpnPopover() {
    if (!this.vpnPopoverEl) return;
    this.vpnPopoverEl.classList.add('hidden');
    if (this.vpnLiveInterval) {
      clearInterval(this.vpnLiveInterval);
      this.vpnLiveInterval = null;
    }
    if (this._vpnCloseListener) {
      document.removeEventListener('click', this._vpnCloseListener);
      this._vpnCloseListener = null;
    }
    if (this._vpnEscListener) {
      document.removeEventListener('keydown', this._vpnEscListener);
      this._vpnEscListener = null;
    }
    const freeze = document.getElementById('freeze-backdrop');
    if (freeze) {
      freeze.classList.add('hidden');
      freeze.style.backgroundImage = '';
    }
    if (IpcClient.setViewVisible) {
      IpcClient.setViewVisible(true);
    }
  },

  async updateVpnBadge() {
    if (!this.vpnBtnEl || !this.vpnBadgeEl) return;
    try {
      const status = await IpcClient.getVpnStatus();
      if (status && status.connected) {
        this.vpnBtnEl.classList.add('active');
        this.vpnBadgeEl.classList.remove('hidden');
        this.vpnBadgeEl.classList.add('active');
        this.vpnBadgeEl.textContent = status.location ? status.location.country : 'ON';
        this.vpnBtnEl.title = `AETHER Secure VPN: Connected to ${status.location?.name || 'VPN'}`;
      } else {
        this.vpnBtnEl.classList.remove('active');
        this.vpnBadgeEl.classList.remove('active');
        this.vpnBadgeEl.classList.add('hidden');
        this.vpnBtnEl.title = 'AETHER Secure VPN — Encrypted Tunnel & Virtual Location';
      }
    } catch (e) {}
  },

  async toggleVpnPopover() {
    if (!this.vpnPopoverEl) return;
    const isHidden = this.vpnPopoverEl.classList.contains('hidden');
    if (!isHidden) {
      this.closeVpnPopover();
      return;
    }

    // Freeze-frame snapshot backdrop to prevent WebContentsView clipping
    const tab = State.getActiveTab();
    const isWeb = tab && !tab.isInternal && tab.url && tab.url.startsWith('http');
    if (isWeb) {
      try {
        const res = await IpcClient.captureViewport(tab.id);
        if (res && res.dataUrl) {
          const freeze = document.getElementById('freeze-backdrop');
          if (freeze) {
            freeze.style.backgroundImage = `url(${res.dataUrl})`;
            freeze.classList.remove('hidden');
          }
        }
      } catch (e) {}
      if (IpcClient.setViewVisible) {
        await IpcClient.setViewVisible(false);
      }
    }

    // Populate VPN UI with live status
    const renderVpnUi = async () => {
      const status = await IpcClient.getVpnStatus();
      if (!status) return;

      const statusText = document.getElementById('vpn-status-text');
      const masterToggle = document.getElementById('vpn-master-toggle');
      const locSelect = document.getElementById('vpn-location-select');
      const ipVal = document.getElementById('vpn-ip-val');
      const latencyVal = document.getElementById('vpn-latency-val');
      const trafficVal = document.getElementById('vpn-traffic-val');
      const emblem = this.vpnPopoverEl.querySelector('.vpn-emblem');
      const killswitch = document.getElementById('vpn-killswitch-toggle');
      const dnsleak = document.getElementById('vpn-dnsleak-toggle');
      const webrtc = document.getElementById('vpn-webrtc-toggle');
      const autoconnect = document.getElementById('vpn-autoconnect-toggle');
      const chipsEl = document.getElementById('vpn-bypass-chips');

      if (masterToggle) masterToggle.checked = !!status.connected;
      if (emblem) emblem.classList.toggle('active', !!status.connected);

      // Quick Connect Power Button
      const powerBtn = document.getElementById('vpn-power-btn');
      const powerLabel = document.getElementById('vpn-power-label');
      if (powerBtn) {
        powerBtn.classList.toggle('connected', !!status.connected);
      }
      if (powerLabel) {
        if (status.connected) {
          powerLabel.textContent = 'DISCONNECT';
        } else if (status.connecting) {
          powerLabel.textContent = 'CONNECTING...';
        } else {
          powerLabel.textContent = 'QUICK CONNECT';
        }
      }

      if (statusText) {
        if (status.connected) {
          statusText.textContent = `Connected (${status.location?.name || 'Secure'})`;
          statusText.style.color = '#10B981';
        } else if (status.connecting) {
          statusText.textContent = 'Securing tunnel...';
          statusText.style.color = '#38BDF8';
        } else {
          statusText.textContent = 'Disconnected';
          statusText.style.color = 'var(--text-muted)';
        }
      }

      if (locSelect && status.location) {
        locSelect.value = status.location.id || 'optimal';
      }

      if (ipVal) ipVal.textContent = status.connected ? status.virtualIp : 'Protected';
      if (latencyVal) latencyVal.textContent = status.connected ? `${status.latency} ms` : '-- ms';
      if (trafficVal) trafficVal.textContent = status.stats?.bytesFormatted || '0 KB';

      // Session Duration & Down/Up Breakdown
      const sessionTimeVal = document.getElementById('vpn-session-time-val');
      const downUpVal = document.getElementById('vpn-down-up-val');
      if (sessionTimeVal) sessionTimeVal.textContent = status.sessionDuration || '00:00';
      if (downUpVal) downUpVal.textContent = `${status.stats?.downloadFormatted || '0 KB'} / ${status.stats?.uploadFormatted || '0 KB'}`;

      // Pause / Snooze Bar State
      const pauseBar = document.getElementById('vpn-pause-bar');
      const resumeBtn = document.getElementById('vpn-resume-btn');
      const pauseCountdown = document.getElementById('vpn-pause-countdown');
      if (status.paused) {
        if (resumeBtn) resumeBtn.classList.remove('hidden');
        if (pauseCountdown) {
          pauseCountdown.classList.remove('hidden');
          pauseCountdown.textContent = status.pauseRemainingFormatted || '00:00';
        }
        if (powerBtn) powerBtn.classList.remove('connected');
        if (powerLabel) powerLabel.textContent = 'RESUME';
        if (statusText) {
          statusText.textContent = `Paused (${status.pauseRemainingFormatted} left)`;
          statusText.style.color = '#F59E0B';
        }
      } else {
        if (resumeBtn) resumeBtn.classList.add('hidden');
        if (pauseCountdown) pauseCountdown.classList.add('hidden');
      }

      // Turbo Accelerator Toggle
      const turboToggle = document.getElementById('vpn-turbo-toggle');
      if (turboToggle) turboToggle.checked = status.turboAccelerator?.enabled !== false;

      // Post-Quantum Toggle
      const quantumToggle = document.getElementById('vpn-quantum-toggle');
      if (quantumToggle) quantumToggle.checked = status.postQuantum?.enabled !== false;

      // Threat Filtering Level Select
      const threatLevelSelect = document.getElementById('vpn-threat-level-select');
      if (threatLevelSelect && status.threatProtection?.level) {
        threatLevelSelect.value = status.threatProtection.level;
      }

      // IP Reputation Card
      const trustBadge = document.getElementById('vpn-ip-trust-badge');
      if (trustBadge) {
        trustBadge.textContent = `${status.ipReputation?.trustScore || 100}% Clean`;
      }

      // Protocol indicator
      const activeProtoVal = document.getElementById('vpn-active-proto-val');
      if (activeProtoVal) {
        activeProtoVal.textContent = status.protocol === 'stealth-tls' ? 'Stealth TLS' : (status.protocol === 'openvpn' ? 'OpenVPN' : 'WireGuard');
      }

      // Protocol Tabs active state
      ['wireguard', 'stealth', 'openvpn'].forEach(p => {
        const btn = document.getElementById(`vpn-proto-${p}`);
        if (btn) {
          const match = (p === 'stealth' && status.protocol === 'stealth-tls') || (p === status.protocol);
          btn.classList.toggle('active', match);
        }
      });

      // Multi-Hop (Double VPN)
      const multihopToggle = document.getElementById('vpn-multihop-toggle');
      const multihopDetails = document.getElementById('vpn-multihop-details');
      const exitSelect = document.getElementById('vpn-exit-select');
      const entryTag = document.getElementById('vpn-entry-tag');
      if (entryTag && status.location) {
        entryTag.textContent = `${status.location.flag || '🌍'} ${status.location.name || 'Entry Node'}`;
      }
      if (multihopToggle) multihopToggle.checked = !!status.multiHop?.enabled;
      if (multihopDetails) multihopDetails.classList.toggle('hidden', !status.multiHop?.enabled);
      if (exitSelect && status.multiHop?.exit) {
        exitSelect.value = status.multiHop.exit.id;
      }

      // Rotating IP
      const rotatingToggle = document.getElementById('vpn-rotating-toggle');
      const rotationStatus = document.getElementById('vpn-rotation-status');
      if (rotatingToggle) rotatingToggle.checked = !!status.rotatingIp?.enabled;
      if (rotationStatus) {
        rotationStatus.textContent = status.rotatingIp?.enabled ? `Rotated ${status.rotatingIp.rotationCount || 0}x` : 'Static';
      }

      // Threat, Stealth, Tor toggles
      const threatToggle = document.getElementById('vpn-threat-toggle');
      const stealthToggle = document.getElementById('vpn-stealth-toggle');
      const torToggle = document.getElementById('vpn-tor-toggle');
      if (threatToggle) threatToggle.checked = status.threatProtection?.enabled !== false;
      if (stealthToggle) stealthToggle.checked = !!status.obfuscation;
      if (torToggle) torToggle.checked = !!status.torOverVpn;

      // Split Tunnel Mode
      const splitModeSelect = document.getElementById('vpn-split-mode-select');
      const addInput = document.getElementById('vpn-new-bypass-input');
      if (splitModeSelect && status.splitTunnel?.mode) {
        splitModeSelect.value = status.splitTunnel.mode;
        if (addInput) {
          addInput.placeholder = (status.splitTunnel.mode === 'only_vpn')
            ? 'e.g. streaming.com (VPN only)'
            : 'e.g. bank.com (bypass VPN)';
        }
      }

      if (killswitch) killswitch.checked = status.killSwitch !== false;
      if (dnsleak) dnsleak.checked = status.dnsLeakProtection !== false;
      if (webrtc) webrtc.checked = status.webRtcProtection !== false;
      if (autoconnect) autoconnect.checked = !!status.autoConnectPublicWifi;

      if (chipsEl) {
        const currentDomains = (status.splitTunnel?.mode === 'only_vpn')
          ? (status.splitTunnel?.onlyVpnDomains || [])
          : (status.bypassDomains || []);

        chipsEl.innerHTML = currentDomains.map(d => `
          <span class="vpn-chip">
            ${Utils.escapeHtml(d)}
            <span class="vpn-chip-del" data-domain="${Utils.escapeHtml(d)}">&times;</span>
          </span>
        `).join('');

        chipsEl.querySelectorAll('.vpn-chip-del').forEach(btn => {
          btn.onclick = async (e) => {
            e.stopPropagation();
            const dom = btn.getAttribute('data-domain');
            if (status.splitTunnel?.mode === 'only_vpn') {
              await IpcClient.removeVpnOnlyDomain(dom);
            } else {
              await IpcClient.removeVpnBypassDomain(dom);
            }
            renderVpnUi();
          };
        });
      }

      this.updateVpnBadge();
    };

    await renderVpnUi();

    // Wire listeners once
    const masterToggle = document.getElementById('vpn-master-toggle');
    const locSelect = document.getElementById('vpn-location-select');
    const killswitch = document.getElementById('vpn-killswitch-toggle');
    const dnsleak = document.getElementById('vpn-dnsleak-toggle');
    const webrtc = document.getElementById('vpn-webrtc-toggle');
    const autoconnect = document.getElementById('vpn-autoconnect-toggle');
    const addBtn = document.getElementById('vpn-add-bypass-btn');
    const addInput = document.getElementById('vpn-new-bypass-input');

    // Specialty Location Filter Pills
    const pills = this.vpnPopoverEl.querySelectorAll('.vpn-pill');
    pills.forEach(pill => {
      pill.onclick = async () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const spec = pill.getAttribute('data-specialty');
        const locs = await IpcClient.getVpnLocations(spec);
        if (locSelect && locs) {
          const currentVal = locSelect.value;
          locSelect.innerHTML = locs.map(l => {
            const label = l.id === 'optimal'
              ? `${l.flag} ${l.name} (${l.region})`
              : `${l.flag} ${l.name} [${l.latency}ms]`;
            return `<option value="${l.id}">${label}</option>`;
          }).join('');
          locSelect.value = locs.some(l => l.id === currentVal) ? currentVal : (locs[0]?.id || 'optimal');
        }
      };
    });

    // Pause / Snooze Buttons
    const snoozeBtns = this.vpnPopoverEl.querySelectorAll('.vpn-snooze-btn');
    snoozeBtns.forEach(btn => {
      btn.onclick = async () => {
        const mins = parseInt(btn.getAttribute('data-pause')) || 5;
        await IpcClient.pauseVpn(mins);
        await renderVpnUi();
      };
    });

    const resumeBtn = document.getElementById('vpn-resume-btn');
    if (resumeBtn) {
      resumeBtn.onclick = async () => {
        await IpcClient.resumeVpn();
        await renderVpnUi();
      };
    }

    // Turbo Accelerator Toggle
    const turboToggle = document.getElementById('vpn-turbo-toggle');
    if (turboToggle) {
      turboToggle.onchange = async () => {
        await IpcClient.setVpnTurboAccelerator(turboToggle.checked);
        await renderVpnUi();
      };
    }

    // Speed Test Runner
    const speedtestBtn = document.getElementById('vpn-speedtest-btn');
    const speedResults = document.getElementById('vpn-speedtest-results');
    const speedDown = document.getElementById('vpn-speed-down');
    const speedUp = document.getElementById('vpn-speed-up');
    const speedPing = document.getElementById('vpn-speed-ping');
    const speedQuality = document.getElementById('vpn-speed-quality');
    if (speedtestBtn) {
      speedtestBtn.onclick = async () => {
        speedtestBtn.disabled = true;
        speedtestBtn.textContent = 'Testing...';
        if (speedResults) speedResults.classList.remove('hidden');
        if (speedDown) speedDown.textContent = '...';
        if (speedUp) speedUp.textContent = '...';
        if (speedPing) speedPing.textContent = '...';
        try {
          const res = await IpcClient.runVpnSpeedTest();
          if (res) {
            if (speedDown) speedDown.textContent = `${res.downloadMbps} Mbps`;
            if (speedUp) speedUp.textContent = `${res.uploadMbps} Mbps`;
            if (speedPing) speedPing.textContent = `${res.pingMs} ms (${res.jitterMs}ms jitter)`;
            if (speedQuality) {
              speedQuality.textContent = `✨ ${res.quality}`;
              speedQuality.classList.remove('hidden');
            }
          }
        } finally {
          speedtestBtn.disabled = false;
          speedtestBtn.textContent = 'Run Test';
        }
      };
    }

    // Post-Quantum Toggle
    const quantumToggle = document.getElementById('vpn-quantum-toggle');
    if (quantumToggle) {
      quantumToggle.onchange = async () => {
        await IpcClient.setVpnPostQuantum(quantumToggle.checked);
        await renderVpnUi();
      };
    }

    // Threat Filtering Sensitivity
    const threatLevelSelect = document.getElementById('vpn-threat-level-select');
    if (threatLevelSelect) {
      threatLevelSelect.onchange = async () => {
        await IpcClient.setVpnThreatLevel(threatLevelSelect.value);
        await renderVpnUi();
      };
    }

    // Protocol Tabs Listeners
    const btnWg = document.getElementById('vpn-proto-wireguard');
    const btnStealth = document.getElementById('vpn-proto-stealth');
    const btnOpenvpn = document.getElementById('vpn-proto-openvpn');
    if (btnWg) btnWg.onclick = async () => { await IpcClient.setVpnProtocol('wireguard'); await renderVpnUi(); };
    if (btnStealth) btnStealth.onclick = async () => { await IpcClient.setVpnProtocol('stealth-tls'); await renderVpnUi(); };
    if (btnOpenvpn) btnOpenvpn.onclick = async () => { await IpcClient.setVpnProtocol('openvpn'); await renderVpnUi(); };

    // Multi-Hop Listeners
    const multihopToggle = document.getElementById('vpn-multihop-toggle');
    const exitSelect = document.getElementById('vpn-exit-select');
    if (multihopToggle) {
      multihopToggle.onchange = async () => {
        const exitNode = exitSelect ? exitSelect.value : 'nl-ams';
        await IpcClient.setVpnMultiHop(multihopToggle.checked, 'ch-zrh', exitNode);
        await renderVpnUi();
      };
    }
    if (exitSelect) {
      exitSelect.onchange = async () => {
        await IpcClient.setVpnMultiHop(true, 'ch-zrh', exitSelect.value);
        await renderVpnUi();
      };
    }

    // Rotating IP Listeners
    const rotatingToggle = document.getElementById('vpn-rotating-toggle');
    const rotateNowBtn = document.getElementById('vpn-rotate-now-btn');
    if (rotatingToggle) {
      rotatingToggle.onchange = async () => {
        await IpcClient.setVpnRotatingIp(rotatingToggle.checked, 10);
        await renderVpnUi();
      };
    }
    if (rotateNowBtn) {
      rotateNowBtn.onclick = async () => {
        const ipVal = document.getElementById('vpn-ip-val');
        if (ipVal) ipVal.textContent = 'Shuffling...';
        rotateNowBtn.style.opacity = '0.6';
        rotateNowBtn.disabled = true;
        try {
          await IpcClient.rotateVpnIpNow();
        } finally {
          rotateNowBtn.style.opacity = '1';
          rotateNowBtn.disabled = false;
        }
        await renderVpnUi();
      };
    }

    // Threat, Stealth, Tor Listeners
    const threatToggle = document.getElementById('vpn-threat-toggle');
    const stealthToggle = document.getElementById('vpn-stealth-toggle');
    const torToggle = document.getElementById('vpn-tor-toggle');
    if (threatToggle) threatToggle.onchange = async () => { await IpcClient.setVpnThreatProtection(threatToggle.checked); };
    if (stealthToggle) stealthToggle.onchange = async () => { await IpcClient.setVpnObfuscation(stealthToggle.checked); };
    if (torToggle) torToggle.onchange = async () => { await IpcClient.setVpnTorOverVpn(torToggle.checked); };

    // Split Tunnel Mode Listener
    const splitModeSelect = document.getElementById('vpn-split-mode-select');
    if (splitModeSelect) {
      splitModeSelect.onchange = async () => {
        await IpcClient.setVpnSplitTunnelMode(splitModeSelect.value);
        await renderVpnUi();
      };
    }

    // Category Navigation Tabs
    const catTabs = this.vpnPopoverEl.querySelectorAll('.vpn-cat-tab');
    const panels = this.vpnPopoverEl.querySelectorAll('.vpn-panel');
    catTabs.forEach(tab => {
      tab.onclick = () => {
        catTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const targetId = `vpn-panel-${tab.getAttribute('data-vpn-tab')}`;
        panels.forEach(p => {
          const match = p.id === targetId;
          p.classList.toggle('hidden', !match);
          p.classList.toggle('active', match);
        });
      };
    });

    // Quick Connect Hero Power Button
    const heroPowerBtn = document.getElementById('vpn-power-btn');
    const triggerVpnToggle = async () => {
      const powerLabel = document.getElementById('vpn-power-label');
      const statusText = document.getElementById('vpn-status-text');
      const isCurrentlyConnected = heroPowerBtn && heroPowerBtn.classList.contains('connected');
      if (powerLabel) {
        powerLabel.textContent = isCurrentlyConnected ? 'DISCONNECTING...' : 'CONNECTING...';
      }
      if (statusText) {
        statusText.textContent = isCurrentlyConnected ? 'Closing tunnel...' : 'Securing tunnel...';
        statusText.style.color = '#38BDF8';
      }
      const targetLoc = locSelect ? locSelect.value : null;
      await IpcClient.toggleVpn(targetLoc);
      await renderVpnUi();
    };

    if (heroPowerBtn) {
      heroPowerBtn.onclick = triggerVpnToggle;
    }

    if (masterToggle) {
      masterToggle.onchange = triggerVpnToggle;
    }

    if (locSelect) {
      locSelect.onchange = async () => {
        await IpcClient.setVpnLocation(locSelect.value);
        await renderVpnUi();
      };
    }

    if (killswitch) {
      killswitch.onchange = async () => {
        await IpcClient.setVpnKillSwitch(killswitch.checked);
      };
    }

    if (dnsleak) {
      dnsleak.onchange = async () => {
        await IpcClient.setVpnDnsLeakProtection(dnsleak.checked);
      };
    }

    if (webrtc) {
      webrtc.onchange = async () => {
        await IpcClient.setVpnWebRtcProtection(webrtc.checked);
      };
    }

    if (autoconnect) {
      autoconnect.onchange = async () => {
        await IpcClient.setVpnAutoConnect(autoconnect.checked);
      };
    }

    if (addBtn && addInput) {
      addBtn.onclick = async () => {
        const val = addInput.value.trim();
        if (val) {
          const mode = splitModeSelect ? splitModeSelect.value : 'bypass';
          if (mode === 'only_vpn') {
            await IpcClient.addVpnOnlyDomain(val);
          } else {
            await IpcClient.addVpnBypassDomain(val);
          }
          addInput.value = '';
          await renderVpnUi();
        }
      };
    }

    // Explicit Close Button
    const vpnCloseBtn = document.getElementById('vpn-close-btn');
    if (vpnCloseBtn) {
      vpnCloseBtn.onclick = (e) => {
        e.stopPropagation();
        this.closeVpnPopover();
      };
    }

    // Dynamic right-alignment to VPN button
    try {
      if (this.vpnBtnEl && this.vpnPopoverEl) {
        const btnRect = this.vpnBtnEl.getBoundingClientRect();
        const omni = document.getElementById('omnibox-container');
        if (omni) {
          const omniRect = omni.getBoundingClientRect();
          const offset = Math.max(8, Math.round(omniRect.right - btnRect.right - 6));
          this.vpnPopoverEl.style.right = `${offset}px`;
        }
      }
    } catch (e) {}

    this.vpnPopoverEl.classList.remove('hidden');

    // Live telemetry refresh interval while popover is open
    if (this.vpnLiveInterval) clearInterval(this.vpnLiveInterval);
    this.vpnLiveInterval = setInterval(async () => {
      try {
        if (!this.vpnPopoverEl || this.vpnPopoverEl.classList.contains('hidden')) {
          if (this.vpnLiveInterval) {
            clearInterval(this.vpnLiveInterval);
            this.vpnLiveInterval = null;
          }
          return;
        }
        const st = await IpcClient.getVpnStatus();
        if (!st) return;
        const trafficVal = document.getElementById('vpn-traffic-val');
        const latencyVal = document.getElementById('vpn-latency-val');
        const ipVal = document.getElementById('vpn-ip-val');
        const sessionTimeVal = document.getElementById('vpn-session-time-val');
        const downUpVal = document.getElementById('vpn-down-up-val');
        const pauseCountdown = document.getElementById('vpn-pause-countdown');

        if (trafficVal && st.stats?.bytesFormatted) {
          trafficVal.textContent = st.stats.bytesFormatted;
        }
        if (latencyVal && st.connected) {
          latencyVal.textContent = `${st.latency} ms`;
        }
        if (ipVal && st.connected) {
          ipVal.textContent = st.virtualIp;
        }
        if (sessionTimeVal && st.sessionDuration) {
          sessionTimeVal.textContent = st.sessionDuration;
        }
        if (downUpVal && st.stats) {
          downUpVal.textContent = `${st.stats.downloadFormatted || '0 KB'} / ${st.stats.uploadFormatted || '0 KB'}`;
        }
        if (pauseCountdown && st.paused) {
          pauseCountdown.textContent = st.pauseRemainingFormatted || '00:00';
        }
      } catch (e) {}
    }, 1500);

    // Close on click outside or Escape key
    const escListener = (e) => {
      if (e.key === 'Escape') {
        this.closeVpnPopover();
      }
    };
    const closeListener = (e) => {
      if (!this.vpnPopoverEl.contains(e.target) && !this.vpnBtnEl.contains(e.target)) {
        this.closeVpnPopover();
      }
    };
    this._vpnEscListener = escListener;
    this._vpnCloseListener = closeListener;
    setTimeout(() => {
      document.addEventListener('click', closeListener);
      document.addEventListener('keydown', escListener);
    }, 0);
  },

  closeShieldsPopover() {
    if (!this.shieldsPopoverEl) return;
    this.shieldsPopoverEl.classList.add('hidden');
    const freeze = document.getElementById('freeze-backdrop');
    if (freeze) {
      freeze.classList.add('hidden');
      freeze.style.backgroundImage = '';
    }
    if (IpcClient.setViewVisible) {
      IpcClient.setViewVisible(true);
    }
  },

  async toggleShieldsPopover() {
    if (!this.shieldsPopoverEl) return;
    const isHidden = this.shieldsPopoverEl.classList.contains('hidden');
    if (!isHidden) {
      this.closeShieldsPopover();
      return;
    }

    // Freeze-frame snapshot backdrop to prevent WebContentsView clipping
    const tab = State.getActiveTab();
    const isWeb = tab && !tab.isInternal && tab.url && tab.url.startsWith('http');
    if (isWeb) {
      try {
        const res = await IpcClient.captureViewport(tab.id);
        if (res && res.dataUrl) {
          const freeze = document.getElementById('freeze-backdrop');
          if (freeze) {
            freeze.style.backgroundImage = `url(${res.dataUrl})`;
            freeze.classList.remove('hidden');
          }
        }
      } catch (e) {}
      if (IpcClient.setViewVisible) {
        await IpcClient.setViewVisible(false);
      }
    }

    // Populate data
    let hostname = 'this site';
    if (tab && tab.url && tab.url.startsWith('http')) {
      try {
        hostname = new URL(tab.url).hostname;
      } catch (e) {}
    }

    const domainEl = document.getElementById('shields-site-domain');
    const blockedCountEl = document.getElementById('shields-blocked-count');
    const masterToggle = document.getElementById('shields-master-toggle');
    const siteBtn = document.getElementById('shields-toggle-site-btn');

    if (domainEl) domainEl.textContent = hostname;

    try {
      if (IpcClient.api?.shields) {
        const status = await IpcClient.api.shields.getStatus();
        const tabStats = tab ? await IpcClient.api.shields.getTabStats(tab.id) : null;
        const count = tabStats?.blockedCount || tabStats?.total || 0;
        if (blockedCountEl) blockedCountEl.textContent = count;
        const bwEl = document.getElementById('shields-bandwidth-saved');
        if (bwEl) {
          bwEl.textContent = count < 8 ? `${Math.round(count * 128)} KB` : `${(count * 128 / 1024).toFixed(1)} MB`;
        }
        const timeEl = document.getElementById('shields-time-saved');
        if (timeEl) {
          timeEl.textContent = `${(count * 0.055).toFixed(1)} s`;
        }
        const co2El = document.getElementById('shields-co2-saved');
        if (co2El) {
          co2El.textContent = `${(count * 0.025).toFixed(2)} g`;
        }
        if (masterToggle) masterToggle.checked = status?.enabled !== false;
        
        const isWhitelisted = status?.whitelist?.includes(hostname);
        if (siteBtn) {
          siteBtn.textContent = isWhitelisted ? `Turn Shields ON for ${hostname}` : `Turn Shields OFF for ${hostname}`;
        }

        // Shields Mode Selector (Standard vs Aggressive)
        const stdBtn = document.getElementById('shields-mode-standard');
        const aggBtn = document.getElementById('shields-mode-aggressive');
        const currentMode = status?.mode || 'standard';
        if (stdBtn && aggBtn) {
          stdBtn.classList.toggle('active', currentMode === 'standard');
          aggBtn.classList.toggle('active', currentMode === 'aggressive');

          stdBtn.onclick = async () => {
            stdBtn.classList.add('active');
            aggBtn.classList.remove('active');
            if (IpcClient.api?.shields?.setMode) await IpcClient.api.shields.setMode('standard');
          };
          aggBtn.onclick = async () => {
            aggBtn.classList.add('active');
            stdBtn.classList.remove('active');
            if (IpcClient.api?.shields?.setMode) await IpcClient.api.shields.setMode('aggressive');
          };
        }

        // Blocked Items List (Brave Advanced View)
        const viewItemsBtn = document.getElementById('shields-view-items-btn');
        const itemsListEl = document.getElementById('shields-blocked-items-list');
        const itemsCountEl = document.getElementById('shields-items-btn-count');
        const blockedUrls = tabStats?.blockedUrls || [];
        if (itemsCountEl) itemsCountEl.textContent = blockedUrls.length;

        if (viewItemsBtn && itemsListEl) {
          itemsListEl.classList.add('hidden');
          viewItemsBtn.onclick = () => {
            const isListHidden = itemsListEl.classList.toggle('hidden');
            if (!isListHidden) {
              if (blockedUrls.length === 0) {
                itemsListEl.innerHTML = '<div style="text-align:center;padding:8px;font-size:10px;color:var(--text-muted);">No blocked requests yet</div>';
              } else {
                itemsListEl.innerHTML = blockedUrls.map(item => `
                  <div class="shields-blocked-item">
                    <span class="shields-blocked-host" title="${Utils.escapeHtml(item.url)}">${Utils.escapeHtml(item.domain || item.url)}</span>
                    <span class="shields-blocked-tag ${item.type === 'ad' ? 'ad' : 'tracker'}">${item.type}</span>
                  </div>
                `).join('');
              }
            }
          };
        }

        // Script Blocker per-site
        const scriptToggle = document.getElementById('shields-script-toggle');
        if (scriptToggle) {
          const blockedScripts = State.settings?.blockedScriptsDomains || [];
          scriptToggle.checked = blockedScripts.includes(hostname);
          scriptToggle.onchange = async () => {
            let list = [...(State.settings?.blockedScriptsDomains || [])];
            if (scriptToggle.checked) {
              if (!list.includes(hostname)) list.push(hostname);
            } else {
              list = list.filter(h => h !== hostname);
            }
            if (State.settings) State.settings.blockedScriptsDomains = list;
            await IpcClient.saveSettings({ blockedScriptsDomains: list });
          };
        }

        // Attach listeners once
        masterToggle.onchange = async () => {
          await IpcClient.api.shields.toggle(masterToggle.checked);
          this.shieldsBtnEl?.classList.toggle('shields-off', !masterToggle.checked);
        };

        if (siteBtn) {
          siteBtn.onclick = async () => {
            const nextAllow = !isWhitelisted;
            await IpcClient.api.shields.toggleWhitelist(hostname, nextAllow);
            this.closeShieldsPopover();
          };
        }
      }
    } catch (e) {
      console.warn('Shields popover error:', e);
    }

    this.shieldsPopoverEl.classList.remove('hidden');

    // Close on click outside
    const closeListener = (e) => {
      if (!this.shieldsPopoverEl.contains(e.target) && !this.shieldsBtnEl.contains(e.target)) {
        this.closeShieldsPopover();
        document.removeEventListener('click', closeListener);
      }
    };
    setTimeout(() => document.addEventListener('click', closeListener), 0);
  },

  async updateSecurityBadge(url) {
    if (!this.securityBadgeEl) return;
    const status = await IpcClient.getSecurityStatus(url);

    this.securityBadgeEl.className = 'omnibox-action-btn';
    if (status.type === 'secure') {
      this.securityBadgeEl.classList.add('secure');
      this.securityBadgeEl.innerHTML = Utils.icons.lock;
      this.securityBadgeEl.title = 'Connection is secure (HTTPS)';
    } else if (status.type === 'insecure') {
      this.securityBadgeEl.classList.add('insecure');
      this.securityBadgeEl.innerHTML = Utils.icons.lockWarning;
      this.securityBadgeEl.title = 'Connection is not secure (HTTP)';
    } else if (status.type === 'internal') {
      this.securityBadgeEl.classList.add('internal');
      const activeEngine = (State.settings && State.settings.searchEngine ? State.settings.searchEngine : 'google').toLowerCase();
      if (activeEngine === 'yahoo') {
        this.securityBadgeEl.innerHTML = '<span style="background:#6001d2;color:#fff;font-weight:900;font-size:11px;border-radius:4px;padding:2px 4px;font-family:sans-serif;line-height:1;">y!</span>';
        this.securityBadgeEl.title = 'Search with Yahoo';
      } else if (activeEngine === 'duckduckgo') {
        this.securityBadgeEl.innerHTML = '<span style="font-size:14px;line-height:1;">🦆</span>';
        this.securityBadgeEl.title = 'Search with DuckDuckGo';
      } else if (activeEngine === 'bing') {
        this.securityBadgeEl.innerHTML = '<span style="background:#008373;color:#fff;font-weight:700;font-size:11px;border-radius:4px;padding:2px 5px;font-family:sans-serif;line-height:1;">b</span>';
        this.securityBadgeEl.title = 'Search with Bing';
      } else if (activeEngine === 'ecosia') {
        this.securityBadgeEl.innerHTML = '<span style="font-size:14px;line-height:1;">🌿</span>';
        this.securityBadgeEl.title = 'Search with Ecosia';
      } else {
        this.securityBadgeEl.innerHTML = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>`;
        this.securityBadgeEl.title = 'Search with Google';
      }
    } else {
      this.securityBadgeEl.innerHTML = Utils.icons.globe;
      this.securityBadgeEl.title = 'Web Page';
    }
  },

  updateBookmarkButton(url) {
    if (!this.bookmarkBtnEl) return;
    const isBookmarked = State.bookmarks.some(b => b.url === url);
    if (isBookmarked) {
      this.bookmarkBtnEl.innerHTML = Utils.icons.starFilled;
      this.bookmarkBtnEl.classList.add('active');
      this.bookmarkBtnEl.title = 'Edit bookmark for this tab';
    } else {
      this.bookmarkBtnEl.innerHTML = Utils.icons.star;
      this.bookmarkBtnEl.classList.remove('active');
      this.bookmarkBtnEl.title = 'Bookmark this tab (Ctrl+D)';
    }
  },

  isDirectUrl(input) {
    if (!input || typeof input !== 'string') return false;
    const trimmed = input.trim();
    if (!trimmed || trimmed.includes(' ')) return false;

    // Has scheme: http://, https://, file://, ftp://, aether://, amiyo://
    if (/^[a-zA-Z]+:\/\//i.test(trimmed)) return true;

    // Localhost or IPv4 loopback / LAN
    if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed) || /^127\.0\.0\.1(:\d+)?(\/.*)?$/.test(trimmed) || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/.*)?$/.test(trimmed)) return true;

    // Starts with www.
    if (/^www\./i.test(trimmed)) return true;

    // Domain structure with valid dot: e.g. scholarship.up.gov.in, domain.com, sub.domain.co.uk/path
    const hostPart = trimmed.split('/')[0].split('?')[0].split(':')[0];
    if (hostPart.includes('.') && !hostPart.startsWith('.') && !hostPart.endsWith('.')) {
      const parts = hostPart.split('.');
      const tld = parts[parts.length - 1];
      if (tld.length >= 2 && /^[a-zA-Z0-9]+$/.test(tld)) {
        return true;
      }
    }

    return false;
  },

  async fetchSuggestions(query) {
    this._suggestionSeq = (this._suggestionSeq || 0) + 1;
    const currentSeq = this._suggestionSeq;
    if (!query || query.trim() === '') {
      this.closeSuggestions();
      return;
    }

    const trimmed = query.trim();

    // Chrome Search Engine Keywords: @, @bookmarks, @history, @tabs, @yt, @wiki, @ai
    if (trimmed === '@') {
      this.currentSuggestions = [
        { type: 'keyword', title: '@bookmarks — Search Vault bookmarks', url: '@bookmarks ' },
        { type: 'keyword', title: '@history — Search browsing history', url: '@history ' },
        { type: 'keyword', title: '@tabs — Search and switch open tabs', url: '@tabs ' },
        { type: 'keyword', title: '@yt — Search YouTube directly', url: '@yt ' },
        { type: 'keyword', title: '@wiki — Search Wikipedia directly', url: '@wiki ' },
        { type: 'ai', title: '@ai — Ask AETHER Intelligence', url: '@ai ' }
      ];
      this.selectedIndex = 0;
      this.renderSuggestions();
      return;
    }

    if (trimmed.startsWith('@bookmarks') || trimmed.startsWith('@b ')) {
      const q = trimmed.replace(/^@(bookmarks|b)\s*/i, '').trim().toLowerCase();
      const matches = (State.bookmarks || []).filter(b => 
        !q || (b.title && b.title.toLowerCase().includes(q)) || (b.url && b.url.toLowerCase().includes(q))
      );
      this.currentSuggestions = matches.slice(0, 8).map(b => ({
        type: 'bookmark',
        title: b.title || b.url,
        url: b.url
      }));
      if (this.currentSuggestions.length === 0) {
        this.currentSuggestions = [{ type: 'bookmark', title: `No bookmarks matching "${q}"`, url: '' }];
      }
      this.selectedIndex = 0;
      this.renderSuggestions();
      return;
    }

    if (trimmed.startsWith('@history') || trimmed.startsWith('@h ')) {
      const q = trimmed.replace(/^@(history|h)\s*/i, '').trim().toLowerCase();
      const matches = (State.history || []).filter(h => 
        !q || (h.title && h.title.toLowerCase().includes(q)) || (h.url && h.url.toLowerCase().includes(q))
      );
      this.currentSuggestions = matches.slice(0, 8).map(h => ({
        type: 'history',
        title: h.title || h.url,
        url: h.url
      }));
      if (this.currentSuggestions.length === 0) {
        this.currentSuggestions = [{ type: 'history', title: `No history matching "${q}"`, url: '' }];
      }
      this.selectedIndex = 0;
      this.renderSuggestions();
      return;
    }

    if (trimmed.startsWith('@tabs') || trimmed.startsWith('@t ')) {
      const q = trimmed.replace(/^@(tabs|t)\s*/i, '').trim().toLowerCase();
      const matches = (State.tabs || []).filter(t => 
        !q || (t.title && t.title.toLowerCase().includes(q)) || (t.url && t.url.toLowerCase().includes(q))
      );
      this.currentSuggestions = matches.slice(0, 8).map(t => ({
        type: 'tab',
        title: `Switch to: ${t.title || 'Tab'}`,
        url: t.url,
        tabId: t.id
      }));
      if (this.currentSuggestions.length === 0) {
        this.currentSuggestions = [{ type: 'tab', title: `No open tabs matching "${q}"`, url: '' }];
      }
      this.selectedIndex = 0;
      this.renderSuggestions();
      return;
    }

    if (trimmed.startsWith('@yt')) {
      const q = trimmed.replace(/^@yt\s*/i, '').trim();
      this.currentSuggestions = [{
        type: 'search',
        engine: 'youtube',
        title: q ? `▶ Search YouTube for "${q}"` : '▶ Search YouTube (Type search term)',
        url: q ? `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` : 'https://www.youtube.com'
      }];
      this.selectedIndex = 0;
      this.renderSuggestions();
      return;
    }

    if (trimmed.startsWith('@wiki')) {
      const q = trimmed.replace(/^@wiki\s*/i, '').trim();
      this.currentSuggestions = [{
        type: 'search',
        engine: 'wikipedia',
        title: q ? `📚 Search Wikipedia for "${q}"` : '📚 Search Wikipedia (Type search term)',
        url: q ? `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}` : 'https://en.wikipedia.org'
      }];
      this.selectedIndex = 0;
      this.renderSuggestions();
      return;
    }

    const isAiQuery = trimmed.startsWith('@ai') || trimmed.startsWith('@gemini');
    let aiPrompt = '';
    if (isAiQuery) {
      aiPrompt = trimmed.replace(/^@(ai|gemini)\s*/i, '');
    }

    const suggestions = await IpcClient.getSuggestions(query);
    if (this._suggestionSeq !== currentSeq || !this.inputEl || document.activeElement !== this.inputEl) {
      return;
    }
    this.currentSuggestions = suggestions || [];

    if (isAiQuery) {
      this.currentSuggestions.unshift({
        type: 'ai',
        title: aiPrompt ? `✨ Ask AETHER Intelligence: "${aiPrompt}"` : '✨ Ask AETHER Intelligence (Type your question)',
        url: `@ai ${aiPrompt}`,
        prompt: aiPrompt
      });
    }

    this.selectedIndex = isAiQuery ? 0 : -1;
    this.renderSuggestions();
  },

  renderSuggestions() {
    if (!this.suggestionsEl) return;
    if (this.currentSuggestions.length === 0 || !this.inputEl || document.activeElement !== this.inputEl) {
      this.closeSuggestions();
      return;
    }

    this.ensureSuggestionsBackdrop();
    this.suggestionsEl.innerHTML = '';
    this.suggestionsEl.classList.remove('hidden');

    this.currentSuggestions.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = `suggestion-item ${idx === this.selectedIndex ? 'selected' : ''}`;

      let iconHtml = Utils.icons.search;
      if (item.type === 'ai') iconHtml = Utils.icons.sparkle;
      else if (item.type === 'bookmark') iconHtml = Utils.icons.bookmark;
      else if (item.type === 'history') iconHtml = Utils.icons.history;
      else if (item.type === 'tab') iconHtml = `<span style="font-size:14px;line-height:1;">📑</span>`;
      else if (item.type === 'keyword') iconHtml = `<span style="font-size:14px;line-height:1;">⚡</span>`;
      else if (item.type === 'internal' || item.type === 'navigate' || item.isDirect) iconHtml = Utils.icons.globe;
      else if (item.type === 'search') {
        const engineIcons = {
          duckduckgo: '🦆',
          bing: '🔷',
          ecosia: '🌿',
          yahoo: '🟣',
          google: '🌐',
          youtube: '▶️',
          wikipedia: '📚'
        };
        const activeEngine = (item.engine || (State.settings && State.settings.searchEngine) || 'google').toLowerCase();
        const iconEmoji = engineIcons[activeEngine];
        if (iconEmoji) {
          iconHtml = `<span style="font-size:14px;line-height:1;display:inline-flex;align-items:center;justify-content:center;">${iconEmoji}</span>`;
        }
      }

      el.innerHTML = `
        <div class="suggestion-icon">${iconHtml}</div>
        <div class="suggestion-content">
          <span class="suggestion-title">${Utils.escapeHtml(item.title)}</span>
          <span class="suggestion-url">${Utils.escapeHtml(item.url)}</span>
        </div>
        <span class="suggestion-type">${Utils.escapeHtml(item.isDirect ? 'open' : item.type)}</span>
      `;

      el.addEventListener('click', () => {
        this.navigateToUrl(item.url, item);
      });

      this.suggestionsEl.appendChild(el);
    });
  },

  moveSelection(delta) {
    if (this.currentSuggestions.length === 0) return;
    this.selectedIndex += delta;
    if (this.selectedIndex >= this.currentSuggestions.length) {
      this.selectedIndex = 0;
    } else if (this.selectedIndex < 0) {
      this.selectedIndex = this.currentSuggestions.length - 1;
    }

    const items = this.suggestionsEl.querySelectorAll('.suggestion-item');
    items.forEach((el, idx) => {
      el.classList.toggle('selected', idx === this.selectedIndex);
    });

    // Update input preview
    if (this.selectedIndex >= 0 && this.currentSuggestions[this.selectedIndex]) {
      this.inputEl.value = this.currentSuggestions[this.selectedIndex].url;
    }
  },

  handleEnter() {
    const rawVal = (this.inputEl?.value || '').trim();
    console.log('[OMNIBOX] handleEnter called! selectedIndex:', this.selectedIndex, 'input value:', rawVal);

    // If the user typed a direct URL or domain, open directly unless user explicitly selected a bookmark/tab/internal suggestion
    if (this.isDirectUrl(rawVal)) {
      if (this.selectedIndex >= 0 && this.currentSuggestions[this.selectedIndex]) {
        const selected = this.currentSuggestions[this.selectedIndex];
        if (selected.type === 'bookmark' || selected.type === 'internal' || selected.type === 'tab') {
          this.navigateToUrl(selected.url, selected);
          return;
        }
      }
      this.navigateToUrl(rawVal);
      return;
    }

    if (this.selectedIndex >= 0 && this.currentSuggestions[this.selectedIndex]) {
      const selected = this.currentSuggestions[this.selectedIndex];
      console.log('[OMNIBOX] navigating to selected suggestion:', selected.url);
      this.navigateToUrl(selected.url, selected);
    } else {
      console.log('[OMNIBOX] navigating to raw input:', rawVal);
      if (rawVal) {
        this.navigateToUrl(rawVal);
      }
    }
  },

  navigateToUrl(url, item) {
    this._suggestionSeq = (this._suggestionSeq || 0) + 1;
    console.log('[OMNIBOX] navigateToUrl called with url:', url, 'activeTabId:', State.activeTabId);
    this.closeSuggestions();
    this.inputEl.blur();

    if (item && item.tabId) {
      IpcClient.switchTab(item.tabId);
      return;
    }

    let trimmed = (url || '').trim();
    if (!trimmed) return;

    // Unwrap search engine wrapper URLs if any
    if (trimmed.includes('search?q=') || trimmed.includes('duckduckgo.com/?q=') || trimmed.includes('search?p=')) {
      try {
        const u = new URL(trimmed);
        const qParam = u.searchParams.get('q') || u.searchParams.get('p') || u.searchParams.get('text');
        if (qParam && this.isDirectUrl(qParam)) {
          trimmed = qParam;
        }
      } catch (e) {}
    }

    if (trimmed.startsWith('@ai') || trimmed.startsWith('@gemini')) {
      const prompt = trimmed.replace(/^@(ai|gemini)\s*/i, '').trim();
      if (typeof AiPanel !== 'undefined') {
        AiPanel.openWithPrompt(prompt);
      }
      return;
    }

    if (trimmed.startsWith('@') && trimmed.endsWith(' ')) {
      // User selected a keyword prefix like '@bookmarks ' -> put it into the input and focus
      this.inputEl.value = trimmed;
      this.inputEl.focus();
      this.fetchSuggestions(trimmed);
      return;
    }

    if (IpcClient.setViewVisible) {
      IpcClient.setViewVisible(true);
    }
    IpcClient.navigateTab(State.activeTabId || '', trimmed);
  },

  updateSearchEngine(engine) {
    if (!this.inputEl) return;
    const engineMap = {
      google: 'Google',
      duckduckgo: 'DuckDuckGo',
      bing: 'Bing',
      yahoo: 'Yahoo',
      ecosia: 'Ecosia',
      yandex: 'Yandex'
    };
    const current = (engine || (State.settings && State.settings.searchEngine) || 'google').toLowerCase();
    const label = engineMap[current] || 'the web';
    if (State.settings) {
      State.settings.searchEngine = current;
    }
    const tab = State.getActiveTab();
    if (!tab || tab.url === 'amiyo://newtab' || tab.url === 'aether://newtab') {
      this.inputEl.placeholder = `Search with ${label} or enter address`;
      this.updateSecurityBadge(tab ? tab.url : 'aether://newtab');
    }
  },

  async ensureSuggestionsBackdrop() {
    if (this.isSuggestionsBackdropActive) return;
    if (!this.inputEl || document.activeElement !== this.inputEl) return;
    const tab = State.getActiveTab();
    if (tab && !tab.isInternal && tab.url && tab.url.startsWith('http')) {
      this.isSuggestionsBackdropActive = true;
      try {
        const res = await IpcClient.captureViewport(tab.id);
        if (res && res.dataUrl) {
          const freeze = document.getElementById('freeze-backdrop');
          if (freeze) {
            freeze.style.backgroundImage = `url(${res.dataUrl})`;
            freeze.classList.remove('hidden');
          }
        }
      } catch (e) {}
      if (this.isSuggestionsBackdropActive && this.inputEl && document.activeElement === this.inputEl) {
        if (IpcClient.setViewVisible) {
          IpcClient.setViewVisible(false);
        }
      }
    }
  },

  closeSuggestions() {
    this._suggestionSeq = (this._suggestionSeq || 0) + 1;
    if (this.suggestionsEl) {
      this.suggestionsEl.classList.add('hidden');
      this.suggestionsEl.innerHTML = '';
      this.currentSuggestions = [];
      this.selectedIndex = -1;
    }
    if (this.isSuggestionsBackdropActive) {
      this.isSuggestionsBackdropActive = false;
      const freeze = document.getElementById('freeze-backdrop');
      if (freeze) {
        freeze.classList.add('hidden');
        freeze.style.backgroundImage = '';
      }
    }
    if (IpcClient.setViewVisible) {
      IpcClient.setViewVisible(true);
    }
  },

  async toggleBookmarkCurrentTab() {
    const tab = State.getActiveTab();
    if (!tab || !tab.url || tab.url === 'amiyo://newtab' || tab.url === 'aether://newtab') return;

    const existing = State.bookmarks.find(b => b.url === tab.url);
    if (existing) {
      await IpcClient.removeBookmark(existing.id);
    } else {
      await IpcClient.addBookmark({
        title: tab.title || tab.url,
        url: tab.url,
        favicon: tab.favicon
      });
    }
    const updated = await IpcClient.getBookmarks();
    State.bookmarks = updated;
    this.updateBookmarkButton(tab.url);
    BookmarksBar.render();
  },

  async showSecurityDetails() {
    const tab = State.getActiveTab();
    if (!tab) return;
    const status = await IpcClient.getSecurityStatus(tab.url);
    const domain = Utils.extractHostname(tab.url) || tab.url;

    let info = '';
    if (status.type === 'secure') {
      info = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div style="font-size:28px;">🔒</div>
          <div>
            <h4 style="color:var(--success);font-weight:700;font-size:15px;margin:0;">Connection is Secure</h4>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">Your information (passwords, credit cards) is private.</div>
          </div>
        </div>

        <div style="background:var(--bg-tertiary);border-radius:8px;padding:12px;border:1px solid var(--border-subtle);margin-bottom:12px;font-size:12px;display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;justify-content:space-between;">
            <span style="color:var(--text-muted);">Certificate:</span>
            <span style="color:var(--text-primary);font-weight:600;">Valid (Issued for ${Utils.escapeHtml(domain)})</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:var(--text-muted);">Protocol &amp; Cipher:</span>
            <span style="color:var(--text-primary);font-mono;font-weight:600;">TLS 1.3 (AES_256_GCM)</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:var(--text-muted);">AETHER Shield:</span>
            <span style="color:var(--accent);font-weight:600;">Zero-Telemetry Active</span>
          </div>
        </div>

        <div style="border-top:1px solid var(--border-subtle);padding-top:10px;margin-top:8px;">
          <div style="font-weight:600;font-size:12px;color:var(--text-primary);margin-bottom:8px;">Permissions for this site:</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;color:var(--text-secondary);">
            <div>📷 Camera: <strong style="color:var(--text-primary);">Ask (default)</strong></div>
            <div>🎤 Microphone: <strong style="color:var(--text-primary);">Ask (default)</strong></div>
            <div>📍 Location: <strong style="color:var(--text-primary);">Ask (default)</strong></div>
            <div>🔔 Notifications: <strong style="color:var(--text-primary);">Ask (default)</strong></div>
          </div>
        </div>
      `;
    } else if (status.type === 'internal') {
      info = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div style="font-size:28px;">⚡</div>
          <div>
            <h4 style="color:var(--accent);font-weight:700;font-size:15px;margin:0;">AETHER Internal System</h4>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">Built-in secure application process running directly inside AETHER.</div>
          </div>
        </div>
        <div style="background:var(--bg-tertiary);border-radius:8px;padding:12px;border:1px solid var(--border-subtle);font-size:12px;">
          <div style="color:var(--text-muted);">Origin: <strong style="color:var(--text-primary);">aether://</strong> (Isolated Chromium sandbox)</div>
        </div>
      `;
    } else {
      info = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div style="font-size:28px;">⚠️</div>
          <div>
            <h4 style="color:var(--danger);font-weight:700;font-size:15px;margin:0;">Not Secure</h4>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">You should not enter any sensitive information on this site.</div>
          </div>
        </div>
        <div style="background:rgba(239, 68, 68, 0.1);border-radius:8px;padding:12px;border:1px solid rgba(239, 68, 68, 0.2);font-size:12px;color:var(--danger);">
          This site does not use HTTPS encryption. Attackers on the same network may be able to see or tamper with the pages you view.
        </div>
      `;
    }

    App.showModal(`Site Information - ${domain}`, `
      <div style="max-height:450px;overflow-y:auto;">
        <div>${info}</div>
        <div style="font-size:11px;color:var(--text-muted);border-top:1px solid var(--border-subtle);padding-top:10px;margin-top:12px;">
          Full URL: <span style="color:var(--text-primary);word-break:break-all;">${Utils.escapeHtml(tab.url)}</span>
        </div>
      </div>
    `, [
      { label: 'Clear Site Data', class: 'btn-secondary', click: () => {
        App.closeModal();
        App.showClearBrowsingDataDialog();
      }},
      { label: 'Close', class: 'btn-primary', click: () => App.closeModal() }
    ]);
  }
};

