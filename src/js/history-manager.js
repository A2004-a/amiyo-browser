const HistoryManager = {
  render(container) {
    container.innerHTML = `
      <div class="manager-page">
        <div class="manager-header">
          <div class="manager-title-row">
            <h2 class="manager-title">Browsing History</h2>
          </div>
          <div class="manager-actions">
            <div class="manager-search-box">
              ${Utils.icons.search}
              <input type="text" id="hist-search" placeholder="Search history..." />
            </div>
            <button class="btn-danger" id="clear-hist-btn">Clear Browsing Data</button>
          </div>
        </div>
        <div id="hist-list"></div>
      </div>
    `;

    const listEl = container.querySelector('#hist-list');
    const searchInput = container.querySelector('#hist-search');

    const renderList = (filter = '') => {
      listEl.innerHTML = '';
      const filtered = State.history.filter(h =>
        h.title.toLowerCase().includes(filter.toLowerCase()) ||
        h.url.toLowerCase().includes(filter.toLowerCase())
      );

      if (filtered.length === 0) {
        listEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">No history records found.</div>`;
        return;
      }

      // Group by date string
      const groups = {};
      filtered.forEach(item => {
        const dateKey = Utils.formatDate(item.timestamp);
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(item);
      });

      for (const [dateLabel, items] of Object.entries(groups)) {
        const groupEl = document.createElement('div');
        groupEl.className = 'history-date-group';
        groupEl.innerHTML = `<div class="history-date-heading">${Utils.escapeHtml(dateLabel)}</div>`;

        items.forEach(h => {
          const itemEl = document.createElement('div');
          itemEl.className = 'history-item';
          itemEl.innerHTML = `
            <span class="history-time">${Utils.formatTime(h.timestamp)}</span>
            <div class="history-icon">
              ${h.favicon ? `<img src="${Utils.escapeHtml(h.favicon)}" onerror="this.onerror=null; this.style.display='none';" />` : Utils.icons.globe}
            </div>
            <div class="history-info">
              <span class="history-title">${Utils.escapeHtml(h.title)}</span>
              <span class="history-url">${Utils.escapeHtml(h.url)}</span>
            </div>
            <div class="history-actions">
              <button class="card-action-btn delete-btn" title="Remove from history">${Utils.icons.close}</button>
            </div>
          `;

          itemEl.querySelector('.history-info').addEventListener('click', () => {
            IpcClient.navigateTab(State.activeTabId, h.url);
          });

          itemEl.querySelector('.delete-btn').addEventListener('click', async () => {
            await IpcClient.deleteHistoryItem(h.id);
            State.history = await IpcClient.getHistory();
            renderList(searchInput.value);
          });

          groupEl.appendChild(itemEl);
        });

        listEl.appendChild(groupEl);
      }
    };

    renderList();

    searchInput.addEventListener('input', (e) => {
      renderList(e.target.value);
    });

    container.querySelector('#clear-hist-btn').addEventListener('click', () => {
      this.showClearHistoryDialog(() => renderList(searchInput.value));
    });
  },

  showClearHistoryDialog(onSuccess) {
    App.showModal('Clear Browsing Data', `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <p style="font-size:13px;color:var(--text-secondary);">Select the time range of browsing history to remove:</p>
        <div>
          <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:6px;">Time Range</label>
          <select id="clear-range-select" class="settings-select" style="width:100%;">
            <option value="hour">Last hour</option>
            <option value="today">Today</option>
            <option value="week">Past 7 days</option>
            <option value="all" selected>All time</option>
          </select>
        </div>
      </div>
    `, [
      { label: 'Cancel', class: 'btn-secondary', click: () => App.closeModal() },
      {
        label: 'Clear Data',
        class: 'btn-danger',
        click: async () => {
          const range = document.getElementById('clear-range-select').value;
          await IpcClient.clearHistory(range);
          State.history = await IpcClient.getHistory();
          App.closeModal();
          if (onSuccess) onSuccess();
        }
      }
    ]);
  }
};

