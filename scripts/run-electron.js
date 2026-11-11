const cp = require('child_process');
const electronPath = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const extraArgs = process.argv.slice(2);
const hasTarget = extraArgs.some(arg => arg.endsWith('.js') || arg === '.');
const target = hasTarget ? [] : ['.'];
const flags = [
  '--no-sandbox',
  '--disable-gpu',
  ...target,
  ...extraArgs
];

const child = cp.spawn(electronPath, flags, {
  env,
  stdio: 'inherit',
  windowsHide: false
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
