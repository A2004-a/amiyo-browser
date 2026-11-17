/**
 * AETHER Notes — Notes & Checklists
 * Features:
 * - Multi-note management with Pinned & Others sections
 * - Rich Note Types: Plain Text, Todo Checklists, and Web Clips
 * - 10 Vibrant color accents (coral, peach, sand, mint, sage, fog, storm, blossom, clay)
 * - 1-Click "Clip Page": saves active tab's title & URL with direct web navigation
 * - Live instant search & category pill filtering
 * - Checkbox interaction directly from cards
 * - Auto-saving to localStorage with legacy migration
 * - Markdown & JSON export
 */

const KeepNotes = {
  STORAGE_KEY: 'aether_keep_notes',
  LEGACY_KEY: 'aether_quick_notes',

  notes: [],
  activeFilter: 'all', // 'all' | 'pinned' | 'checklist' | 'webclip'
  searchQuery: '',
  creatorState: {
    isExpanded: false,
    isChecklist: false,
    color: 'default',
    pinned: false,
    attachedClip: null,
    checklistItems: []
  },

  init() {
    this.loadNotes();
    this.cacheDom();
    this.bindEvents();
    this.render();
  },

  cacheDom() {
    this.panelEl = document.getElementById('quick-notes-panel');
    this.notesBtn = document.getElementById('notes-tool-btn');
    this.closeBtn = document.getElementById('keep-close-btn');
    this.addBtn = document.getElementById('keep-add-btn');
    this.bulkAddBtn = document.getElementById('keep-bulk-add-btn');
    this.exportBtn = document.getElementById('keep-export-btn');
    this.countBadge = document.getElementById('keep-notes-count-badge');
    this.searchInput = document.getElementById('keep-search-input');
    this.searchClearBtn = document.getElementById('keep-search-clear');
    this.filterPills = document.querySelectorAll('.keep-pill');

    // Creator elements
    this.createCard = document.getElementById('keep-create-card');
    this.collapsedBox = document.getElementById('keep-create-collapsed');
    this.expandedBox = document.getElementById('keep-create-expanded');
    this.inputTitle = document.getElementById('keep-input-title');
    this.inputBody = document.getElementById('keep-input-body');
    this.createPinBtn = document.getElementById('keep-create-pin-btn');
    this.checklistContainer = document.getElementById('keep-checklist-container');
    this.checklistItemsEl = document.getElementById('keep-checklist-items');
    this.checklistNewInput = document.getElementById('keep-checklist-new-input');
    this.attachedClipEl = document.getElementById('keep-attached-clip');
    this.clipTitleEl = document.getElementById('keep-clip-title');
    this.clipUrlEl = document.getElementById('keep-clip-url');
    this.clipRemoveBtn = document.getElementById('keep-clip-remove-btn');
    this.colorPaletteBtn = document.getElementById('keep-color-palette-btn');
    this.colorMenu = document.getElementById('keep-color-menu');
    this.toggleChecklistBtn = document.getElementById('keep-toggle-checklist-btn');
    this.attachTabBtn = document.getElementById('keep-attach-tab-btn');
    this.cancelBtn = document.getElementById('keep-cancel-btn');
    this.saveBtn = document.getElementById('keep-save-btn');
    this.saveAndAddBtn = document.getElementById('keep-save-and-add-btn');
    this.quickNewNoteBtn = document.getElementById('quick-new-note-btn');
    this.quickListBtn = document.getElementById('quick-new-list-btn');
    this.quickClipBtn = document.getElementById('quick-clip-page-btn');
    this.fabAddBtn = document.getElementById('keep-fab-add-btn');

    // Grids
    this.scrollContainer = document.getElementById('keep-notes-scroll');
    this.pinnedSection = document.getElementById('keep-pinned-section');
    this.pinnedGrid = document.getElementById('keep-pinned-grid');
    this.othersSection = document.getElementById('keep-others-section');
    this.othersTitle = document.getElementById('keep-others-title');
    this.othersGrid = document.getElementById('keep-others-grid');
    this.emptyState = document.getElementById('keep-empty-state');
    this.clearAllBtn = document.getElementById('keep-clear-all-btn');
  },

  bindEvents() {
    // Panel Toggle & New Note Actions
    this.notesBtn?.addEventListener('click', () => this.toggle());
    this.closeBtn?.addEventListener('click', () => this.close());
    this.addBtn?.addEventListener('click', () => this.startNewNote());
    this.fabAddBtn?.addEventListener('click', () => this.startNewNote());
    this.bulkAddBtn?.addEventListener('click', () => this.openBulkAddModal());
    this.quickNewNoteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.startNewNote();
    });

    // Search with requestAnimationFrame debounce for instant, lag-free filtering
    this.searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.searchClearBtn?.classList.toggle('hidden', !this.searchQuery);
      if (this._searchFrame) cancelAnimationFrame(this._searchFrame);
      this._searchFrame = requestAnimationFrame(() => {
        this.render();
      });
    });

    this.searchClearBtn?.addEventListener('click', () => {
      if (this.searchInput) this.searchInput.value = '';
      this.searchQuery = '';
      this.searchClearBtn?.classList.add('hidden');
      this.render();
    });

    // Category Filter Pills
    this.filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        this.filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeFilter = pill.dataset.filter || 'all';
        this.render();
      });
    });

    // Creator Expand
    this.collapsedBox?.addEventListener('click', () => this.expandCreator(false));
    this.quickListBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.expandCreator(true);
    });
    this.quickClipBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.expandCreator(false);
      this.attachCurrentTab();
    });

    // Pin toggle in creator
    this.createPinBtn?.addEventListener('click', () => {
      this.creatorState.pinned = !this.creatorState.pinned;
      this.createPinBtn.classList.toggle('pinned', this.creatorState.pinned);
    });

    // Checklist mode toggle in creator
    this.toggleChecklistBtn?.addEventListener('click', () => {
      this.creatorState.isChecklist = !this.creatorState.isChecklist;
      this.updateCreatorInputMode();
    });

    // Add checklist item on Enter
    this.checklistNewInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        e.preventDefault();
        this.addChecklistItem(e.target.value.trim());
        e.target.value = '';
      }
    });

    // Attach active web page
    this.attachTabBtn?.addEventListener('click', () => this.attachCurrentTab());
    this.clipRemoveBtn?.addEventListener('click', () => this.removeAttachedClip());

    // Color picker
    this.colorPaletteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.colorMenu?.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!this.colorPaletteBtn?.contains(e.target) && !this.colorMenu?.contains(e.target)) {
        this.colorMenu?.classList.add('hidden');
      }
    });

    this.colorMenu?.querySelectorAll('.keep-color-circle').forEach(circle => {
      circle.addEventListener('click', (e) => {
        const color = e.currentTarget.dataset.color || 'default';
        this.setCreatorColor(color);
        this.colorMenu.classList.add('hidden');
      });
    });

    // Cancel / Save / Save & Add Another
    this.cancelBtn?.addEventListener('click', () => this.collapseCreator(false));
    this.saveBtn?.addEventListener('click', () => this.saveFromCreator());
    this.saveAndAddBtn?.addEventListener('click', () => this.saveAndAddAnother());

    // Keyboard shortcuts in creator inputs: Ctrl+Enter (Save), Ctrl+Shift+Enter (Save & Add Another)
    const handleCreatorKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          this.saveAndAddAnother();
        } else {
          this.saveFromCreator();
        }
      } else if (e.key === 'Escape') {
        this.collapseCreator(false);
      }
    };
    this.inputTitle?.addEventListener('keydown', handleCreatorKey);
    this.inputBody?.addEventListener('keydown', handleCreatorKey);

    // Export & Clear All
    this.exportBtn?.addEventListener('click', () => this.exportNotes());
    this.clearAllBtn?.addEventListener('click', () => this.clearAllNotes());
  },

  loadNotes() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        this.notes = JSON.parse(raw);
      } else {
        // Migrate legacy quick notes if present
        const legacy = localStorage.getItem(this.LEGACY_KEY);
        if (legacy && legacy.trim()) {
          this.notes = [{
            id: 'note_' + Date.now(),
            title: 'Quick Research Notes',
            content: legacy.trim(),
            type: 'text',
            checklist: [],
            color: 'default',
            pinned: true,
            webClip: null,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }];
          this.persistNotes();
        } else {
          // Welcome starter note
          this.notes = [{
            id: 'note_welcome',
            title: '💡 Welcome to AETHER Notes!',
            content: 'Take research notes, save todo checklists, and clip web pages while you browse without losing your focus.\n\n• Click 📌 to pin important notes\n• Click ☑️ for todo checklists\n• Click 🔗 to clip current tabs',
            type: 'text',
            checklist: [],
            color: 'peach',
            pinned: true,
            webClip: null,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }];
          this.persistNotes();
        }
      }
    } catch (e) {
      console.warn('[KeepNotes] load error:', e);
      this.notes = [];
    }
  },

  persistNotes(immediate = false) {
    if (immediate) {
      if (this._persistTimer) clearTimeout(this._persistTimer);
      this._persistTimer = null;
      this._doPersist();
      return;
    }
    if (this._persistTimer) return;
    this._persistTimer = setTimeout(() => {
      this._persistTimer = null;
      this._doPersist();
    }, 150);
  },

  _doPersist() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.notes));
      // Keep legacy key in sync with all note texts for backward compatibility
      const allText = this.notes.map(n => `### ${n.title}\n${n.content || ''}`).join('\n\n');
      localStorage.setItem(this.LEGACY_KEY, allText);
    } catch (e) {
      console.warn('[KeepNotes] persist error:', e);
    }
  },

  isOpen() {
    return !!(this.panelEl && !this.panelEl.classList.contains('hidden'));
  },

  toggle() {
    if (!this.panelEl) return;
    const isHidden = this.panelEl.classList.toggle('hidden');
    this.notesBtn?.classList.toggle('active', !isHidden);
    const isMobile = window.innerWidth < 768;
    if (typeof IpcClient !== 'undefined' && IpcClient.setSideOffset) {
      IpcClient.setSideOffset(!isHidden && !isMobile ? 360 : 0);
    }
    if (!isHidden) {
      this.render();
      setTimeout(() => this.collapsedBox?.focus(), 50);
    }
  },

  close() {
    if (!this.panelEl) return;
    this.panelEl.classList.add('hidden');
    this.notesBtn?.classList.remove('active');
    if (typeof IpcClient !== 'undefined' && IpcClient.setSideOffset) {
      IpcClient.setSideOffset(0);
    }
  },

  startNewNote(isChecklist = false) {
    if (!this.isOpen()) {
      this.toggle();
    }
    if (this.scrollContainer) {
      this.scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
    this.expandCreator(isChecklist);
    setTimeout(() => {
      if (this.inputTitle) {
        this.inputTitle.focus();
      }
      this.createCard?.classList.add('keep-pulse-glow');
      setTimeout(() => this.createCard?.classList.remove('keep-pulse-glow'), 600);
    }, 50);
  },

  expandCreator(isChecklist = false) {
    this.creatorState.isExpanded = true;
    this.creatorState.isChecklist = isChecklist;
    this.collapsedBox?.classList.add('hidden');
    this.expandedBox?.classList.remove('hidden');
    this.createCard?.classList.add('expanded');
    this.updateCreatorInputMode();
    this.inputTitle?.focus();
  },

  collapseCreator(saveIfNotEmpty = true) {
    if (saveIfNotEmpty) {
      const title = this.inputTitle?.value.trim() || '';
      const body = this.inputBody?.value.trim() || '';
      const hasChecklist = this.creatorState.checklistItems.length > 0;
      const hasClip = !!this.creatorState.attachedClip;
      if (title || body || hasChecklist || hasClip) {
        this.saveFromCreator();
        return;
      }
    }

    this.creatorState.isExpanded = false;
    this.creatorState.isChecklist = false;
    this.creatorState.color = 'default';
    this.creatorState.pinned = false;
    this.creatorState.attachedClip = null;
    this.creatorState.checklistItems = [];

    if (this.inputTitle) this.inputTitle.value = '';
    if (this.inputBody) this.inputBody.value = '';
    if (this.createPinBtn) this.createPinBtn.classList.remove('pinned');
    if (this.attachedClipEl) this.attachedClipEl.classList.add('hidden');
    if (this.checklistItemsEl) this.checklistItemsEl.innerHTML = '';
    if (this.createCard) {
      this.createCard.style.background = '';
      this.createCard.classList.remove('expanded');
    }

    this.collapsedBox?.classList.remove('hidden');
    this.expandedBox?.classList.add('hidden');
  },

  updateCreatorInputMode() {
    if (this.creatorState.isChecklist) {
      this.inputBody?.classList.add('hidden');
      this.checklistContainer?.classList.remove('hidden');
      this.toggleChecklistBtn?.classList.add('active');
      this.checklistNewInput?.focus();
    } else {
      this.inputBody?.classList.remove('hidden');
      this.checklistContainer?.classList.add('hidden');
      this.toggleChecklistBtn?.classList.remove('active');
      this.inputBody?.focus();
    }
  },

  addChecklistItem(text) {
    if (!text) return;
    this.creatorState.checklistItems.push({ text, done: false });
    this.renderCreatorChecklistItems();
  },

  removeCreatorChecklistItem(index) {
    this.creatorState.checklistItems.splice(index, 1);
    this.renderCreatorChecklistItems();
  },

  renderCreatorChecklistItems() {
    if (!this.checklistItemsEl) return;
    this.checklistItemsEl.innerHTML = this.creatorState.checklistItems.map((item, idx) => `
      <div class="keep-checklist-item" data-idx="${idx}">
        <input type="checkbox" class="keep-check-box" ${item.done ? 'checked' : ''} onchange="KeepNotes.onCreatorItemToggle(${idx}, this.checked)" />
        <span class="keep-check-text ${item.done ? 'done' : ''}">${Utils.escapeHtml(item.text)}</span>
        <button class="keep-check-del" onclick="KeepNotes.removeCreatorChecklistItem(${idx})" title="Delete item">✕</button>
      </div>
    `).join('');
  },

  onCreatorItemToggle(index, checked) {
    if (this.creatorState.checklistItems[index]) {
      this.creatorState.checklistItems[index].done = checked;
      this.renderCreatorChecklistItems();
    }
  },

  setCreatorColor(color) {
    this.creatorState.color = color;
    if (this.createCard) {
      this.createCard.dataset.color = color;
      const colorMap = {
        default: '',
        coral: '#5C2B29',
        peach: '#614A19',
        sand: '#635D19',
        mint: '#345920',
        sage: '#16504B',
        fog: '#2D555E',
        storm: '#1E3A5F',
        blossom: '#42275E',
        clay: '#442F19'
      };
      this.createCard.style.background = colorMap[color] || '';
    }
  },

  attachCurrentTab() {
    if (typeof State === 'undefined') return;
    const tab = State.getActiveTab();
    if (!tab || !tab.url || tab.url.startsWith('amiyo://') || tab.url.startsWith('aether://')) {
      alert('Open a live website tab (HTTP/HTTPS) to clip it into notes.');
      return;
    }

    this.creatorState.attachedClip = {
      title: tab.title || 'Web Page',
      url: tab.url,
      favIconUrl: tab.favIconUrl || ''
    };

    if (this.clipTitleEl) this.clipTitleEl.textContent = tab.title || tab.url;
    if (this.clipUrlEl) this.clipUrlEl.textContent = tab.url;
    this.attachedClipEl?.classList.remove('hidden');

    // If title input is empty, prefill with page title
    if (this.inputTitle && !this.inputTitle.value.trim()) {
      this.inputTitle.value = tab.title || '';
    }
  },

  removeAttachedClip() {
    this.creatorState.attachedClip = null;
    this.attachedClipEl?.classList.add('hidden');
  },

  saveFromCreator() {
    const title = this.inputTitle?.value.trim() || '';
    const body = this.inputBody?.value.trim() || '';
    const items = [...this.creatorState.checklistItems];
    const clip = this.creatorState.attachedClip;

    if (!title && !body && items.length === 0 && !clip) {
      this.collapseCreator(false);
      return;
    }

    const newNote = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: title || (clip ? clip.title : (items[0]?.text || 'Untitled Note')),
      content: body,
      type: this.creatorState.isChecklist ? 'checklist' : 'text',
      checklist: items,
      color: this.creatorState.color || 'default',
      pinned: this.creatorState.pinned,
      webClip: clip,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.notes.unshift(newNote);
    this.persistNotes();
    this.collapseCreator(false);
    this.render();
    this.showToast('✓ Note saved to AETHER Notes');
  },

  saveAndAddAnother() {
    const title = this.inputTitle?.value.trim() || '';
    const body = this.inputBody?.value.trim() || '';
    const items = [...this.creatorState.checklistItems];
    const clip = this.creatorState.attachedClip;

    if (!title && !body && items.length === 0 && !clip) {
      if (this.inputTitle) this.inputTitle.focus();
      return;
    }

    const newNote = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: title || (clip ? clip.title : (items[0]?.text || 'Untitled Note')),
      content: body,
      type: this.creatorState.isChecklist ? 'checklist' : 'text',
      checklist: items,
      color: this.creatorState.color || 'default',
      pinned: this.creatorState.pinned,
      webClip: clip,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.notes.unshift(newNote);
    this.persistNotes();
    this.render();

    // Reset creator fields for the next note without collapsing
    if (this.inputTitle) this.inputTitle.value = '';
    if (this.inputBody) this.inputBody.value = '';
    this.creatorState.checklistItems = [];
    this.creatorState.attachedClip = null;
    if (this.checklistItemsEl) this.checklistItemsEl.innerHTML = '';
    if (this.attachedClipEl) this.attachedClipEl.classList.add('hidden');

    this.showToast('✓ Note saved! Type your next note...');
    if (this.creatorState.isChecklist) {
      this.checklistNewInput?.focus();
    } else {
      this.inputTitle?.focus();
    }
    this.createCard?.classList.add('keep-pulse-glow');
    setTimeout(() => this.createCard?.classList.remove('keep-pulse-glow'), 600);
  },

  toggleNotePin(id, e) {
    if (e) e.stopPropagation();
    const note = this.notes.find(n => n.id === id);
    if (note) {
      note.pinned = !note.pinned;
      note.updatedAt = Date.now();
      this.persistNotes();
      this.render();
    }
  },

  deleteNote(id, e) {
    if (e) e.stopPropagation();
    this.notes = this.notes.filter(n => n.id !== id);
    this.persistNotes();
    this.render();
    this.showToast('✓ Note deleted');
  },

  duplicateNote(id, e) {
    if (e) e.stopPropagation();
    const note = this.notes.find(n => n.id === id);
    if (!note) return;
    const copy = JSON.parse(JSON.stringify(note));
    copy.id = 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    copy.title = (copy.title || 'Untitled Note') + ' (Copy)';
    copy.createdAt = Date.now();
    copy.updatedAt = Date.now();
    this.notes.unshift(copy);
    this.persistNotes();
    this.render();
    this.showToast('✓ Note duplicated');
  },

  changeNoteColor(id, color, e) {
    if (e) e.stopPropagation();
    const note = this.notes.find(n => n.id === id);
    if (note) {
      note.color = color;
      note.updatedAt = Date.now();
      this.persistNotes();
      this.render();
    }
  },

  toggleCardCheckItem(noteId, itemIdx, e) {
    if (e) e.stopPropagation();
    const note = this.notes.find(n => n.id === noteId);
    if (note && note.checklist && note.checklist[itemIdx]) {
      note.checklist[itemIdx].done = !note.checklist[itemIdx].done;
      note.updatedAt = Date.now();
      this.persistNotes();
      this.render();
    }
  },

  copyNoteContent(id, e) {
    if (e) e.stopPropagation();
    const note = this.notes.find(n => n.id === id);
    if (!note) return;
    let text = `${note.title}\n\n`;
    if (note.type === 'checklist') {
      text += (note.checklist || []).map(i => `${i.done ? '[x]' : '[ ]'} ${i.text}`).join('\n');
    } else {
      text += note.content || '';
    }
    if (note.webClip) {
      text += `\n\nLink: ${note.webClip.url}`;
    }
    navigator.clipboard.writeText(text);
  },

  openWebClipUrl(url, e) {
    if (e) e.stopPropagation();
    if (url && typeof IpcClient !== 'undefined') {
      IpcClient.createTab(url);
    }
  },

  editNote(id) {
    const note = this.notes.find(n => n.id === id);
    if (!note || typeof App === 'undefined') return;

    let bodyFields = '';
    if (note.type === 'checklist') {
      bodyFields = `
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;" id="modal-checklist-rows">
          ${(note.checklist || []).map((item, idx) => `
            <div style="display:flex;align-items:center;gap:8px;">
              <input type="checkbox" ${item.done ? 'checked' : ''} data-idx="${idx}" class="modal-check-box" />
              <input type="text" value="${Utils.escapeHtml(item.text)}" data-idx="${idx}" class="settings-input modal-check-text ${item.done ? 'done' : ''}" style="flex:1;" />
              <button class="btn-icon" onclick="this.parentElement.remove()" style="color:#EF4444;">✕</button>
            </div>
          `).join('')}
        </div>
        <button class="btn-secondary" id="modal-add-check-item" style="font-size:11px;padding:4px 10px;margin-bottom:12px;">+ Add checklist item</button>
      `;
    } else {
      bodyFields = `
        <textarea id="modal-note-body" class="settings-input" style="width:100%;height:140px;resize:vertical;font-family:inherit;margin-bottom:12px;">${Utils.escapeHtml(note.content || '')}</textarea>
      `;
    }

    const clipHtml = note.webClip ? `
      <div style="display:flex;align-items:center;gap:8px;padding:8px;background:rgba(56,189,248,0.1);border-radius:6px;border:1px solid rgba(56,189,248,0.3);margin-bottom:12px;">
        <span>🔗</span>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:12px;color:#38BDF8;">${Utils.escapeHtml(note.webClip.title)}</div>
          <div style="font-size:10px;color:var(--text-muted);">${Utils.escapeHtml(note.webClip.url)}</div>
        </div>
      </div>
    ` : '';

    const contentHtml = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <input type="text" id="modal-note-title" class="settings-input" value="${Utils.escapeHtml(note.title)}" placeholder="Title" style="font-weight:700;" />
        ${clipHtml}
        ${bodyFields}
        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:8px;">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;">
            <input type="checkbox" id="modal-note-pinned" ${note.pinned ? 'checked' : ''} />
            <span>📌 Pinned to top</span>
          </label>
          <div style="display:flex;align-items:center;gap:4px;">
            <span style="font-size:11px;color:var(--text-muted);">Color:</span>
            <select id="modal-note-color" class="settings-select" style="font-size:11px;padding:2px 6px;">
              <option value="default" ${note.color === 'default' ? 'selected' : ''}>Default</option>
              <option value="coral" ${note.color === 'coral' ? 'selected' : ''}>Coral</option>
              <option value="peach" ${note.color === 'peach' ? 'selected' : ''}>Peach</option>
              <option value="sand" ${note.color === 'sand' ? 'selected' : ''}>Sand</option>
              <option value="mint" ${note.color === 'mint' ? 'selected' : ''}>Mint</option>
              <option value="sage" ${note.color === 'sage' ? 'selected' : ''}>Sage</option>
              <option value="fog" ${note.color === 'fog' ? 'selected' : ''}>Fog</option>
              <option value="storm" ${note.color === 'storm' ? 'selected' : ''}>Storm</option>
              <option value="blossom" ${note.color === 'blossom' ? 'selected' : ''}>Blossom</option>
              <option value="clay" ${note.color === 'clay' ? 'selected' : ''}>Clay</option>
            </select>
          </div>
        </div>
      </div>
    `;

    App.showModal('Edit AETHER Note', contentHtml, [
      { label: 'Cancel', class: 'btn-secondary', click: () => App.closeModal() },
      {
        label: 'Save Changes',
        class: 'btn-primary',
        click: () => {
          note.title = document.getElementById('modal-note-title')?.value.trim() || 'Untitled Note';
          note.pinned = !!document.getElementById('modal-note-pinned')?.checked;
          note.color = document.getElementById('modal-note-color')?.value || 'default';

          if (note.type === 'checklist') {
            const rows = document.querySelectorAll('#modal-checklist-rows > div');
            note.checklist = Array.from(rows).map(row => {
              const chk = row.querySelector('.modal-check-box');
              const txt = row.querySelector('.modal-check-text');
              return { text: txt?.value.trim() || '', done: !!chk?.checked };
            }).filter(i => i.text);
          } else {
            note.content = document.getElementById('modal-note-body')?.value || '';
          }

          note.updatedAt = Date.now();
          this.persistNotes();
          this.render();
          App.closeModal();
        }
      }
    ]);

    // Handle add checklist item inside edit modal
    document.getElementById('modal-add-check-item')?.addEventListener('click', () => {
      const container = document.getElementById('modal-checklist-rows');
      if (container) {
        const div = document.createElement('div');
        div.style.cssText = 'display:flex;align-items:center;gap:8px;';
        div.innerHTML = `
          <input type="checkbox" class="modal-check-box" />
          <input type="text" class="settings-input modal-check-text" placeholder="List item" style="flex:1;" />
          <button class="btn-icon" onclick="this.parentElement.remove()" style="color:#EF4444;">✕</button>
        `;
        container.appendChild(div);
        div.querySelector('input[type="text"]')?.focus();
      }
    });
  },

  formatTime(timestamp) {
    if (!timestamp) return '';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  },

  showToast(message) {
    const statusText = document.getElementById('keep-status-text');
    if (statusText) {
      const original = '✓ Saved locally in AETHER Vault';
      statusText.textContent = message;
      statusText.style.color = '#F59E0B';
      statusText.style.fontWeight = '600';
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        statusText.textContent = original;
        statusText.style.color = '';
        statusText.style.fontWeight = '';
      }, 2500);
    }
  },

  renderCard(note) {
    let bodyHtml = '';
    if (note.type === 'checklist') {
      const items = (note.checklist || []).slice(0, 5);
      const remaining = (note.checklist || []).length - 5;
      bodyHtml = `
        <div class="keep-card-checklist">
          ${items.map((item, idx) => `
            <div class="keep-card-check-row ${item.done ? 'done' : ''}" onclick="KeepNotes.toggleCardCheckItem('${note.id}', ${idx}, event)">
              <input type="checkbox" class="keep-check-box" ${item.done ? 'checked' : ''} onclick="event.stopPropagation();" onchange="KeepNotes.toggleCardCheckItem('${note.id}', ${idx}, event)" />
              <span>${Utils.escapeHtml(item.text)}</span>
            </div>
          `).join('')}
          ${remaining > 0 ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">+${remaining} more items...</div>` : ''}
        </div>
      `;
    } else if (note.content) {
      bodyHtml = `<div class="keep-card-body">${Utils.escapeHtml(note.content)}</div>`;
    }

    const clipHtml = note.webClip ? `
      <a href="#" class="keep-card-clip-pill" onclick="KeepNotes.openWebClipUrl('${Utils.escapeHtml(note.webClip.url)}', event)" title="${Utils.escapeHtml(note.webClip.url)}">
        <span>🔗</span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escapeHtml(note.webClip.title || note.webClip.url)}</span>
      </a>
    ` : '';

    const timeStr = this.formatTime(note.updatedAt || note.createdAt);
    let badgeText = '';
    if (note.type === 'checklist') {
      const total = (note.checklist || []).length;
      const done = (note.checklist || []).filter(i => i.done).length;
      badgeText = `${done}/${total} tasks`;
    } else if (note.webClip) {
      badgeText = 'Web Clip';
    } else if (note.content) {
      const words = note.content.trim().split(/\s+/).filter(Boolean).length;
      badgeText = `${words} word${words === 1 ? '' : 's'}`;
    }

    return `
      <div class="keep-card" data-id="${note.id}" data-color="${note.color || 'default'}" onclick="KeepNotes.editNote('${note.id}')">
        <div class="keep-card-header">
          <div class="keep-card-title">${Utils.escapeHtml(note.title || '')}</div>
          <button class="keep-card-pin ${note.pinned ? 'pinned' : ''}" title="${note.pinned ? 'Unpin note' : 'Pin note'}" onclick="KeepNotes.toggleNotePin('${note.id}', event)">
            📌
          </button>
        </div>
        ${bodyHtml}
        ${clipHtml}
        <div class="keep-card-meta">
          <span class="keep-card-time">${timeStr}</span>
          ${badgeText ? `<span class="keep-card-badge-pill">${badgeText}</span>` : ''}
        </div>
        <div class="keep-card-actions">
          <button class="keep-action-btn" title="Copy text" onclick="KeepNotes.copyNoteContent('${note.id}', event)">📋</button>
          <button class="keep-action-btn" title="Duplicate note" onclick="KeepNotes.duplicateNote('${note.id}', event)">📑</button>
          <button class="keep-action-btn delete" title="Delete note" onclick="KeepNotes.deleteNote('${note.id}', event)">🗑️</button>
        </div>
      </div>
    `;
  },

  render() {
    let filtered = this.notes;

    // Filter by Search Query
    if (this.searchQuery) {
      filtered = filtered.filter(n => {
        const inTitle = (n.title || '').toLowerCase().includes(this.searchQuery);
        const inContent = (n.content || '').toLowerCase().includes(this.searchQuery);
        const inChecklist = (n.checklist || []).some(i => i.text.toLowerCase().includes(this.searchQuery));
        const inClip = n.webClip && (n.webClip.title.toLowerCase().includes(this.searchQuery) || n.webClip.url.toLowerCase().includes(this.searchQuery));
        return inTitle || inContent || inChecklist || inClip;
      });
    }

    // Filter by Category Pill
    if (this.activeFilter === 'pinned') {
      filtered = filtered.filter(n => n.pinned);
    } else if (this.activeFilter === 'checklist') {
      filtered = filtered.filter(n => n.type === 'checklist');
    } else if (this.activeFilter === 'webclip') {
      filtered = filtered.filter(n => !!n.webClip);
    }

    if (this.countBadge) {
      this.countBadge.textContent = this.notes.length;
    }

    if (filtered.length === 0) {
      if (this.pinnedSection) this.pinnedSection.classList.add('hidden');
      if (this.othersSection) this.othersSection.classList.add('hidden');
      this.emptyState?.classList.remove('hidden');
      return;
    }

    this.emptyState?.classList.add('hidden');

    const pinnedNotes = filtered.filter(n => n.pinned);
    const otherNotes = filtered.filter(n => !n.pinned);

    if (pinnedNotes.length > 0) {
      this.pinnedSection?.classList.remove('hidden');
      if (this.pinnedGrid) this.pinnedGrid.innerHTML = pinnedNotes.map(n => this.renderCard(n)).join('');
      if (this.othersTitle) this.othersTitle.style.display = otherNotes.length > 0 ? 'block' : 'none';
    } else {
      this.pinnedSection?.classList.add('hidden');
      if (this.othersTitle) this.othersTitle.style.display = 'none';
    }

    if (otherNotes.length > 0) {
      this.othersSection?.classList.remove('hidden');
      if (this.othersGrid) this.othersGrid.innerHTML = otherNotes.map(n => this.renderCard(n)).join('');
    } else {
      if (pinnedNotes.length === 0) {
        this.othersSection?.classList.add('hidden');
      } else {
        if (this.othersGrid) this.othersGrid.innerHTML = '';
      }
    }
  },

  openBulkAddModal() {
    if (typeof App === 'undefined') return;

    const bodyHtml = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <p style="font-size:12px;color:var(--text-secondary);margin:0;line-height:1.5;">
          Paste or type multiple notes at once. Separate each note using <strong>three dashes (---)</strong> or <strong>blank lines</strong>.
        </p>
        <textarea id="bulk-notes-input" class="settings-input" style="width:100%;height:160px;font-family:inherit;font-size:12px;line-height:1.5;resize:vertical;" placeholder="Project Ideas&#10;Research electron native tabs and WebContentsView&#10;---&#10;Reading List&#10;Clean modern browsers documentation&#10;---&#10;Shopping Checklist&#10;Milk, coffee beans, matcha"></textarea>
        
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--border-subtle);flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:12px;">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary);cursor:pointer;">
              <input type="checkbox" id="bulk-pin-all" />
              <span>📌 Pin all</span>
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary);cursor:pointer;">
              <input type="checkbox" id="bulk-split-blank" checked />
              <span>Split by blank lines</span>
            </label>
          </div>
          <div id="bulk-notes-count-preview" style="font-size:12px;font-weight:600;color:#F59E0B;">0 notes detected</div>
        </div>
      </div>
    `;

    App.showModal('Add Multiple Notes (Bulk)', bodyHtml, [
      { label: 'Cancel', class: 'btn-secondary', click: () => App.closeModal() },
      {
        label: '➕ Create Notes',
        class: 'btn-primary',
        click: () => {
          const text = document.getElementById('bulk-notes-input')?.value || '';
          const pinAll = !!document.getElementById('bulk-pin-all')?.checked;
          const splitBlank = !!document.getElementById('bulk-split-blank')?.checked;
          this.processBulkAdd(text, pinAll, splitBlank);
          App.closeModal();
        }
      }
    ]);

    const textarea = document.getElementById('bulk-notes-input');
    const preview = document.getElementById('bulk-notes-count-preview');
    const splitChk = document.getElementById('bulk-split-blank');
    const updateCount = () => {
      const raw = textarea?.value || '';
      const count = this.parseBulkNotes(raw, splitChk?.checked).length;
      if (preview) {
        preview.textContent = `${count} note${count === 1 ? '' : 's'} detected`;
      }
    };
    textarea?.addEventListener('input', updateCount);
    splitChk?.addEventListener('change', updateCount);
    setTimeout(() => textarea?.focus(), 60);
  },

  parseBulkNotes(text, splitBlank = true) {
    if (!text || !text.trim()) return [];
    let chunks = [];
    if (text.includes('---')) {
      chunks = text.split(/\n\s*---\s*\n/);
    } else if (splitBlank) {
      chunks = text.split(/\n\s*\n+/);
    } else {
      chunks = [text];
    }
    return chunks
      .map(c => c.trim())
      .filter(c => c.length > 0)
      .map(chunk => {
        const lines = chunk.split('\n');
        const firstLine = lines[0].replace(/^[#*\-•\d.]+\s*/, '').trim();
        const body = lines.slice(1).join('\n').trim();
        return {
          title: firstLine || 'Untitled Note',
          content: body || (lines.length === 1 ? '' : chunk)
        };
      });
  },

  processBulkAdd(text, pinAll = false, splitBlank = true) {
    const parsed = this.parseBulkNotes(text, splitBlank);
    if (parsed.length === 0) return;

    const now = Date.now();
    const newNotes = parsed.map((item, idx) => ({
      id: 'note_' + (now + idx) + '_' + Math.random().toString(36).substr(2, 4),
      title: item.title,
      content: item.content,
      type: 'text',
      checklist: [],
      color: 'default',
      pinned: pinAll,
      webClip: null,
      createdAt: now + idx,
      updatedAt: now + idx
    }));

    this.notes.unshift(...newNotes);
    this.persistNotes();
    this.render();
    this.showToast(`✓ Added ${newNotes.length} notes!`);
  },

  exportNotes() {
    if (this.notes.length === 0) {
      alert('No notes available to export.');
      return;
    }

    const mdContent = this.notes.map(n => {
      let md = `## ${n.title}\n*Saved: ${new Date(n.createdAt).toLocaleDateString()}* ${n.pinned ? '[PINNED]' : ''}\n\n`;
      if (n.type === 'checklist') {
        md += (n.checklist || []).map(i => `- [${i.done ? 'x' : ' '}] ${i.text}`).join('\n');
      } else {
        md += n.content || '';
      }
      if (n.webClip) {
        md += `\n\n> Web Link: [${n.webClip.title}](${n.webClip.url})`;
      }
      return md;
    }).join('\n\n---\n\n');

    const jsonContent = JSON.stringify(this.notes, null, 2);

    App.showModal('Export AETHER Notes', `
      <div style="padding:10px 0;">
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;">
          Choose your desired format to download all your notes:
        </p>
        <div style="display:flex;gap:12px;">
          <button class="btn-primary" id="btn-export-md" style="flex:1;">📝 Markdown (.md)</button>
          <button class="btn-secondary" id="btn-export-json" style="flex:1;">📦 JSON Backup (.json)</button>
        </div>
      </div>
    `, [
      { label: 'Close', class: 'btn-secondary', click: () => App.closeModal() }
    ]);

    document.getElementById('btn-export-md')?.addEventListener('click', () => {
      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `aether-notes-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      App.closeModal();
    });

    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `aether-notes-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      App.closeModal();
    });
  },

  clearAllNotes() {
    if (this.notes.length === 0) return;
    if (confirm(`Are you sure you want to delete all ${this.notes.length} notes? This cannot be undone.`)) {
      this.notes = [];
      this.persistNotes();
      this.render();
    }
  }
};

window.KeepNotes = KeepNotes;
