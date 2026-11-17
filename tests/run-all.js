const navTests = require('./navigation.test');
const bmTests = require('./bookmarks.test');
const histTests = require('./history.test');
const setTests = require('./settings.test');
const tabTests = require('./tabs.test');
const aiTests = require('./ai.test');
const shieldsTests = require('./shields.test');
const groupTests = require('./tab-groups.test');
const memoryTests = require('./memory-saver.test');
const readerTests = require('./reader-mode.test');
const featureTests = require('./browser-features.test');
const incognitoTests = require('./incognito.test');
const superFeatureTests = require('./browser-super-features.test');
const aetherShieldSuperTests = require('./aether-shield-and-super-features.test');
const vpnTests = require('./vpn-controller.test');
const mobileTests = require('./mobile-features.test');

console.log('========================================');
console.log('       AETHER Browser Test Suite       ');
console.log('========================================\n');

async function main() {
  try {
    navTests.run();
    bmTests.run();
    histTests.run();
    setTests.run();
    tabTests.run();
    aiTests.run();
    shieldsTests.run();
    groupTests.run();
    memoryTests.run();
    readerTests.run();
    featureTests.run();
    incognitoTests.run();
    superFeatureTests.run();
    aetherShieldSuperTests.run();
    await vpnTests.run();
    mobileTests.run();

    console.log('\n========================================');
    console.log('  ALL UNIT TEST SUITES PASSED (16/16)!  ');
    console.log('========================================');
  } catch (err) {
    console.error('\n❌ Test failure:', err);
    process.exit(1);
  }
}

main();
