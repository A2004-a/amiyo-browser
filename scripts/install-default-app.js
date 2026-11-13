const asar = require('@electron/asar');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function main() {
  const tmpDir = path.join(os.tmpdir(), 'default_app_src_' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });

  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
    name: 'default_app',
    version: '0.1.0',
    main: 'main.js'
  }, null, 2));

  const mainCode = [
    "const path = require('path');",
    "const fs = require('fs');",
    "",
    "const args = process.argv.slice(1);",
    "",
    "// Handle version checks immediately so VS Code debugger and tools get a valid version string",
    "if (args.includes('-v') || args.includes('--version')) {",
    "  console.log('v' + (process.versions.node || '20.0.0'));",
    "  process.exit(0);",
    "}",
    "",
    "// Handle eval",
    "const evalIdx = args.findIndex(a => a === '-e' || a === '--eval');",
    "if (evalIdx !== -1 && args[evalIdx + 1]) {",
    "  eval(args[evalIdx + 1]);",
    "  process.exit(0);",
    "}",
    "",
    "let appPath = null;",
    "for (const arg of args) {",
    "  if (!arg.startsWith('-')) {",
    "    appPath = arg;",
    "    break;",
    "  }",
    "}",
    "",
    "if (!appPath) {",
    "  appPath = process.cwd();",
    "} else {",
    "  appPath = path.resolve(process.cwd(), appPath);",
    "}",
    "",
    "if (fs.existsSync(appPath) && fs.statSync(appPath).isDirectory()) {",
    "  const pkgPath = path.join(appPath, 'package.json');",
    "  if (fs.existsSync(pkgPath)) {",
    "    try {",
    "      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));",
    "      if (pkg.main) {",
    "        appPath = path.resolve(appPath, pkg.main);",
    "      } else {",
    "        appPath = path.join(appPath, 'index.js');",
    "      }",
    "    } catch (e) {",
    "      appPath = path.join(appPath, 'main.js');",
    "    }",
    "  } else {",
    "    appPath = path.join(appPath, 'main.js');",
    "  }",
    "}",
    "",
    "require(appPath);"
  ].join('\n');

  fs.writeFileSync(path.join(tmpDir, 'main.js'), mainCode);

  const destAsar = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'resources', 'default_app.asar');
  await asar.createPackage(tmpDir, destAsar);
  console.log('✔ Successfully installed default_app.asar at:', destAsar);
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

main().catch(console.error);
