/**
 * AMIYO AI Assistant Side Panel
 * Native intelligent browsing companion powered by Gemini, OpenAI, Ollama, & Built-in Smart Summarizer.
 */

const AiPanel = {
  isOpen: false,
  isProcessing: false,
  history: [],
  includeContext: true,

  // DOM Elements
  panelEl: null,
  toolBtnEl: null,
  messagesEl: null,
  inputEl: null,
  sendBtnEl: null,
  contextChkEl: null,
  contextTitleEl: null,
  providerPillEl: null,
  clearBtnEl: null,
  closeBtnEl: null,

  init() {
    this.panelEl = document.getElementById('ai-side-panel');
    this.toolBtnEl = document.getElementById('ai-tool-btn');
    this.messagesEl = document.getElementById('ai-messages');
    this.inputEl = document.getElementById('ai-prompt-input');
    this.sendBtnEl = document.getElementById('ai-send-btn');
    this.contextChkEl = document.getElementById('ai-context-chk');
    this.contextTitleEl = document.getElementById('ai-context-page-title');
    this.providerPillEl = document.getElementById('ai-provider-pill');
    this.clearBtnEl = document.getElementById('ai-clear-btn');
    this.closeBtnEl = document.getElementById('ai-close-btn');

    if (!this.panelEl) return;

    // Toggle button in toolbar
    if (this.toolBtnEl) {
      this.toolBtnEl.addEventListener('click', () => this.toggle());
    }

    // Close button in panel header
    if (this.closeBtnEl) {
      this.closeBtnEl.addEventListener('click', () => this.toggle(false));
    }

    // Clear chat button
    if (this.clearBtnEl) {
      this.clearBtnEl.addEventListener('click', () => this.clearChat());
    }

    // Send button
    if (this.sendBtnEl) {
      this.sendBtnEl.addEventListener('click', () => this.handleSend());
    }

    // Context toggle checkbox
    if (this.contextChkEl) {
      this.contextChkEl.addEventListener('change', (e) => {
        this.includeContext = e.target.checked;
      });
    }

    // Textarea input handling (Auto-resize & Enter to send)
    if (this.inputEl) {
      this.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSend();
        }
      });

      this.inputEl.addEventListener('input', () => {
        this.inputEl.style.height = 'auto';
        this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 120) + 'px';
      });
    }

    // Quick Action Chips
    const chips = this.panelEl.querySelectorAll('.ai-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const action = chip.dataset.action;
        this.handleQuickAction(action);
      });
    });

    // Listen to IPC events from context menu or main process
    if (IpcClient.onAiAskSelection) {
      IpcClient.onAiAskSelection((text) => {
        this.askAboutSelection(text);
      });
    }

    if (IpcClient.onAiTriggerSummarize) {
      IpcClient.onAiTriggerSummarize(() => {
        this.summarizeCurrentPage();
      });
    }

    // Update provider label
    this.updateProviderBadge();

    // Show initial welcome message
    this.renderWelcome();
  },

  updateProviderBadge() {
    if (!this.providerPillEl) return;
    const provider = (State.settings && State.settings.aiProvider) || 'builtin';
    const labels = {
      builtin: 'Built-in Assistant',
      gemini: 'Google Gemini',
      openai: 'OpenAI GPT',
      ollama: 'Local Ollama'
    };
    this.providerPillEl.textContent = labels[provider.toLowerCase()] || 'AETHER Intelligence';
  },

  toggle(forcedState) {
    const nextState = typeof forcedState === 'boolean' ? forcedState : !this.isOpen;
    if (this.isOpen === nextState) return;

    this.isOpen = nextState;

    if (this.panelEl) {
      this.panelEl.classList.toggle('hidden', !this.isOpen);
    }

    if (this.toolBtnEl) {
      this.toolBtnEl.classList.toggle('active', this.isOpen);
    }

    // Adjust internal pages margin if currently visible
    const internalPageContainer = document.getElementById('internal-page-container');
    if (internalPageContainer) {
      internalPageContainer.style.marginRight = this.isOpen ? '380px' : '0px';
    }

    // Tell main process to adjust WebContentsView bounds side-by-side
    IpcClient.setSideOffset(this.isOpen ? 380 : 0);

    if (this.isOpen) {
      this.updateActivePageContext();
      this.updateProviderBadge();
      setTimeout(() => {
        if (this.inputEl) this.inputEl.focus();
      }, 100);
    }
  },

  updateActivePageContext() {
    const activeTab = State.getActiveTab();
    if (this.contextTitleEl) {
      if (activeTab && activeTab.title && activeTab.url !== 'amiyo://newtab') {
        this.contextTitleEl.textContent = activeTab.title;
        this.contextTitleEl.title = `${activeTab.title} (${activeTab.url})`;
      } else {
        this.contextTitleEl.textContent = 'New Tab';
        this.contextTitleEl.title = '';
      }
    }
  },

  clearChat() {
    this.history = [];
    if (this.messagesEl) {
      this.messagesEl.innerHTML = '';
      this.renderWelcome();
    }
  },

  renderWelcome() {
    if (!this.messagesEl || this.messagesEl.children.length > 0) return;

    const welcomeBubble = document.createElement('div');
    welcomeBubble.className = 'ai-bubble assistant';
    welcomeBubble.innerHTML = `
      <div style="font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
        <span>✨ Welcome to AETHER Intelligence</span>
      </div>
      <p>I am your built-in AI assistant. I can summarize any webpage, answer questions, explain code, and extract key insights.</p>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:0;">
        💡 <em>Try clicking "Summarize Page" above or ask any question below!</em>
      </p>
    `;
    this.messagesEl.appendChild(welcomeBubble);
  },

  async handleQuickAction(action) {
    if (this.isProcessing) return;

    const activeTab = State.getActiveTab();
    if (!activeTab) return;

    switch (action) {
      case 'summarize':
        await this.summarizeCurrentPage();
        break;

      case 'highlights':
        await this.sendCustomPrompt('Please extract the top 5 key highlights and facts from this page in bullet points.');
        break;

      case 'explain':
        await this.sendCustomPrompt('Explain the main concept and purpose of this webpage simply in plain English.');
        break;

      case 'actionable':
        await this.sendCustomPrompt('What are the key actionable takeaways, conclusions, or next steps from this webpage?');
        break;
    }
  },

  async summarizeCurrentPage() {
    if (!this.isOpen) this.toggle(true);
    if (this.isProcessing) return;

    const activeTab = State.getActiveTab();
    if (!activeTab) return;

    this.appendUserMessage(`📄 Summarize current page (${activeTab.title || 'Untitled'})`);
    const typingIndicator = this.showTypingIndicator('Reading and analyzing page content...');

    this.isProcessing = true;

    try {
      const result = await IpcClient.aiSummarize(activeTab.id);
      this.removeTypingIndicator(typingIndicator);

      let summaryHtml = '';
      if (typeof result === 'string') {
        summaryHtml = this.formatMarkdown(result);
      } else if (result && result.summary) {
        summaryHtml = `<p>${this.formatMarkdown(result.summary)}</p>`;
        if (result.readingTimeMinutes) {
          summaryHtml += `<p style="font-size:11.5px;color:var(--text-muted);margin-top:6px;">⏱️ Estimated reading time: <strong>${result.readingTimeMinutes} min</strong> (${result.wordCount} words)</p>`;
        }
        if (result.takeaways && result.takeaways.length > 0) {
          summaryHtml += `<h4>📌 Key Takeaways</h4><ul>`;
          result.takeaways.forEach(t => {
            summaryHtml += `<li>${Utils.escapeHtml(t)}</li>`;
          });
          summaryHtml += `</ul>`;
        }
      } else {
        summaryHtml = '<p>Unable to generate summary for this page.</p>';
      }

      this.appendAssistantMessage(summaryHtml);
      this.history.push({ role: 'assistant', content: typeof result === 'string' ? result : (result.summary || '') });
    } catch (err) {
      console.error('[AiPanel] Summarize error:', err);
      this.removeTypingIndicator(typingIndicator);
      this.appendAssistantMessage(`<p style="color:#ef4444;">❌ Failed to summarize page: ${Utils.escapeHtml(err.message)}</p>`);
    } finally {
      this.isProcessing = false;
    }
  },

  askAboutSelection(text) {
    if (!text || !text.trim()) return;
    if (!this.isOpen) this.toggle(true);

    const prompt = `Please explain this selected text and give key context:\n"${text.trim()}"`;
    this.sendCustomPrompt(prompt);
  },

  openWithPrompt(prompt) {
    if (!this.isOpen) this.toggle(true);
    if (prompt && prompt.trim()) {
      this.sendCustomPrompt(prompt.trim());
    }
  },

  async sendCustomPrompt(prompt) {
    if (this.isProcessing || !prompt) return;

    this.appendUserMessage(prompt);
    this.history.push({ role: 'user', content: prompt });

    const typingIndicator = this.showTypingIndicator();
    this.isProcessing = true;

    try {
      let pageContext = null;
      if (this.includeContext && State.activeTabId) {
        pageContext = await IpcClient.aiGetPageContent(State.activeTabId);
      }

      const response = await IpcClient.aiChat({
        message: prompt,
        history: this.history.slice(-6),
        pageContext
      });

      this.removeTypingIndicator(typingIndicator);
      const formatted = this.formatMarkdown(response);
      this.appendAssistantMessage(formatted);
      this.history.push({ role: 'assistant', content: response });
    } catch (err) {
      console.error('[AiPanel] Chat error:', err);
      this.removeTypingIndicator(typingIndicator);
      this.appendAssistantMessage(`<p style="color:#ef4444;">❌ Request failed: ${Utils.escapeHtml(err.message)}</p>`);
    } finally {
      this.isProcessing = false;
    }
  },

  async handleSend() {
    if (this.isProcessing) return;
    if (!this.inputEl) return;

    const val = this.inputEl.value.trim();
    if (!val) return;

    this.inputEl.value = '';
    this.inputEl.style.height = 'auto';

    await this.sendCustomPrompt(val);
  },

  appendUserMessage(text) {
    if (!this.messagesEl) return;
    const bubble = document.createElement('div');
    bubble.className = 'ai-bubble user';
    bubble.textContent = text;
    this.messagesEl.appendChild(bubble);
    this.scrollToBottom();
  },

  appendAssistantMessage(htmlContent) {
    if (!this.messagesEl) return;
    const bubble = document.createElement('div');
    bubble.className = 'ai-bubble assistant';
    bubble.innerHTML = htmlContent;
    this.messagesEl.appendChild(bubble);
    this.scrollToBottom();
  },

  showTypingIndicator(customText) {
    if (!this.messagesEl) return null;
    const bubble = document.createElement('div');
    bubble.className = 'ai-bubble assistant ai-typing';
    bubble.innerHTML = `
      <div class="ai-dot"></div>
      <div class="ai-dot"></div>
      <div class="ai-dot"></div>
      ${customText ? `<span style="font-size:12px;color:var(--text-muted);margin-left:8px;">${Utils.escapeHtml(customText)}</span>` : ''}
    `;
    this.messagesEl.appendChild(bubble);
    this.scrollToBottom();
    return bubble;
  },

  removeTypingIndicator(bubble) {
    if (bubble && bubble.parentNode) {
      bubble.parentNode.removeChild(bubble);
    }
  },

  scrollToBottom() {
    if (this.messagesEl) {
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }
  },

  formatMarkdown(text) {
    if (!text) return '';
    let html = Utils.escapeHtml(text);

    // Code blocks ```code```
    html = html.replace(/```([a-z0-9]*)\n([\s\S]*?)```/gi, (match, lang, code) => {
      return `<pre style="background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;overflow-x:auto;margin:6px 0;"><code>${code}</code></pre>`;
    });

    // Inline code `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers ### Header
    html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h3>$1</h3>');

    // Bold **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic *text*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Blockquote > text
    html = html.replace(/^>\s?(.*$)/gim, '<blockquote>$1</blockquote>');

    // Bullet lists - item
    html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

    // Line breaks
    html = html.replace(/\n\n/g, '<br><br>');
    html = html.replace(/\n/g, '<br>');

    return html;
  }
};

