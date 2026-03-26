#!/usr/bin/env node
/**
 * check-docker-config.mjs
 *
 * Infra hardening “config as test” gate:
 * - Ensures Docker assets exist and contain key safety markers
 * - Ensures Trivy is wired with an ignore policy file
 * - Ensures Docker delivery workflow calls this checker
 *
 * Exit code:
 *  - 0 OK
 *  - 1 failed gate
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const WF_PATH = path.join(ROOT, '.github/workflows/docker-delivery.yml');
const TRIVY_IGNORE_PATH = path.join(ROOT, 'trivy/trivyignore.yaml');

const REQUIRED_FILES = [
  path.join(ROOT, 'docker-compose.yml'),
  path.join(ROOT, '.env.docker.example'),
  path.join(ROOT, 'server/Dockerfile'),
  path.join(ROOT, 'web/Dockerfile'),
  path.join(ROOT, 'server/.dockerignore'),
  path.join(ROOT, 'web/.dockerignore'),
  TRIVY_IGNORE_PATH,
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

// ── 1) Required files ────────────────────────────────────────────────
console.log('\n── Docker config: required files');
for (const f of REQUIRED_FILES) mustExists(f, path.relative(ROOT, f));

// ── 2) Server Dockerfile markers ──────────────────────────────────────
console.log('\n── Docker config: server/Dockerfile markers');
const serverDockerPath = path.join(ROOT, 'server/Dockerfile');
if (fs.existsSync(serverDockerPath)) {
  const t = read(serverDockerPath);
  mustInclude(t, 'HEALTHCHECK', 'server/Dockerfile');
  mustInclude(t, '/api/health', 'server/Dockerfile HEALTHCHECK');
  mustMatch(t, /FROM\s+node:\d+.*\s+AS\s+deps/i, 'server/Dockerfile multi-stage (deps)');
  mustMatch(t, /FROM\s+node:\d+.*\s+AS\s+runner/i, 'server/Dockerfile multi-stage (runner)');
  mustMatch(t, /\bUSER\s+app\b/i, 'server/Dockerfile non-root (USER app)');
  mustMatch(t, /COPY\s+--from=deps/i, 'server/Dockerfile multi-stage copy');
}

// ── 3) Web Dockerfile markers ─────────────────────────────────────────
console.log('\n── Docker config: web/Dockerfile markers');
const webDockerPath = path.join(ROOT, 'web/Dockerfile');
if (fs.existsSync(webDockerPath)) {
  const t = read(webDockerPath);
  mustMatch(t, /FROM\s+node:.*\s+AS\s+deps/i, 'web/Dockerfile multi-stage (deps)');
  mustMatch(t, /FROM\s+node:.*\s+AS\s+runner/i, 'web/Dockerfile multi-stage (runner)');
  mustInclude(t, 'nginx', 'web/Dockerfile includes nginx');
  mustInclude(t, '/usr/share/nginx/html', 'web/Dockerfile runtime output');
  mustMatch(t, /COPY\s+--from=deps/i, 'web/Dockerfile multi-stage copy');
  mustInclude(t, 'docker-entrypoint', 'web/Dockerfile entrypoint');
}

// ── 4) docker-compose wiring ──────────────────────────────────────────
console.log('\n── Docker config: docker-compose.yml wiring');
const composePath = path.join(ROOT, 'docker-compose.yml');
if (fs.existsSync(composePath)) {
  const t = read(composePath);
  mustMatch(t, /services:/, 'docker-compose.yml services');
  mustMatch(t, /\bmongodb:\s*/i, 'docker-compose.yml mongodb service');
  mustMatch(t, /\bserver:\s*/i, 'docker-compose.yml server service');
  mustMatch(t, /\bweb:\s*/i, 'docker-compose.yml web service');
  mustMatch(t, /5000:5000/, 'docker-compose.yml server port mapping');
  mustMatch(t, /3000:8080/, 'docker-compose.yml web port mapping');
  mustMatch(t, /depends_on:\s*[\s\S]*mongodb:/i, 'docker-compose.yml server depends_on mongodb');
  mustMatch(t, /condition:\s*service_healthy/i, 'docker-compose.yml mongodb health gating');
}

// ── 5) Trivy ignore policy + workflow wiring ──────────────────────────
console.log('\n── Docker config: Trivy wiring');
if (fs.existsSync(TRIVY_IGNORE_PATH)) {
  const t = read(TRIVY_IGNORE_PATH);
  mustMatch(t, /^\s*vulnerabilities:/m, 'trivy/trivyignore.yaml top-level');
}

if (fs.existsSync(WF_PATH)) {
  const wf = read(WF_PATH);
  mustMatch(
    wf,
    /check-docker-config\.mjs/,
    '.github/workflows/docker-delivery.yml calls check-docker-config.mjs'
  );
  mustMatch(
    wf,
    /docker-delivery\.mjs/,
    '.github/workflows/docker-delivery.yml calls docker-delivery.mjs for build/scan/publish'
  );
}

// ── Summary ────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
console.log(`  Passed: ${passed}   Failed: ${failed}`);

if (failed > 0) {
  console.error('\n[FAIL] Docker delivery gate failed.');
  process.exit(1);
}

console.log('\n[OK] Docker delivery gate passed.');

