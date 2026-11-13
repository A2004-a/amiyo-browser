const cp = require('child_process');
const electronPath = require('electron');
const path = require('path');

console.log('Running AMIYO Browser headless integration test...');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const flags = [
  '--no-sandbox',
  '--disable-gpu',
  `--user-data-dir=${path.join(__dirname, '..', '.tmp_test_data')}`,
  path.join(__dirname, '..'),
  '--test-mode'
];

const child = cp.spawn(electronPath, flags, {
  env,
  stdio: 'inherit'
});

const timer = setTimeout(() => {
  console.log('Integration test timed out, killing process...');
  child.kill();
  process.exit(1);
}, 15000);

child.on('exit', (code) => {
  clearTimeout(timer);
  console.log(`Integration test completed with exit code: ${code}`);
  if (code === 0) {
    console.log('✔ Headless integration test passed!');
    process.exit(0);
  } else {
    process.exit(code || 1);
  }
});

