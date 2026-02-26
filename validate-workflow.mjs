#!/usr/bin/env node
/**
 * validate-workflow.mjs — Local workflow validator for project-chatapp-e1 (محادثتي)
 *
 * Catches CI deploy issues before pushing to GitHub by running five checks:
 *   1. YAML structure       — no tabs, required top-level keys present
 *   2. rsync excludes       — critical directories are excluded from server deploy
 *   3. package.json sim.    — extracts deletions from the workflow itself,
 *      applies them to server/package.json, and verifies the result is clean
 *   4. Completeness check   — proactively verifies every forbidden-pattern script
 *      in package.json has a matching delete statement in the workflow
 *   5. Static assets        — _redirects, 404.html, web/public/index.html SPA receiver
 *      (prevents SPA 404 on direct navigation / page refresh)
 *
 * Usage:
 *   node validate-workflow.mjs        # run all checks, exit 1 on failure
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — one or more checks failed
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

// ── Helpers ────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function ok(msg) {
  console.log(`  ✅ ${msg}`);
  passed++;
}
function fail(msg) {
  console.error(`  ❌ ${msg}`);
  failed++;
}
function warn(msg) {
  console.warn(`  ⚠️  ${msg}`);
}
function section(title) {
  console.log(`\n── ${title}`);
}

// ── Project config ─────────────────────────────────────────────────────────
const WF_PATH = path.join(ROOT, '.github/workflows/build-and-deploy.yml');
const PKG_PATH = path.join(ROOT, 'server/package.json');

// Scripts that MUST remain after stripping (production entry points)
const REQUIRED_SCRIPTS = ['start'];

// Scripts whose presence after stripping signals a broken deploy
// (reference tools that will be absent in production)
const FORBIDDEN_PATTERNS = [
  /^dev$/,
  /^test/,      // test, test:all, test:*, etc.
  /^format/,    // format, format:check
];

// rsync excludes that MUST appear in the workflow
const REQUIRED_RSYNC_EXCLUDES = ['node_modules', 'tests', 'dist', 'coverage'];

// Patterns that MUST NOT appear in cp commands (sanity check)
const FORBIDDEN_COPY_PATTERNS = ['prettier', 'node_modules'];

// ── 1. YAML structure ──────────────────────────────────────────────────────
section('1. YAML structure');

if (!existsSync(WF_PATH)) {
  fail(`Workflow file not found: ${WF_PATH}`);
  process.exit(1);
}

const yaml = readFileSync(WF_PATH, 'utf8');

if (/\t/.test(yaml)) {
  fail('Workflow contains hard tab characters (invalid YAML — GitHub will reject it)');
} else {
  ok('No hard tab characters');
}

for (const key of ['name:', 'on:', 'permissions:', 'concurrency:', 'jobs:']) {
  if (yaml.includes(key)) ok(`Required key present: "${key}"`);
  else fail(`Missing required top-level key: "${key}"`);
}

if (yaml.includes('[skip ci]')) {
  ok('Deploy commits use [skip ci] to prevent recursive triggers');
} else {
  fail('Deploy commit messages missing [skip ci]');
}

// ── 2. rsync excludes ─────────────────────────────────────────────────────
section('2. rsync excludes (server deploy)');

if (!yaml.includes('rsync')) {
  fail('Server deploy does not use rsync — consider switching from cp -r');
} else {
  ok('Server deploy uses rsync');
}

for (const ex of REQUIRED_RSYNC_EXCLUDES) {
  if (yaml.includes(`--exclude=${ex}`)) {
    ok(`rsync excludes "${ex}"`);
  } else {
    fail(`rsync missing --exclude=${ex} — "${ex}/" may end up in the server branch`);
  }
}

// Check no forbidden patterns are being cp'd separately
for (const pattern of FORBIDDEN_COPY_PATTERNS) {
  const cpLines = yaml
    .split('\n')
    .filter(l => l.includes('cp ') && l.includes(pattern));
  if (cpLines.length > 0) {
    cpLines.forEach(l => fail(`Forbidden cp command found: ${l.trim()}`));
  }
}

// ── 3. package.json simulation ────────────────────────────────────────────
section('3. package.json stripping simulation');

if (!existsSync(PKG_PATH)) {
  fail(`server/package.json not found: ${PKG_PATH}`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'));

// Extract every script name being deleted from the workflow YAML
// Handles both: delete p.scripts['name'] and delete p.scripts.name
const deletedByWorkflow = new Set([
  ...[...yaml.matchAll(/delete\s+p\.scripts\[['"]([^'"]+)['"]\]/g)].map(m => m[1]),
  ...[...yaml.matchAll(/delete\s+p\.scripts\.(\w+)/g)].map(m => m[1]),
]);

const deletesDevDeps = yaml.includes('delete p.devDependencies');

// Report any phantom deletes (listed in workflow but don't exist in package.json)
for (const name of deletedByWorkflow) {
  if (pkg.scripts?.[name] === undefined) {
    warn(`Workflow deletes "${name}" but it doesn't exist in server/package.json (harmless but stale)`);
  }
}

// Simulate the stripping
const prod = JSON.parse(JSON.stringify(pkg)); // deep clone
for (const name of deletedByWorkflow) delete prod.scripts?.[name];
if (deletesDevDeps) delete prod.devDependencies;

// Check required scripts survive
for (const s of REQUIRED_SCRIPTS) {
  if (prod.scripts?.[s]) {
    ok(`"${s}" script preserved: "${prod.scripts[s]}"`);
  } else {
    fail(`"${s}" script missing after stripping — server will not start on Heroku`);
  }
}

// Check no forbidden scripts remain
for (const [name, cmd] of Object.entries(prod.scripts ?? {})) {
  const isForbidden = FORBIDDEN_PATTERNS.some(re => re.test(name));
  if (isForbidden) {
    fail(`Script "${name}" still present after stripping ("${cmd}") — may reference missing tools`);
  } else {
    ok(`Script "${name}" is safe for production deploy`);
  }
}

// Check devDependencies are gone
if (!deletesDevDeps) {
  fail('Workflow does not delete p.devDependencies — dev packages will be deployed');
} else if (prod.devDependencies && Object.keys(prod.devDependencies).length > 0) {
  fail(`devDependencies still present: ${Object.keys(prod.devDependencies).join(', ')}`);
} else {
  ok('devDependencies removed');
}

// Check remaining scripts don't reference devDep tools
const devBinaries = Object.keys(pkg.devDependencies ?? {});
for (const [name, cmd] of Object.entries(prod.scripts ?? {})) {
  for (const bin of devBinaries) {
    if (cmd.includes(bin)) {
      fail(`Script "${name}" uses "${bin}" which is in devDependencies (will be absent in production)`);
    }
  }
}

// ── 4. Completeness check (scripts → workflow sync) ─────────────────────
section('4. Completeness check (scripts \u2192 workflow sync)');

// Proactively find any script in package.json that matches FORBIDDEN_PATTERNS
// but is NOT in the workflow's deletion list — catches the "I added test:foo
// but forgot to update the workflow" class of failure before it hits CI.
const allScriptNames = Object.keys(pkg.scripts ?? {});
const missingFromWorkflow = allScriptNames.filter(name => {
  const isForbidden = FORBIDDEN_PATTERNS.some(re => re.test(name));
  const isRequired  = REQUIRED_SCRIPTS.includes(name);
  return isForbidden && !isRequired && !deletedByWorkflow.has(name);
});

if (missingFromWorkflow.length === 0) {
  ok('All forbidden-pattern scripts are accounted for in workflow deletions');
} else {
  for (const name of missingFromWorkflow) {
    fail(
      `Script "${name}" matches a forbidden pattern but is NOT deleted by the workflow` +
      ` — add: delete p.scripts['${name}'];`
    );
  }
}

// ── 5. Static assets (SPA routing) ─────────────────────────────────────────
section('5. Static assets (SPA routing)');

// ── 5a. _redirects (Netlify / Render catch-all) ──────────────────────────
const REDIRECTS_PATH = path.join(ROOT, 'web/public/_redirects');
if (!existsSync(REDIRECTS_PATH)) {
  fail('web/public/_redirects مفقود — مسارات SPA ستعطي 404 على Netlify/Render');
} else {
  const redirectsContent = readFileSync(REDIRECTS_PATH, 'utf8');
  if (!redirectsContent.includes('/* /index.html 200')) {
    fail('_redirects: قاعدة catch-all "/* /index.html 200" غير موجودة');
  } else {
    ok('_redirects: قاعدة catch-all لـ SPA موجودة');
  }
}

// ── 5b. 404.html (GitHub Pages SPA redirect) ─────────────────────────────
const NOT_FOUND_PATH = path.join(ROOT, 'web/public/404.html');
if (!existsSync(NOT_FOUND_PATH)) {
  fail('web/public/404.html مفقود — مسارات SPA ستعطي 404 عند التصفح المباشر على GitHub Pages');
} else {
  const notFoundContent = readFileSync(NOT_FOUND_PATH, 'utf8');
  if (!notFoundContent.includes('pathSegmentsToKeep')) {
    fail('404.html: سكريبت إعادة التوجيه لـ SPA غير موجود (pathSegmentsToKeep مفقود)');
  } else {
    ok('404.html: سكريبت إعادة التوجيه لـ GitHub Pages SPA موجود');
  }
}

// ── 5c. index.html receiver script ───────────────────────────────────────
const WEB_INDEX_PATH = path.join(ROOT, 'web/public/index.html');
if (!existsSync(WEB_INDEX_PATH)) {
  fail('web/public/index.html مفقود');
} else {
  const indexContent = readFileSync(WEB_INDEX_PATH, 'utf8');
  if (!indexContent.includes("l.search[1] === '/'")) {
    fail('web/public/index.html: سكريبت استقبال إعادة التوجيه مفقود (مطلوب مع 404.html)');
  } else {
    ok('web/public/index.html: سكريبت استقبال SPA موجود');
  }
}

// ── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`  Passed: ${passed}   Failed: ${failed}`);

if (failed > 0) {
  console.error('\n[FAIL] Workflow has issues — fix them before pushing.\n');
  process.exit(1);
} else {
  console.log('\n[OK] Workflow is valid and ready to push.\n');
}
