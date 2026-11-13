const assert = require('assert');
const ai = require('../electron/ai-controller');

function run() {
  console.log('Testing AiController...');

  // Test 1: Built-in general chat response
  const response1 = ai.chatWithBuiltin({ message: 'Hello AMIYO' });
  assert.ok(typeof response1 === 'string', 'Expected string response');
  assert.ok(response1.includes('AMIYO AI'), 'Expected response to mention AMIYO AI');

  // Test 2: Built-in chat with page context
  const samplePage = {
    title: 'Quantum Computing Explained',
    url: 'https://example.com/quantum',
    text: 'Quantum computing leverages superposition and entanglement to perform calculations exponentially faster than classical computers for specific problem classes.'
  };

  const response2 = ai.chatWithBuiltin({
    message: 'What is this page about?',
    pageContext: samplePage
  });
  assert.ok(response2.includes('Quantum Computing') || response2.includes('quantum'), 'Expected context-aware response');

  // Test 3: Summarize page content
  const summaryResult = ai.builtinSummarize(samplePage.title, samplePage.url, samplePage.text);
  assert.ok(summaryResult.summary, 'Expected summary text');
  assert.ok(summaryResult.wordCount > 0, 'Expected positive word count');
  assert.ok(summaryResult.readingTimeMinutes >= 1, 'Expected reading time at least 1 min');
  assert.ok(Array.isArray(summaryResult.takeaways), 'Expected takeaways array');

  // Test 4: Empty page text handling
  const emptySummary = ai.summarizePage({ title: 'Blank', url: 'https://example.com', text: '' });
  emptySummary.then(res => {
    assert.ok(res.summary.includes('No readable text'), 'Expected empty text message');
  });

  console.log('✔ AiController tests passed!');
}

module.exports = { run };
