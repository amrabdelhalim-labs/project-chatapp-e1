#!/usr/bin/env node
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// check-build.js â€” comprehensive pre-build verification script
//
// Simulates the build process locally to catch errors early:
//  1. Verify all required dependencies exist in node_modules
//  2. Check peer dependency version compatibility
//  3. Verify critical native-base internal paths
//  4. Verify configuration files exist and are valid
//  5. Check required environment variables
//  6. Static import graph analysis
//  7. Optional: Metro bundler simulation (expo export)
//
// Usage:
//   node scripts/check-build.js
//   node scripts/check-build.js --quick   (skip Metro bundling)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const quick = process.argv.includes('--quick');

// â”€â”€â”€ Terminal color codes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function pass(msg) {
  console.log(`  ${c.green}âœ”${c.reset}  ${msg}`);
}
function fail(msg) {
  console.log(`  ${c.red}âœک${c.reset}  ${c.bold}${msg}${c.reset}`);
}
function warn(msg) {
  console.log(`  ${c.yellow}âڑ ${c.reset}  ${msg}`);
}
function info(msg) {
  console.log(`  ${c.cyan}â„¹${c.reset}  ${msg}`);
}
function section(title) {
  console.log(`\n${c.bold}${c.cyan}â–¶ ${title}${c.reset}`);
}

let totalErrors = 0;
let totalWarnings = 0;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 1. Required Dependencies
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
section('1. Required Dependencies');

// Critical packages that must exist in node_modules
const REQUIRED_DEPS = [
  // Core
  { pkg: 'react', reason: 'core framework' },
  { pkg: 'react-native', reason: 'core framework' },
  { pkg: 'expo', reason: 'runtime platform' },

  // native-base and its requirements
  { pkg: 'native-base', reason: 'UI component library' },
  { pkg: 'react-native-svg', reason: 'required by native-base for icons' },
  { pkg: 'react-native-safe-area-context', reason: 'required by native-base' },

  // Navigation
  { pkg: '@react-navigation/native', reason: 'navigation system' },
  { pkg: '@react-navigation/native-stack', reason: 'stack navigator' },

  // State management
  { pkg: 'zustand', reason: 'global state management' },
  { pkg: '@react-native-async-storage/async-storage', reason: 'local persistence' },

  // Network
  { pkg: 'axios', reason: 'HTTP client' },
  { pkg: 'socket.io-client', reason: 'WebSocket connection' },

  // Forms
  { pkg: 'formik', reason: 'form state management' },
  { pkg: 'yup', reason: 'schema validation' },

  // Other
  { pkg: 'expo-image-picker', reason: 'profile picture upload' },
  { pkg: 'moment', reason: 'date formatting' },
  { pkg: 'react-native-vector-icons', reason: 'send icon' },
  { pkg: 'react-native-reanimated', reason: 'animations' },
  { pkg: 'react-native-gesture-handler', reason: 'touch interactions' },
];

