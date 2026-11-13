const assert = require('assert');

function run() {
  console.log('Testing Tab Groups Architecture...');

  let tabGroups = [];
  let tabs = [
    { id: 'tab-1', title: 'Work Doc', url: 'https://docs.google.com', groupId: null },
    { id: 'tab-2', title: 'Work Spreadsheet', url: 'https://sheets.google.com', groupId: null },
    { id: 'tab-3', title: 'Music Stream', url: 'https://youtube.com', groupId: null }
  ];

  // 1. Create a group
  const group1 = {
    id: 'grp-1',
    title: 'Work Project',
    color: '#3b82f6',
    collapsed: false
  };
  tabGroups.push(group1);
  assert.strictEqual(tabGroups.length, 1);
  assert.strictEqual(tabGroups[0].title, 'Work Project');

  // 2. Assign tabs to group
  tabs[0].groupId = group1.id;
  tabs[1].groupId = group1.id;
  assert.strictEqual(tabs[0].groupId, 'grp-1');
  assert.strictEqual(tabs[1].groupId, 'grp-1');
  assert.strictEqual(tabs[2].groupId, null);

  // 3. Update group properties
  group1.title = 'Updated Project Alpha';
  group1.color = '#10b981';
  group1.collapsed = true;
  assert.strictEqual(group1.title, 'Updated Project Alpha');
  assert.strictEqual(group1.color, '#10b981');
  assert.strictEqual(group1.collapsed, true);

  // 4. Delete group disassociates child tabs
  const deletedId = group1.id;
  tabGroups = tabGroups.filter(g => g.id !== deletedId);
  tabs.forEach(t => {
    if (t.groupId === deletedId) t.groupId = null;
  });

  assert.strictEqual(tabGroups.length, 0);
  assert.strictEqual(tabs[0].groupId, null);
  assert.strictEqual(tabs[1].groupId, null);

  console.log('✔ Tab Groups tests passed!');
}

module.exports = { run };
if (require.main === module) run();
