const navTests = require('./navigation.test');
const bmTests = require('./bookmarks.test');
const histTests = require('./history.test');
const setTests = require('./settings.test');
const tabTests = require('./tabs.test');

console.log('========================================');
console.log('       AMIYO Browser Test Suite        ');
console.log('========================================\n');

try {
  navTests.run();
  bmTests.run();
  histTests.run();
  setTests.run();
  tabTests.run();

  console.log('\n========================================');
  console.log('  ALL UNIT TEST SUITES PASSED (5/5)!    ');
  console.log('========================================');
} catch (err) {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
}