for (const { pkg, reason } of REQUIRED_DEPS) {
  const pkgPath = path.join(ROOT, 'node_modules', pkg, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const version = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
    pass(`${pkg}@${version} â€” ${reason}`);
  } else {
    fail(`${pkg} is missing! â€” ${reason}`);
    totalErrors++;
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 2. Peer Dependency Version Compatibility
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
section('2. Peer Dependency Compatibility');

function getPkgVersion(pkg) {
  try {
    const p = path.join(ROOT, 'node_modules', pkg, 'package.json');
    return JSON.parse(fs.readFileSync(p, 'utf8')).version;
  } catch {
    return null;
  }
}

// native-base requires react-native-svg
const svgVersion = getPkgVersion('react-native-svg');
if (svgVersion) {
  // native-base 3.x requires react-native-svg >= 12
  const major = parseInt(svgVersion.split('.')[0], 10);
  if (major >= 12) {
    pass(`react-native-svg@${svgVersion} is compatible with native-base`);
  } else {
    fail(`react-native-svg@${svgVersion} is too old â€” native-base requires >= 12`);
    totalErrors++;
  }
} else {
  fail('react-native-svg is missing â€” native-base icon loading will fail');
  totalErrors++;
}

// Check app.json for New Architecture flag
const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
if (appJson?.expo?.newArchEnabled === true) {
  warn('newArchEnabled: true â€” native-base 3.x is not compatible with the New Architecture');
  warn('Ensure babel.config.js disables the Fabric renderer for native-base');
  totalWarnings++;
} else {
  pass('newArchEnabled: false â€” compatible with native-base 3.x');
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 3. Critical native-base Internal Paths
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
section('3. native-base Internal Path Check');

const NB_ROOT = path.join(ROOT, 'node_modules', 'native-base');
const CRITICAL_NB_FILES = [
  'src/index.tsx',
  'src/components/primitives/Icon/Icons/index.tsx',
  'src/components/primitives/Icon/nbSvg.tsx',
  'src/components/primitives/Icon/createIcon.tsx',
];

for (const file of CRITICAL_NB_FILES) {
  const fullPath = path.join(NB_ROOT, file);
  if (fs.existsSync(fullPath)) {
    pass(`native-base/${file}`);
  } else {
    fail(`native-base/${file} is missing â€” native-base installation may be corrupt`);
    totalErrors++;
  }
}

// Check whether react-native-svg can be resolved from nbSvg.tsx
const nbSvg = fs.readFileSync(
  path.join(NB_ROOT, 'src/components/primitives/Icon/nbSvg.tsx'),
  'utf8'
);
if (nbSvg.includes("from 'react-native-svg'")) {
  const svgPkgPath = path.join(ROOT, 'node_modules', 'react-native-svg', 'package.json');
  if (fs.existsSync(svgPkgPath)) {
    pass('nbSvg.tsx â†’ react-native-svg: resolvable âœ“');
  } else {
    fail('nbSvg.tsx â†’ react-native-svg: unresolvable (package missing)');
    totalErrors++;
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 4. Configuration Files
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
section('4. Configuration Files');

const CONFIG_FILES = [
  { file: 'babel.config.js', desc: 'Babel/Metro configuration' },
  { file: 'app.json', desc: 'Expo app configuration' },
  { file: '.env', desc: 'environment variables' },
  { file: '.env.example', desc: 'environment variables template' },
  { file: 'index.js', desc: 'app entry point' },
  { file: 'App.js', desc: 'root component' },
];

for (const { file, desc } of CONFIG_FILES) {
  const fullPath = path.join(ROOT, file);
  if (fs.existsSync(fullPath)) {
    pass(`${file} â€” ${desc}`);
  } else {
    fail(`${file} is missing â€” ${desc}`);
    totalErrors++;
  }
}

// Verify babel.config.js uses babel-preset-expo
const babelConfig = fs.readFileSync(path.join(ROOT, 'babel.config.js'), 'utf8');
if (babelConfig.includes('babel-preset-expo')) {
  pass('babel.config.js uses babel-preset-expo');
} else {
  fail('babel.config.js does not use babel-preset-expo');
  totalErrors++;
}

// Verify index.js imports App.js
const indexJs = fs.readFileSync(path.join(ROOT, 'index.js'), 'utf8');
if (indexJs.includes('./App') || indexJs.includes("'App'")) {
  pass('index.js imports App.js');
} else {
  warn('index.js does not directly import App.js');
  totalWarnings++;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 5. Environment Variables
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
section('5. Environment Variables (.env)');

const envPath = path.join(ROOT, '.env');
const envExamplePath = path.join(ROOT, '.env.example');

if (fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  const envKeys = fs
    .readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => l.split('=')[0].trim());
  const exampleKeys = fs
    .readFileSync(envExamplePath, 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => l.split('=')[0].trim());

  const missing = exampleKeys.filter((k) => !envKeys.includes(k));
  const present = exampleKeys.filter((k) => envKeys.includes(k));

  for (const k of present) pass(`.env contains: ${k}`);
  for (const k of missing) {
    warn(`.env is missing: ${k} (defined in .env.example)`);
    totalWarnings++;
  }
} else if (!fs.existsSync(envPath)) {
  fail('.env is missing â€” the app will fail to start');
  info('Copy .env.example to .env and fill in the values');
  totalErrors++;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 6. Static Import Analysis
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
section('6. Static Import Analysis');

/**
 * Parse a JS/JSX file and return all import paths
 */
function extractImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const regex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    const requires = /require\(['"]([^'"]+)['"]\)/g;
    const imports = [];
    let m;
    while ((m = regex.exec(content)) !== null) imports.push(m[1]);
    while ((m = requires.exec(content)) !== null) imports.push(m[1]);
    return imports;
  } catch {
    return [];
  }
}

/**
 * Check whether an import path can be resolved
 */
function canResolve(importPath, fromDir) {
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    // External package â€” check node_modules
    const pkgName = importPath.startsWith('@')
      ? importPath.split('/').slice(0, 2).join('/')
      : importPath.split('/')[0];
    return fs.existsSync(path.join(ROOT, 'node_modules', pkgName));
  }
  // Relative path â€” check for the file with common extensions
  const ext = ['.js', '.jsx', '.ts', '.tsx', '', '/index.js', '/index.jsx'];
  for (const e of ext) {
    if (fs.existsSync(path.join(fromDir, importPath + e))) return true;
  }
  return false;
}

// Core source files to analyze
const FILES_TO_CHECK = [
  'App.js',
  'navigation.js',
  'screens/login.js',
  'screens/register.js',
  'screens/home/index.js',
  'screens/home/chat.js',
  'screens/home/messages.js',
  'screens/home/profile.js',
  'components/Header.js',
  'components/EditUserModal.js',
  'components/Chat/ChatItem.js',
  'components/Chat/MessageItem.js',
  'components/Chat/MessageFooter.js',
  'components/Chat/TypingIndicator.js',
  'libs/globalState.js',
  'libs/requests.js',
  'libs/filterMessages.js',
  'libs/imageUtils.js',
];

let importErrors = 0;
for (const relFile of FILES_TO_CHECK) {
  const fullPath = path.join(ROOT, relFile);
  if (!fs.existsSync(fullPath)) {
    warn(`${relFile}: file not found`);
    continue;
  }

  const imports = extractImports(fullPath);
  const fromDir = path.dirname(fullPath);
  const unresolved = imports.filter((imp) => !canResolve(imp, fromDir));

  if (unresolved.length === 0) {
    pass(`${relFile}: all imports resolvable`);
  } else {
    for (const u of unresolved) {
      // @env is handled by babel-plugin-transform-inline-environment-variables â€” skip
      if (u === '@env') continue;
      fail(`${relFile}: cannot resolve â†’ "${u}"`);
      importErrors++;
    }
    if (unresolved.every((u) => u === '@env')) {
      pass(`${relFile}: all imports resolvable (@env handled by babel)`);
    }
  }
}
totalErrors += importErrors;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 7. Metro Bundle Simulation (optional â€” slow)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (!quick) {
  section('7. Metro Bundle Simulation (expo export)');
  info('This step takes time... use --quick to skip it');

  const result = spawnSync(
    'npx',
    ['expo', 'export', '--platform', 'ios', '--output-dir', '.build-test', '--no-bytecode'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 180000, // 3 minutes
      env: {
        ...process.env,
        NODE_ENV: 'production',
        EXPO_NO_DOTENV: '0',
      },
    }
  );

  if (result.status === 0) {
    pass('Metro bundling (iOS): succeeded âœ“');
    // Clean up temporary build output
    try {
      execSync('npx rimraf .build-test', { cwd: ROOT });
    } catch {
      // rimraf may not be installed â€” not critical
    }
  } else {
    const errOutput = result.stderr || result.stdout || '';
    const match = errOutput.match(/Unable to resolve.*\n[\s\S]*?(?=\n\n|$)/);
    if (match) {
      fail(`Metro bundling failed: ${match[0].slice(0, 300)}`);
    } else {
      fail('Metro bundling failed â€” see output above');
      if (errOutput) console.log(c.gray + errOutput.slice(0, 1000) + c.reset);
    }
    totalErrors++;
  }
} else {
  section('7. Metro Bundle Simulation (Metro)');
  warn('Skipped â€” run without --quick to enable');
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Summary
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('\n' + 'â”€'.repeat(60));
console.log(c.bold + '  Check Summary' + c.reset);
console.log('â”€'.repeat(60));

if (totalErrors === 0 && totalWarnings === 0) {
  console.log(`\n  ${c.green}${c.bold}âœ” All checks passed â€” app is ready to build${c.reset}\n`);
} else {
  if (totalErrors > 0) {
    console.log(
      `\n  ${c.red}${c.bold}âœک ${totalErrors} critical error(s) â€” must be fixed before building${c.reset}`
    );
  }
  if (totalWarnings > 0) {
    console.log(`  ${c.yellow}âڑ  ${totalWarnings} warning(s) â€” may cause issues${c.reset}`);
  }
  console.log('');
}

process.exit(totalErrors > 0 ? 1 : 0);
