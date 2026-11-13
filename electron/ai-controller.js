const https = require('https');
const http = require('http');
const storageManager = require('./storage-manager');

class AiController {
  constructor() {
    this.systemPrompt = `You are AMIYO AI, a helpful, fast, and intelligent web browsing assistant integrated into AMIYO Browser. 
Provide clear, accurate, and concise responses. Format with Markdown (bold, bullet points, headers, code blocks).
When analyzing web pages, highlight the core ideas, actionable facts, and critical takeaways.`;
  }

  getSettings() {
    const settings = storageManager.getSettings();
    return {
      provider: (settings.aiProvider || 'builtin').toLowerCase(),
      apiKey: settings.aiApiKey || '',
      model: settings.aiModel || 'gemini-1.5-flash',
      ollamaUrl: settings.aiOllamaUrl || 'http://127.0.0.1:11434'
    };
  }

  async chat({ message, history = [], pageContext = null }) {
    const { provider, apiKey, model, ollamaUrl } = this.getSettings();

    // 1. If Gemini configured with API Key
    if (provider === 'gemini' && apiKey) {
      return this.chatWithGemini({ message, history, pageContext, apiKey, model });
    }

    // 2. If OpenAI configured with API Key
    if (provider === 'openai' && apiKey) {
      return this.chatWithOpenAI({ message, history, pageContext, apiKey, model });
    }

    // 3. If Ollama (Local AI)
    if (provider === 'ollama') {
      try {
        return await this.chatWithOllama({ message, history, pageContext, ollamaUrl, model });
      } catch (err) {
        console.warn('Ollama unavailable, falling back to built-in assistant:', err.message);
      }
    }

    // 4. Built-in Smart Assistant (Works 100% offline out-of-the-box!)
    return this.chatWithBuiltin({ message, pageContext });
  }

  async summarizePage({ title, url, text }) {
    if (!text || text.trim().length === 0) {
      return {
        summary: 'No readable text content found on this page.',
        takeaways: []
      };
    }

    const prompt = `Please provide an executive summary and 4-6 key takeaways for the following webpage.\nPage Title: "${title || 'Untitled'}"\nURL: ${url || ''}\n\nContent:\n${text.slice(0, 8000)}`;

    const { provider, apiKey } = this.getSettings();
    if ((provider === 'gemini' || provider === 'openai') && apiKey) {
      const response = await this.chat({ message: prompt, history: [] });
      return { summary: response, takeaways: [] };
    }

    // Built-in intelligent page summarizer
    return this.builtinSummarize(title, url, text);
  }

