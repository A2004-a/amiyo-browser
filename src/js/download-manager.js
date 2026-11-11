const DownloadManager = {
  toolBtnEl: null,
  badgeEl: null,

  init() {
    this.toolBtnEl = document.getElementById('downloads-tool-btn');
    if (this.toolBtnEl) {
      this.toolBtnEl.innerHTML = `${Utils.icons.download}<span class="badge-counter hidden" id="dl-badge">0</span>`;
      this.badgeEl = this.toolBtnEl.querySelector('#dl-badge');

      this.toolBtnEl.addEventListener('click', () => {
        IpcClient.createTab('amiyo://downloads');
      });
    }

    // Listen to download events from electron
    window.amiyoAPI.downloads.onStarted((item) => {
      this.handleDownloadUpdate(item);
    });

    window.amiyoAPI.downloads.onProgress((item) => {
      this.handleDownloadUpdate(item);
    });

    window.amiyoAPI.downloads.onCompleted((item) => {
      this.handleDownloadUpdate(item);
    });
  },

  handleDownloadUpdate(item) {
    const idx = State.downloads.findIndex(d => d.id === item.id);
    if (idx !== -1) {
      State.downloads[idx] = { ...State.downloads[idx], ...item };
    } else {
      State.downloads.unshift(item);
    }

    this.updateBadge();

    // If active tab is on downloads page, re-render
    const activeTab = State.getActiveTab();
    if (activeTab?.url === 'amiyo://downloads') {
      const container = document.getElementById('internal-page-container');
      if (container) {
        this.render(container);
      }
    }
  },

  updateBadge() {
    if (!this.badgeEl) return;
    const activeCount = State.downloads.filter(d => d.state === 'progressing').length;
    if (activeCount > 0) {
      this.badgeEl.textContent = activeCount;
      this.badgeEl.classList.remove('hidden');
    } else {
      this.badgeEl.classList.add('hidden');
    }
  },

  render(container) {
    container.innerHTML = `
      <div class="manager-page">
        <div class="manager-header">
          <div class="manager-title-row">
            <h2 class="manager-title">Downloads</h2>
          </div>
          <div class="manager-actions">
            <button class="btn-secondary" id="clear-dl-btn">Clear All</button>
          </div>
        </div>
        <div id="dl-list"></div>
      </div>
    `;

    const listEl = container.querySelector('#dl-list');

    if (State.downloads.length === 0) {
      listEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">No downloads yet.</div>`;
    } else {
      State.downloads.forEach(dl => {
        const itemEl = document.createElement('div');
        itemEl.className = 'download-item';

        const isProgressing = dl.state === 'progressing';
        const isCompleted = dl.state === 'completed';

        let speedText = '';
        if (isProgressing && dl.speed > 0) {
          speedText = ` • ${Utils.formatBytes(dl.speed)}/s`;
        }

        let statusText = dl.state;
        if (isCompleted) statusText = 'Completed';
        else if (isProgressing) statusText = `${dl.percent || 0}%`;

        itemEl.innerHTML = `
          <div class="download-main-row">
            <div class="download-icon">${Utils.icons.download}</div>
            <div class="download-details">
              <span class="download-name" title="Open file">${Utils.escapeHtml(dl.filename)}</span>
              <div class="download-meta">
                <span>${Utils.formatBytes(dl.receivedBytes)} of ${Utils.formatBytes(dl.totalBytes)}${speedText}</span>
                <span>•</span>
                <span style="text-transform:capitalize;color:${isCompleted ? 'var(--success)' : 'var(--text-muted)'};">${statusText}</span>
              </div>
            </div>
            <div class="download-actions">
              ${isProgressing ? `
                <button class="btn-secondary btn-sm cancel-btn">Cancel</button>
              ` : ''}
              ${isCompleted ? `
                <button class="btn-secondary btn-sm show-folder-btn">Show in folder</button>
              ` : ''}
            </div>
          </div>
          ${isProgressing ? `
            <div class="download-progress-track">
              <div class="download-progress-bar" style="width: ${dl.percent || 0}%"></div>
            </div>
          ` : ''}
        `;

        itemEl.querySelector('.download-name')?.addEventListener('click', () => {
          if (dl.savePath) {
            IpcClient.openDownloadFile(dl.savePath);
          }
        });

        itemEl.querySelector('.cancel-btn')?.addEventListener('click', () => {
          IpcClient.cancelDownload(dl.id);
        });

        itemEl.querySelector('.show-folder-btn')?.addEventListener('click', () => {
          if (dl.savePath) {
            IpcClient.showDownloadInFolder(dl.savePath);
          }
        });

        listEl.appendChild(itemEl);
      });
    }

    container.querySelector('#clear-dl-btn')?.addEventListener('click', async () => {
      await IpcClient.clearDownloads();
      State.downloads = [];
      this.updateBadge();
      this.render(container);
    });
  }
};

