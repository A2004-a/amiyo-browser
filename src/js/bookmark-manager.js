const BookmarksBar = {
  barEl: null,

  init() {
    this.barEl = document.getElementById('bookmarks-bar');
    this.render();
  },

  render() {
    if (!this.barEl) return;
    this.barEl.innerHTML = '';

    if (State.settings.showBookmarksBar === false) {
      this.barEl.classList.add('hidden');
      return;
    }
    this.barEl.classList.remove('hidden');

    State.bookmarks.forEach(bm => {
      const item = document.createElement('div');
      item.className = 'bookmark-bar-item';
      item.title = `${bm.title}\n${bm.url}`;

      const icon = bm.favicon
        ? `<img src="${Utils.escapeHtml(bm.favicon)}" onerror="this.onerror=null; this.style.display='none';" />`
        : Utils.icons.globe;

      item.innerHTML = `
        ${icon}
        <span>${Utils.escapeHtml(bm.title)}</span>
      `;

      item.addEventListener('click', () => {
        IpcClient.navigateTab(State.activeTabId, bm.url);
      });

      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        BookmarkManager.showEditDialog(bm);
      });

      this.barEl.appendChild(item);
    });
  }
};

const BookmarkManager = {
  render(container) {
    container.innerHTML = `
      <div class="manager-page">
        <div class="manager-header">
          <div class="manager-title-row">
            <h2 class="manager-title">Bookmarks</h2>
          </div>
          <div class="manager-actions">
            <div class="manager-search-box">
              ${Utils.icons.search}
              <input type="text" id="bm-search" placeholder="Search bookmarks..." />
            </div>
            <button class="btn-secondary" id="bm-import-btn">Import</button>
            <button class="btn-secondary" id="bm-export-btn">Export</button>
            <button class="btn-primary" id="bm-add-btn">Add Bookmark</button>
            <input type="file" id="bm-file-input" accept=".json" style="display:none;" />
          </div>
        </div>
        <div class="bookmarks-grid" id="bm-list"></div>
      </div>
    `;

    const listEl = container.querySelector('#bm-list');
    const searchInput = container.querySelector('#bm-search');

    const renderList = (filter = '') => {
      listEl.innerHTML = '';
      const filtered = State.bookmarks.filter(b =>
        b.title.toLowerCase().includes(filter.toLowerCase()) ||
        b.url.toLowerCase().includes(filter.toLowerCase())
      );

      if (filtered.length === 0) {
        listEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">No bookmarks found.</div>`;
        return;
      }

      filtered.forEach(bm => {
        const card = document.createElement('div');
        card.className = 'bookmark-card';
        card.innerHTML = `
          <div class="bookmark-card-icon">
            ${bm.favicon ? `<img src="${Utils.escapeHtml(bm.favicon)}" onerror="this.onerror=null; this.style.display='none';" />` : Utils.icons.globe}
          </div>
          <div class="bookmark-card-info">
            <div class="bookmark-card-title">${Utils.escapeHtml(bm.title)}</div>
            <div class="bookmark-card-url">${Utils.escapeHtml(bm.url)}</div>
          </div>
          <div class="bookmark-card-actions">
            <button class="card-action-btn edit-btn" title="Edit bookmark">${Utils.icons.more}</button>
            <button class="card-action-btn delete-btn" title="Delete bookmark">${Utils.icons.trash}</button>
          </div>
        `;

        card.querySelector('.bookmark-card-info').addEventListener('click', () => {
          IpcClient.navigateTab(State.activeTabId, bm.url);
        });

        card.querySelector('.edit-btn').addEventListener('click', () => {
          this.showEditDialog(bm);
        });

        card.querySelector('.delete-btn').addEventListener('click', async () => {
          await IpcClient.removeBookmark(bm.id);
          State.bookmarks = await IpcClient.getBookmarks();
          BookmarksBar.render();
          renderList(searchInput.value);
        });

        listEl.appendChild(card);
      });
    };

    renderList();

    searchInput.addEventListener('input', (e) => {
      renderList(e.target.value);
    });

    container.querySelector('#bm-add-btn').addEventListener('click', () => {
      this.showAddDialog(() => renderList(searchInput.value));
    });

    container.querySelector('#bm-import-btn').addEventListener('click', () => {
      container.querySelector('#bm-file-input').click();
    });

    container.querySelector('#bm-file-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            await IpcClient.importBookmarks(event.target.result);
            State.bookmarks = await IpcClient.getBookmarks();
            BookmarksBar.render();
            renderList(searchInput.value);
          } catch (err) {
            console.error('Bookmark import failed:', err);
          }
        };
        reader.readAsText(file);
      }
    });

    container.querySelector('#bm-export-btn').addEventListener('click', async () => {
      const json = await IpcClient.exportBookmarks();
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `aether-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    });
  },

  showAddDialog(onSuccess) {
    App.showModal('Add Bookmark', `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div>
          <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px;">Title</label>
          <input type="text" id="bm-title-input" class="settings-input" style="width:100%;" placeholder="Bookmark Title" />
        </div>
        <div>
          <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px;">URL</label>
          <input type="text" id="bm-url-input" class="settings-input" style="width:100%;" placeholder="https://example.com" />
        </div>
      </div>
    `, [
      { label: 'Cancel', class: 'btn-secondary', click: () => App.closeModal() },
      {
        label: 'Save',
        class: 'btn-primary',
        click: async () => {
          const title = document.getElementById('bm-title-input').value.trim();
          const url = document.getElementById('bm-url-input').value.trim();
          if (url) {
            await IpcClient.addBookmark({
              title: title || url,
              url: url.startsWith('http') ? url : `https://${url}`,
              favicon: Utils.getFaviconUrl(url)
            });
            State.bookmarks = await IpcClient.getBookmarks();
            BookmarksBar.render();
            App.closeModal();
            if (onSuccess) onSuccess();
          }
        }
      }
    ]);
  },

  showEditDialog(bm) {
    App.showModal('Edit Bookmark', `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div>
          <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px;">Title</label>
          <input type="text" id="bm-edit-title" class="settings-input" style="width:100%;" value="${Utils.escapeHtml(bm.title)}" />
        </div>
        <div>
          <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px;">URL</label>
          <input type="text" id="bm-edit-url" class="settings-input" style="width:100%;" value="${Utils.escapeHtml(bm.url)}" />
        </div>
      </div>
    `, [
      { label: 'Cancel', class: 'btn-secondary', click: () => App.closeModal() },
      {
        label: 'Delete',
        class: 'btn-danger',
        click: async () => {
          await IpcClient.removeBookmark(bm.id);
          State.bookmarks = await IpcClient.getBookmarks();
          BookmarksBar.render();
          App.closeModal();
          const internalContainer = document.getElementById('internal-page-container');
          const activeUrl = State.getActiveTab()?.url;
          if (activeUrl === 'aether://bookmarks' || activeUrl === 'amiyo://bookmarks') {
            this.render(internalContainer);
          }
        }
      },
      {
        label: 'Save Changes',
        class: 'btn-primary',
        click: async () => {
          const title = document.getElementById('bm-edit-title').value.trim();
          const url = document.getElementById('bm-edit-url').value.trim();
          if (url) {
            await IpcClient.updateBookmark(bm.id, { title, url });
            State.bookmarks = await IpcClient.getBookmarks();
            BookmarksBar.render();
            App.closeModal();
            const internalContainer = document.getElementById('internal-page-container');
            const activeUrl = State.getActiveTab()?.url;
            if (activeUrl === 'aether://bookmarks' || activeUrl === 'amiyo://bookmarks') {
              this.render(internalContainer);
            }
          }
        }
      }
    ]);
  }
};

