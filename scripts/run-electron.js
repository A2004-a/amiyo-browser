const cp = require('child_process');
const electronPath = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const extraArgs = process.argv.slice(2);
const verbose = extraArgs.includes('--verbose') || extraArgs.includes('--enable-logging');

if (verbose) {
  env.ELECTRON_ENABLE_LOGGING = '1';
}

const hasTarget = extraArgs.some(arg => arg.endsWith('.js') || arg === '.');
const target = hasTarget ? [] : ['.'];
const flags = [
  '--no-sandbox',
  '--disable-gpu',
  ...(verbose ? ['--enable-logging'] : ['--log-level=3']),
  ...target,
  ...extraArgs.filter(a => a !== '--verbose')
];

const child = cp.spawn(electronPath, flags, {
  env,
  stdio: 'inherit',
  windowsHide: false
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

process.on('SIGINT', () => {
  try { child.kill('SIGINT'); } catch (e) {}
  process.exit(0);
});

process.on('SIGTERM', () => {
  try { child.kill('SIGTERM'); } catch (e) {}
  process.exit(0);
});
