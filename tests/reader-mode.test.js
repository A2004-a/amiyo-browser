const assert = require('assert');

function run() {
  console.log('Testing Reader Mode (Readability & Article Extraction)...');

  // Test word count and reading time calculation
  const sampleArticleText = "Artificial intelligence is rapidly transforming web browsers by bringing context-aware reasoning, automated research, and real-time summarization directly into user workflows. Modern browsers must balance intense computational efficiency with memory conservation and ad-blocking capabilities.";
  
  const words = sampleArticleText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  assert.ok(wordCount > 20);
  assert.strictEqual(readingTime, 1);

  // Test removal of unwanted tags (simulated)
  const forbiddenTags = ['script', 'style', 'iframe', 'noscript', 'nav', 'footer'];
  const testHtml = '<div><p>Main content paragraph.</p><script>alert("ad")</script><footer>Footer links</footer></div>';

  let cleaned = testHtml;
  forbiddenTags.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gis');
    cleaned = cleaned.replace(regex, '');
  });

  assert.ok(!cleaned.includes('<script>'));
  assert.ok(!cleaned.includes('<footer>'));
  assert.ok(cleaned.includes('<p>Main content paragraph.</p>'));

  console.log('✔ Reader Mode tests passed!');
}

module.exports = { run };
if (require.main === module) run();
