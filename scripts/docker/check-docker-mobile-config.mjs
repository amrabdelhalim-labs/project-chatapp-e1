#!/usr/bin/env node
/**
 * check-docker-mobile-config.mjs
 *
 * Infra hardening “config as test” gate for Expo mobile Docker delivery.
 *
 * Ensures required Docker files exist and key safety markers exist:
 * - Dockerfile contains HEALTHCHECK tied to exported web (nginx)
 * - Dockerfile uses multi-stage build
 * - Dockerfile wires ENTRYPOINT + docker-entrypoint for Expo web export + Nginx
 * - New mobile workflow references this checker and Trivy ignores file is wired
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const WF_PATH = path.join(ROOT, '.github/workflows/docker-delivery.yml');
const TRIVY_IGNORE_PATH = path.join(ROOT, 'trivy/trivyignore.yaml');

const REQUIRED_FILES = [
  path.join(ROOT, 'app/Dockerfile'),
  path.join(ROOT, 'app/.dockerignore'),
  TRIVY_IGNORE_PATH,
  WF_PATH,
];

let passed = 0;
let failed = 0;

function ok(msg) {
  passed++;
  console.log(`  ✅ ${msg}`);
}
function fail(msg) {
  failed++;
  console.error(`  ❌ ${msg}`);
}
function mustExists(absPath, label = absPath) {
  if (fs.existsSync(absPath)) ok(`${label} exists`);
  else fail(`${label} missing: ${absPath}`);
}
function read(absPath) {
  return fs.readFileSync(absPath, 'utf8');
}
function mustInclude(text, must, label) {
  if (text.includes(must)) ok(`${label}: contains "${must}"`);
  else fail(`${label}: missing "${must}"`);
}
function mustMatch(text, regex, label) {
  if (regex.test(text)) ok(`${label}: matches ${regex}`);
  else fail(`${label}: missing pattern ${regex}`);
}

console.log('\n── Mobile Docker config: required files');
for (const f of REQUIRED_FILES) mustExists(f, path.relative(ROOT, f));

// Dockerfile markers
console.log('\n── Mobile Docker config: Dockerfile markers');
const appDockerPath = path.join(ROOT, 'app/Dockerfile');
if (fs.existsSync(appDockerPath)) {
  const t = read(appDockerPath);
  mustInclude(t, 'HEALTHCHECK', 'app/Dockerfile');
  mustInclude(t, 'http://127.0.0.1:8080/', 'app/Dockerfile HEALTHCHECK');
  mustMatch(t, /FROM\s+node:\d+.*\s+AS\s+deps/i, 'app/Dockerfile multi-stage (deps)');
  mustMatch(t, /FROM\s+node:\d+.*\s+AS\s+runner/i, 'app/Dockerfile multi-stage (runner)');
  mustInclude(t, 'export:web', 'app/Dockerfile uses Expo web export');
  mustInclude(t, 'docker-entrypoint', 'app/Dockerfile entrypoint');
}

// Trivy ignore wiring
console.log('\n── Mobile Docker config: Trivy wiring');
if (fs.existsSync(TRIVY_IGNORE_PATH)) {
  const t = read(TRIVY_IGNORE_PATH);
  mustMatch(t, /^\s*vulnerabilities:/m, 'trivy/trivyignore.yaml top-level');
}

// Workflow wiring
console.log('\n── Mobile Docker config: workflow wiring');
if (fs.existsSync(WF_PATH)) {
  const wf = read(WF_PATH);
  mustMatch(wf, /check-docker-mobile-config\.mjs/, 'workflow references checker');
  mustMatch(wf, /docker-delivery\.mjs/, 'workflow calls docker-delivery.mjs for build/scan/publish');
}

console.log('\n' + '─'.repeat(60));
console.log(`  Passed: ${passed}   Failed: ${failed}`);

if (failed > 0) {
  console.error('\n[FAIL] Mobile Docker delivery gate failed.');
  process.exit(1);
}

console.log('\n[OK] Mobile Docker delivery gate passed.');

