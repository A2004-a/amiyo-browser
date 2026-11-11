const assert = require('assert');

function run() {
  console.log('Testing Tabs Logic...');

  // Mock tab state
  let tabs = [
    { id: 'tab_1', title: 'Google', url: 'https://google.com' },
    { id: 'tab_2', title: 'GitHub', url: 'https://github.com' },
    { id: 'tab_3', title: 'Wikipedia', url: 'https://wikipedia.org' }
  ];

  // Reorder test
  const [moved] = tabs.splice(0, 1);
  tabs.splice(1, 0, moved);
  assert.strictEqual(tabs[0].id, 'tab_2');
  assert.strictEqual(tabs[1].id, 'tab_1');
  assert.strictEqual(tabs[2].id, 'tab_3');

  // Adjacent tab selection on close
  const closedIndex = 1;
  tabs.splice(closedIndex, 1);
  const nextActiveIndex = Math.min(closedIndex, tabs.length - 1);
  assert.strictEqual(nextActiveIndex, 1);
  assert.strictEqual(tabs[nextActiveIndex].id, 'tab_3');

  console.log('✔ Tabs logic tests passed!');
}

module.exports = { run };
if (require.main === module) run();

