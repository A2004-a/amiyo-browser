/**
 * AMIYO Reader Controller — Distraction-free article extraction and readability mode.
 */

class ReaderController {
  async extractArticle(webContents) {
    if (!webContents || webContents.isDestroyed()) {
      return { success: false, error: 'WebContents unavailable' };
    }

    try {
      const article = await webContents.executeJavaScript(`
        (() => {
          try {
            const title = document.querySelector('h1')?.innerText?.trim() || document.title || 'Untitled Article';
            
            // Search for common article containers
            const selectors = [
              'article',
              '[role="main"]',
              '.article-content',
              '.post-content',
              '.entry-content',
              '.content',
              'main'
            ];

            let rootEl = null;
            for (const sel of selectors) {
              const el = document.querySelector(sel);
              if (el && el.innerText && el.innerText.length > 300) {
                rootEl = el;
                break;
              }
            }

            if (!rootEl) {
              rootEl = document.body;
            }

            const clone = rootEl.cloneNode(true);
            const removeSelectors = [
              'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
              'nav', 'header', 'footer', 'aside',
              '.ad', '.ads', '.advertisement', '.social-share', '.comments',
              '#comments', '.sidebar', '.menu', '.cookie-banner'
            ];

            removeSelectors.forEach(sel => {
              clone.querySelectorAll(sel).forEach(el => el.remove());
            });

            // Extract readable paragraphs and headers
            const elements = clone.querySelectorAll('p, h2, h3, h4, blockquote, ul, ol, img');
            let contentHtml = '';
            let wordCount = 0;

            elements.forEach(el => {
              const tagName = el.tagName.toLowerCase();
              if (tagName === 'p') {
                const text = el.innerText.trim();
                if (text.length > 20) {
                  contentHtml += '<p>' + el.innerHTML + '</p>';
                  wordCount += text.split(/\\s+/).length;
                }
              } else if (['h2', 'h3', 'h4'].includes(tagName)) {
                contentHtml += '<' + tagName + '>' + el.innerText.trim() + '</' + tagName + '>';
              } else if (tagName === 'blockquote') {
                contentHtml += '<blockquote>' + el.innerHTML + '</blockquote>';
              } else if (['ul', 'ol'].includes(tagName)) {
                contentHtml += '<' + tagName + '>' + el.innerHTML + '</' + tagName + '>';
              } else if (tagName === 'img' && el.src && el.src.startsWith('http') && el.naturalWidth > 200) {
                contentHtml += '<figure><img src="' + el.src + '" alt="' + (el.alt || '') + '" /><figcaption>' + (el.alt || '') + '</figcaption></figure>';
              }
            });

            // If empty, fallback to innerText
            if (!contentHtml || wordCount < 40) {
              const fallbackText = clone.innerText.replace(/\\n\\s*\\n/g, '\\n\\n').trim();
              const paragraphs = fallbackText.split('\\n\\n').filter(p => p.trim().length > 30);
              contentHtml = paragraphs.map(p => '<p>' + p.trim() + '</p>').join('');
              wordCount = fallbackText.split(/\\s+/).length;
            }

            const byline = document.querySelector('[rel="author"], .byline, .author, .post-author')?.innerText?.trim() || '';
            const readingTimeMinutes = Math.max(1, Math.round(wordCount / 220));

            return {
              success: true,
              title,
              byline,
              content: contentHtml,
              wordCount,
              readingTimeMinutes,
              url: window.location.href,
              domain: window.location.hostname
            };
          } catch (err) {
            return { success: false, error: err.message };
          }
        })()
      `);

      return article;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = new ReaderController();