  // --- Gemini Provider ---
  chatWithGemini({ message, history, pageContext, apiKey, model }) {
    return new Promise((resolve, reject) => {
      const contents = [];

      // System instruction as first turn if supported, or prepended to context
      let promptText = message;
      if (pageContext && pageContext.text) {
        promptText = `[Webpage Context: Title: "${pageContext.title || ''}", URL: ${pageContext.url || ''}]\n` +
          `[Content excerpt: ${pageContext.text.slice(0, 5000)}]\n\nUser Question: ${message}`;
      }

      // Add conversation history
      history.forEach(item => {
        if (item.role === 'user') {
          contents.push({ role: 'user', parts: [{ text: item.content }] });
        } else if (item.role === 'assistant') {
          contents.push({ role: 'model', parts: [{ text: item.content }] });
        }
      });

      contents.push({ role: 'user', parts: [{ text: promptText }] });

      const requestBody = JSON.stringify({
        systemInstruction: { parts: [{ text: this.systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      });

      const chosenModel = model || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:generateContent?key=${apiKey}`;

      const req = https.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody)
        },
        timeout: 25000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              return resolve(`**API Error (${parsed.error.code}):** ${parsed.error.message}\n\n*Tip: You can use the Built-in Offline Assistant or update your API key in Settings.*`);
            }
            const candidate = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (candidate) {
              resolve(candidate.trim());
            } else {
              resolve('No response generated. Please check your prompt or API quota.');
            }
          } catch (e) {
            resolve(`Error parsing Gemini response: ${e.message}`);
          }
        });
      });

      req.on('error', err => resolve(`Connection failed: ${err.message}`));
      req.on('timeout', () => {
        req.destroy();
        resolve('AI request timed out. Please try again.');
      });
      req.write(requestBody);
      req.end();
    });
  }

  // --- OpenAI Provider ---
  chatWithOpenAI({ message, history, pageContext, apiKey, model }) {
    return new Promise((resolve) => {
      const messages = [{ role: 'system', content: this.systemPrompt }];

      if (pageContext && pageContext.text) {
        messages.push({
          role: 'system',
          content: `Current page context: "${pageContext.title}" (${pageContext.url}):\n${pageContext.text.slice(0, 4000)}`
        });
      }

      history.forEach(item => {
        messages.push({
          role: item.role === 'assistant' ? 'assistant' : 'user',
          content: item.content
        });
      });

      messages.push({ role: 'user', content: message });

      const requestBody = JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages,
        temperature: 0.7
      });

      const req = https.request('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(requestBody)
        },
        timeout: 25000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              return resolve(`**OpenAI Error:** ${parsed.error.message}`);
            }
            const reply = parsed.choices?.[0]?.message?.content;
            resolve(reply ? reply.trim() : 'No response from OpenAI.');
          } catch (e) {
            resolve(`Error parsing response: ${e.message}`);
          }
        });
      });

      req.on('error', err => resolve(`OpenAI connection error: ${err.message}`));
      req.on('timeout', () => {
        req.destroy();
        resolve('AI request timed out.');
      });
      req.write(requestBody);
      req.end();
    });
  }

  // --- Ollama Provider (Local) ---
  chatWithOllama({ message, history, pageContext, ollamaUrl, model }) {
    return new Promise((resolve, reject) => {
      let fullPrompt = `${this.systemPrompt}\n\n`;
      if (pageContext && pageContext.text) {
        fullPrompt += `[Page context: ${pageContext.title} - ${pageContext.text.slice(0, 3000)}]\n\n`;
      }
      history.forEach(h => {
        fullPrompt += `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}\n`;
      });
      fullPrompt += `User: ${message}\nAssistant:`;

      const requestBody = JSON.stringify({
        model: model || 'llama3',
        prompt: fullPrompt,
        stream: false
      });

      const parsedUrl = new URL(ollamaUrl || 'http://127.0.0.1:11434');
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const req = client.request({
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 11434),
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody)
        },
        timeout: 30000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.response || 'No response from local Ollama model.');
          } catch (e) {
            resolve(`Ollama error: ${e.message}`);
          }
        });
      });

      req.on('error', err => reject(err));
      req.write(requestBody);
      req.end();
    });
  }

  // --- Built-in Smart Offline Assistant ---
  chatWithBuiltin({ message, pageContext }) {
    const q = message.toLowerCase().trim();

    // Summarize request
    if (q.includes('summarize') || q.includes('summary') || q.includes('overview') || q.includes('tldr') || q.includes('tl;dr')) {
      if (pageContext && pageContext.text && pageContext.text.length > 50) {
        const res = this.builtinSummarize(pageContext.title, pageContext.url, pageContext.text);
        return res.summary;
      }
      return `### 📄 Page Summary\nTo summarize a webpage, open any website and click **"Summarize Page"** or ask me while the tab is active!`;
    }

    // Key points request
    if (q.includes('key point') || q.includes('takeaway') || q.includes('bullet') || q.includes('highlights')) {
      if (pageContext && pageContext.text) {
        const res = this.builtinSummarize(pageContext.title, pageContext.url, pageContext.text);
        return `### 📌 Key Highlights\n` + res.takeaways.map(t => `- ${t}`).join('\n');
      }
    }

    // Explaining page or selection
    if (q.startsWith('explain') || q.includes('what is') || q.includes('how does')) {
      if (pageContext && pageContext.text) {
        const sentences = pageContext.text.split(/[.?!]\s+/).filter(s => s.length > 20);
        const relevant = sentences.filter(s => {
          const terms = q.replace(/(explain|what is|how does|the|a|an)/g, '').trim().split(' ');
          return terms.some(t => t.length > 3 && s.toLowerCase().includes(t));
        });
        if (relevant.length > 0) {
          return `### 💡 Explanation based on current page:\n\n${relevant.slice(0, 3).join('. ')}.\n\n*Source: ${pageContext.title || pageContext.url}*`;
        }
      }
    }

    // Browser tips / Help
    if (q.includes('help') || q.includes('what can you do') || q.includes('features')) {
      return `### ✨ AMIYO AI Assistant Capabilities:
- **📄 Page Summarization**: Summarize any article, blog, or documentation with one click.
- **📌 Key Takeaways**: Extract the most critical bullet points from long pages.
- **🔍 Smart Search & Q&A**: Ask questions about the current page or general topics.
- **🌐 Cloud AI Integration**: Connect your free Google Gemini or OpenAI API key in **Settings → AI Assistant** for full multi-turn conversational AI!
- **⚡ Omnibox Command**: Type \`@ai <question>\` in the address bar anytime to ask AI instantly!`;
    }

    // Contextual answer fallback
    if (pageContext && pageContext.text && pageContext.text.length > 100) {
      const sentences = pageContext.text.split(/[.?!]\s+/).filter(s => s.length > 25);
      return `### 💡 Answer from page: **${pageContext.title || 'Current Page'}**\n\n` +
        `Here is the relevant information found on this page regarding your query:\n\n` +
        `> ${sentences.slice(0, 2).join('. ')}.\n\n` +
        `*Tip: For conversational deep-dive reasoning, add your free **Google Gemini API Key** in [Settings](amiyo://settings)!*`;
    }

    return `### ✨ AMIYO AI Assistant\nI'm ready to help you browse! Here's what you can do:\n\n` +
      `- Click **"Summarize Page"** to get a breakdown of the active tab.\n` +
      `- Ask questions about the webpage you're currently viewing.\n` +
      `- Type \`@ai <prompt>\` in the omnibox for instant AI assistance.\n\n` +
      `*To enable Gemini 1.5/2.5 Flash, add your API key in **Settings → AI Assistant**!*`;
  }

  builtinSummarize(title, url, text) {
    const cleanText = text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    const sentences = cleanText.split(/[.?!]\s+/).filter(s => s.length > 30 && s.length < 250);
    const words = cleanText.split(/\s+/).length;
    const readingTime = Math.max(1, Math.round(words / 200));

    // Heuristically pick informative sentences (avoid navigational snippets)
    const informative = sentences.filter(s => {
      const lower = s.toLowerCase();
      return !lower.includes('cookie') && !lower.includes('sign in') && !lower.includes('subscribe') &&
             !lower.includes('all rights reserved') && !lower.includes('privacy policy');
    });

    const leadSummary = informative.slice(0, 2).join('. ') + (informative.length > 0 ? '.' : '');
    const takeaways = informative.slice(2, 6);

    const formattedSummary = `### 📄 Summary: ${title || 'Webpage'}\n` +
      `*Estimated reading time: ~${readingTime} min (${words.toLocaleString()} words)*\n\n` +
      `${leadSummary}\n\n` +
      `### 📌 Key Highlights:\n` +
      (takeaways.length > 0 ? takeaways.map(t => `- ${t}.`).join('\n') : '- Content reviewed and processed.');

    return {
      summary: formattedSummary,
      takeaways: takeaways.length > 0 ? takeaways : [leadSummary],
      wordCount: words,
      readingTimeMinutes: readingTime
    };
  }
}

module.exports = new AiController();
