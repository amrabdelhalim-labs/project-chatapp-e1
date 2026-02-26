/**
 * Storage Service — Tests (Unit + Live Integration)
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  USAGE                                                          │
 * │                                                                 │
 * │  # Unit tests only (no network, always safe):                   │
 * │  node tests/storage.test.js                                     │
 * │                                                                 │
 * │  # Include live Cloudinary tests (real credentials):            │
 * │  node tests/storage.test.js \                                   │
 * │    --CLOUDINARY_URL=cloudinary://KEY:SECRET@CLOUD \             │
 * │    --STORAGE_TYPE=cloudinary                                    │
 * │                                                                 │
 * │  # Or via shell/env file:                                       │
 * │  CLOUDINARY_URL=cloudinary://KEY:SECRET@CLOUD \                 │
 * │  STORAGE_TYPE=cloudinary \                                      │
 * │  node tests/storage.test.js                                     │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * ─── UNIT PHASES (always run, no network needed) ─────────────────
 *
 * Phase 1 — CloudinaryStorageStrategy: credential parsing
 *   • CLOUDINARY_URL (Heroku format) parsed into cloudName/key/secret
 *   • URL-encoded characters decoded
 *   • Individual vars used as fallback when CLOUDINARY_URL absent
 *   • CLOUDINARY_FOLDER env var respected; default = mychat-profiles
 *   • config object takes priority over env vars
 *   • Missing credentials throw descriptive error
 *   • Malformed CLOUDINARY_URL throws descriptive error
 *   • _initPromise is a Promise (init eagerly cached after construction)
 *   • _ensureInitialized() returns the cached Promise
 *
 * Phase 2 — CloudinaryStorageStrategy: URL utilities
 *   • _extractPublicId() from CDN URL with version segment
 *   • _extractPublicId() from CDN URL without version
 *   • _extractPublicId() returns plain IDs unchanged
 *   • _extractPublicId() handles null/empty/undefined → null
 *   • getFileUrl() returns absolute URLs unchanged
 *   • getFileUrl() returns publicId as-is when not yet initialized
 *   • getFileUrl() returns null/undefined as-is for falsy input
 *
 * Phase 3 — StorageService: factory + singleton
 *   • STORAGE_TYPE=local  → LocalStorageStrategy
 *   • STORAGE_TYPE=cloudinary → CloudinaryStorageStrategy
 *   • STORAGE_TYPE unset  → defaults to local
 *   • Singleton: same instance on repeated calls
 *   • reset() causes fresh instance on next call
 *   • getStorageType() reflects current STORAGE_TYPE env var
 *
 * Phase 4 — LocalStorageStrategy: full disk cycle
 *   • uploadFile() writes to disk and returns correct relative URL
 *   • getFileUrl() prepends baseUrl to bare filename
 *   • getFileUrl() returns absolute URLs unchanged
 *   • deleteFile() removes file → true
 *   • deleteFile() returns false for non-existent file
 *   • deleteFile() skips default-picture.jpg (protected)
 *   • uploadFiles() batch — all succeed, distinct URLs
 *   • deleteFiles() batch — correct success/failed arrays
 *
 * ─── LIVE PHASE (only runs when credentials detected via CLI or env) ──
 *
 * Phase 5 — Live Storage Provider: real upload → delete cycle
 *   • healthCheck() returns true (provider accessible)
 *   • uploadFile() reaches provider, returns https:// URL
 *   • deleteFile() removes uploaded file → true
 *   • uploadFiles() batch — all files uploaded successfully
 *   • deleteFile() non-existent → false (or throws — both acceptable)
 *   [All live-uploaded files are deleted in a finally block, even on failure]
 */

import 'dotenv/config.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import https from 'node:https';
import { assert, logSection, logStep, printSummary, state, colors } from './test.helpers.js';
import CloudinaryStorageStrategy from '../services/storage/cloudinary.strategy.js';
import LocalStorageStrategy from '../services/storage/local.strategy.js';
import StorageService from '../services/storage/storage.service.js';

// ─── Master safety kill-switch ────────────────────────────────────────────────────
// SIGKILL after 90s — unconditional OS-level termination (cannot be blocked by
// Cloudinary SDK HTTPS keep-alive connections that survive process.exit()).
// .unref() means this timer does NOT keep Node alive for unit-only runs where
// the process exits naturally before the 90s deadline.
const _masterTimer = setTimeout(() => {
  console.error('\n❌ MASTER TIMEOUT (90s): sending SIGKILL to terminate hung process.');
  process.kill(process.pid, 'SIGKILL');
}, 90_000);
_masterTimer.unref();

// ─── 1. CLI argument parsing ──────────────────────────────────────────────────
// Accepts: --KEY=VALUE  Applied to process.env before any test runs.
// Example: node tests/storage.test.js \
//            --CLOUDINARY_URL=cloudinary://KEY:SECRET@CLOUD \
//            --STORAGE_TYPE=cloudinary
const cliArgs = {};
for (const arg of process.argv.slice(2)) {
  const match = arg.match(/^--([A-Z0-9_]+)=(.+)$/);
  if (match) {
    cliArgs[match[1]] = match[2];
    process.env[match[1]] = match[2];
  }
}
if (Object.keys(cliArgs).length > 0) {
  console.log(
    `\n${colors.cyan}⚙  CLI overrides:${colors.reset}`,
    Object.entries(cliArgs)
      .map(([k, v]) => {
        const safe =
          k.toLowerCase().includes('secret') || k.toLowerCase().includes('url')
            ? v.replace(/:[^:@]+@/, ':***@')
            : v;
        return `${k}=${safe}`;
      })
      .join('  ')
  );
}

// ─── 2. Suppress expected fire-and-forget async rejections ────────────────────
// CloudinaryStorageStrategy fires _initializeCloudinary() in the constructor.
// When cloudinary package is absent (optional dep), the import fails silently.
process.on('unhandledRejection', (reason) => {
  const msg = reason?.message ?? String(reason);
  if (
    msg.includes('cloudinary') ||
    msg.includes('Cannot find module') ||
    msg.includes('Failed to load cloudinary')
  ) {
    return;
  }
  throw reason;
});

// ─── 3. Helpers ───────────────────────────────────────────────────────────────

/** Minimal fake Multer file with a text buffer (for unit/local tests) */
function makeFile(content = 'test-image-data', filename = 'photo.jpg') {
  return { originalname: filename, mimetype: 'image/jpeg', buffer: Buffer.from(content) };
}

/**
 * 1×1 pixel valid JPEG buffer — used for live upload tests so Cloudinary
 * actually accepts the file as an image (rejects non-JPEG buffers).
 */
const TINY_JPEG = Buffer.from([
  0xff,0xd8,0xff,0xe0,0x00,0x10,0x4a,0x46,0x49,0x46,0x00,0x01,0x01,0x00,0x00,
  0x01,0x00,0x01,0x00,0x00,0xff,0xdb,0x00,0x43,0x00,0x08,0x06,0x06,0x07,0x06,
  0x05,0x08,0x07,0x07,0x07,0x09,0x09,0x08,0x0a,0x0c,0x14,0x0d,0x0c,0x0b,0x0b,
  0x0c,0x19,0x12,0x13,0x0f,0x14,0x1d,0x1a,0x1f,0x1e,0x1d,0x1a,0x1c,0x1c,0x20,
  0x24,0x2e,0x27,0x20,0x22,0x2c,0x23,0x1c,0x1c,0x28,0x37,0x29,0x2c,0x30,0x31,
  0x34,0x34,0x34,0x1f,0x27,0x39,0x3d,0x38,0x32,0x3c,0x2e,0x33,0x34,0x32,0xff,
  0xc0,0x00,0x0b,0x08,0x00,0x01,0x00,0x01,0x01,0x01,0x11,0x00,0xff,0xc4,0x00,
  0x1f,0x00,0x00,0x01,0x05,0x01,0x01,0x01,0x01,0x01,0x01,0x00,0x00,0x00,0x00,
  0x00,0x00,0x00,0x00,0x01,0x02,0x03,0x04,0x05,0x06,0x07,0x08,0x09,0x0a,0x0b,
  0xff,0xda,0x00,0x08,0x01,0x01,0x00,0x00,0x3f,0x00,0xf5,0x28,0xa2,0x80,0xff,0xd9,
]);

/**
 * Wrap a promise with a hard timeout.
 * Rejects with a clear message if the promise doesn't settle in `ms` milliseconds.
 * Critical for live network calls (Cloudinary/S3) so the test never hangs.
 */
function withTimeout(promise, ms = 15000, label = 'operation') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out after ${ms}ms: ${label}`)),
      ms
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

/** Save & restore env vars safely around a synchronous test block */
function withEnv(vars, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

// ─── 4. Detect live provider credentials ──────────────────────────────────────
function detectLiveProvider() {
  const type = (process.env.STORAGE_TYPE || 'local').toLowerCase();
  if (type === 'cloudinary') {
    const ok =
      (process.env.CLOUDINARY_URL && process.env.CLOUDINARY_URL.startsWith('cloudinary://')) ||
      (process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET);
    return ok ? 'cloudinary' : null;
  }
  if (type === 's3') {
    const ok =
      process.env.AWS_S3_BUCKET &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY;
    return ok ? 's3' : null;
  }
  return null;
}

const LIVE_PROVIDER = detectLiveProvider();

// ─── 5. Live-upload cleanup registry ──────────────────────────────────────────
// Every file uploaded during Phase 5 is registered here.
// The `finally` block guarantees cleanup even when tests fail mid-phase.
const liveUploads = []; // Array<{ strategy, ref: string }>

async function cleanupLiveUploads() {
  if (liveUploads.length === 0) return;
  console.log(
    `\n${colors.cyan}🧹 Cleaning up ${liveUploads.length} live file(s)…${colors.reset}`
  );
  for (const { strategy, ref } of liveUploads) {
    try {
      const ok = await withTimeout(strategy.deleteFile(ref), 12000, `cleanup ${ref}`);
      console.log(`  ${ok ? colors.green + '\u2713' : colors.yellow + '\u26a0'} ${ref}${colors.reset}`);
    } catch (e) {
      console.log(`  ${colors.red}\u2717 ${ref} \u2014 ${e.message}${colors.reset}`);
    }
  }
  liveUploads.length = 0;
}

// ─── Phase 1 — CloudinaryStorageStrategy: credential parsing ─────────────────
logSection('Phase 1 — CloudinaryStorageStrategy: Credential Parsing');

logStep(1, 'CLOUDINARY_URL (Heroku format) — parsed correctly');
{
  const strategy = withEnv(
    {
      CLOUDINARY_URL: 'cloudinary://522879353668222:AtvmK6pxOwI4xTgBtz5zlZOzFVU@hahlnhldz',
      CLOUDINARY_CLOUD_NAME: undefined,
      CLOUDINARY_API_KEY: undefined,
      CLOUDINARY_API_SECRET: undefined,
    },
    () => new CloudinaryStorageStrategy({})
  );
  assert(strategy.cloudName === 'hahlnhldz', 'cloudName parsed from URL hostname');
  assert(strategy.apiKey === '522879353668222', 'apiKey parsed from URL username');
  assert(strategy.apiSecret === 'AtvmK6pxOwI4xTgBtz5zlZOzFVU', 'apiSecret parsed from URL password');
}

logStep(2, 'CLOUDINARY_URL — URL-encoded characters in secret are decoded');
{
  // Secrets can contain special chars that get percent-encoded in a URL
  const encodedSecret = 'secret%40with%2Fspecial';
  const strategy = withEnv(
    { CLOUDINARY_URL: `cloudinary://key:${encodedSecret}@mycloud` },
    () => new CloudinaryStorageStrategy({})
  );
  assert(strategy.apiSecret === 'secret@with/special', 'percent-encoded secret is decoded');
}

logStep(3, 'Individual vars — used as fallback when CLOUDINARY_URL absent');
{
  const strategy = withEnv(
    {
      CLOUDINARY_URL: undefined,
      CLOUDINARY_CLOUD_NAME: 'my-cloud',
      CLOUDINARY_API_KEY: 'my-key',
      CLOUDINARY_API_SECRET: 'my-secret',
    },
    () => new CloudinaryStorageStrategy({})
  );
  assert(strategy.cloudName === 'my-cloud', 'cloudName from individual var');
  assert(strategy.apiKey === 'my-key', 'apiKey from individual var');
  assert(strategy.apiSecret === 'my-secret', 'apiSecret from individual var');
}

logStep(4, 'CLOUDINARY_FOLDER env var — respected');
{
  const strategy = withEnv(
    {
      CLOUDINARY_URL: 'cloudinary://key:secret@cloud',
      CLOUDINARY_FOLDER: 'custom-folder',
    },
    () => new CloudinaryStorageStrategy({})
  );
  assert(strategy.folder === 'custom-folder', 'folder read from CLOUDINARY_FOLDER env');
}

logStep(5, 'Default folder — falls back to mychat-profiles');
{
  const strategy = withEnv(
    {
      CLOUDINARY_URL: 'cloudinary://key:secret@cloud',
      CLOUDINARY_FOLDER: undefined,
    },
    () => new CloudinaryStorageStrategy({})
  );
  assert(strategy.folder === 'mychat-profiles', 'default folder is mychat-profiles');
}

logStep(6, 'Config object — takes priority over env vars');
{
  const strategy = withEnv(
    {
      CLOUDINARY_URL: undefined,
      CLOUDINARY_CLOUD_NAME: 'env-cloud',
      CLOUDINARY_API_KEY: 'env-key',
      CLOUDINARY_API_SECRET: 'env-secret',
    },
    () =>
      new CloudinaryStorageStrategy({
        cloudName: 'config-cloud',
        apiKey: 'config-key',
        apiSecret: 'config-secret',
        folder: 'config-folder',
      })
  );
  assert(strategy.cloudName === 'config-cloud', 'config cloudName overrides env');
  assert(strategy.apiKey === 'config-key', 'config apiKey overrides env');
  assert(strategy.folder === 'config-folder', 'config folder overrides env');
}

logStep(7, 'Missing credentials — constructor throws descriptive error');
{
  let threw = false;
  let errorMsg = '';
  try {
    withEnv(
      { CLOUDINARY_URL: undefined, CLOUDINARY_CLOUD_NAME: undefined, CLOUDINARY_API_KEY: undefined, CLOUDINARY_API_SECRET: undefined },
      () => new CloudinaryStorageStrategy({})
    );
  } catch (e) {
    threw = true;
    errorMsg = e.message;
  }
  assert(threw, 'constructor throws when no credentials provided');
  assert(errorMsg.includes('CLOUDINARY_URL') || errorMsg.includes('CLOUDINARY_CLOUD_NAME'), 'error message names the missing vars');
}

logStep(8, 'Malformed CLOUDINARY_URL — constructor throws descriptive error');
{
  let threw = false;
  let errorMsg = '';
  try {
    withEnv(
      { CLOUDINARY_URL: 'not-a-valid-url!!!' },
      () => new CloudinaryStorageStrategy({})
    );
  } catch (e) {
    threw = true;
    errorMsg = e.message;
  }
  assert(threw, 'constructor throws for malformed CLOUDINARY_URL');
  assert(errorMsg.includes('malformed') || errorMsg.includes('Expected'), 'error message explains the correct format');
}

logStep(9, '_initPromise — constructor eagerly caches initialization Promise');
{
  const strategy = withEnv(
    { CLOUDINARY_URL: 'cloudinary://key:secret@cloud' },
    () => new CloudinaryStorageStrategy({})
  );
  assert(
    strategy._initPromise instanceof Promise,
    '_initPromise is a Promise immediately after construction (init cached eagerly)'
  );
}

logStep(10, '_ensureInitialized — returns the cached Promise');
{
  const strategy = withEnv(
    { CLOUDINARY_URL: 'cloudinary://key:secret@cloud' },
    () => new CloudinaryStorageStrategy({})
  );
  const result = strategy._ensureInitialized();
  assert(result instanceof Promise, '_ensureInitialized() returns a Promise');
}

// ─── Phase 2 — CloudinaryStorageStrategy: URL utilities ──────────────────────
logSection('Phase 2 — CloudinaryStorageStrategy: URL Utilities');

const cloudStrat = withEnv(
  { CLOUDINARY_URL: 'cloudinary://key:secret@mycloud' },
  () => new CloudinaryStorageStrategy({})
);

// Access the private method directly for unit testing
const extract = (v) => cloudStrat._extractPublicId(v);

logStep(1, '_extractPublicId — from CDN URL with version segment');
{
  const url = 'https://res.cloudinary.com/mycloud/image/upload/v1234567890/mychat-profiles/photo.jpg';
  const id = extract(url);
  assert(id === 'mychat-profiles/photo', 'extracts public_id and strips extension');
}

logStep(2, '_extractPublicId — from CDN URL without version');
{
  const url = 'https://res.cloudinary.com/mycloud/image/upload/mychat-profiles/avatar.png';
  const id = extract(url);
  assert(typeof id === 'string' && id.length > 0, 'returns non-empty string for URL without version');
}

logStep(3, '_extractPublicId — plain public ID returned as-is');
{
  const id = extract('mychat-profiles/user_abc123');
  assert(id === 'mychat-profiles/user_abc123', 'plain public_id returned unchanged');
}

logStep(4, '_extractPublicId — null/empty inputs return null');
{
  assert(extract(null) === null, 'null input → null');
  assert(extract('') === null, 'empty string → null');
  assert(extract(undefined) === null, 'undefined input → null');
}

logStep(5, 'getFileUrl — absolute URL returned unchanged');
{
  const absUrl = 'https://res.cloudinary.com/mycloud/image/upload/v1/photo.jpg';
  const result = cloudStrat.getFileUrl(absUrl);
  assert(result === absUrl, 'absolute https URL returned as-is');
}

logStep(6, 'getFileUrl — before initialization returns publicId as-is (safe fallback)');
{
  // cloudinary is null because _initializeCloudinary() hasn't resolved yet
  assert(cloudStrat.cloudinary === null, 'cloudinary is null before async init resolves');
  const result = cloudStrat.getFileUrl('mychat-profiles/test-id');
  assert(result === 'mychat-profiles/test-id', 'returns publicId as-is before init');
}

logStep(7, 'getFileUrl — returns null/undefined as-is for falsy input (null guard)');
{
  const strategy = withEnv(
    { CLOUDINARY_URL: 'cloudinary://key:secret@cloud' },
    () => new CloudinaryStorageStrategy({})
  );
  assert(strategy.getFileUrl(null) === null, 'null input returns null');
  assert(strategy.getFileUrl(undefined) === undefined, 'undefined input returns undefined');
}

// ─── Phase 3 — StorageService: factory + singleton ───────────────────────────
logSection('Phase 3 — StorageService: Factory & Singleton');

logStep(1, 'STORAGE_TYPE=local → LocalStorageStrategy');
{
  StorageService.reset();
  const instance = withEnv({ STORAGE_TYPE: 'local' }, () => StorageService.getInstance());
  assert(instance instanceof LocalStorageStrategy, 'factory returns LocalStorageStrategy for local');
}

logStep(2, 'STORAGE_TYPE unset → defaults to local');
{
  StorageService.reset();
  const instance = withEnv({ STORAGE_TYPE: undefined }, () => StorageService.getInstance());
  assert(instance instanceof LocalStorageStrategy, 'defaults to LocalStorageStrategy when STORAGE_TYPE unset');
}

logStep(3, 'STORAGE_TYPE=cloudinary → CloudinaryStorageStrategy');
{
  StorageService.reset();
  const instance = withEnv(
    {
      STORAGE_TYPE: 'cloudinary',
      CLOUDINARY_URL: 'cloudinary://key:secret@cloud',
      CLOUDINARY_FOLDER: undefined,
    },
    () => StorageService.getInstance()
  );
  assert(instance instanceof CloudinaryStorageStrategy, 'factory returns CloudinaryStorageStrategy');
}

logStep(4, 'Singleton — same instance on repeated calls');
{
  StorageService.reset();
  const a = withEnv({ STORAGE_TYPE: 'local' }, () => StorageService.getInstance());
  const b = StorageService.getInstance();
  assert(a === b, 'getInstance() returns the same object on repeated calls');
}

logStep(5, 'reset() — clears singleton so next call creates a fresh instance');
{
  StorageService.reset();
  const a = withEnv({ STORAGE_TYPE: 'local' }, () => StorageService.getInstance());
  StorageService.reset();
  const b = withEnv({ STORAGE_TYPE: 'local' }, () => StorageService.getInstance());
  assert(a !== b, 'reset() causes a new instance to be created');
}

logStep(6, 'getStorageType() — reflects current STORAGE_TYPE env var');
{
  const type = withEnv({ STORAGE_TYPE: 'cloudinary' }, () => StorageService.getStorageType());
  assert(type === 'cloudinary', 'getStorageType() returns current env value');
}

// Restore to local for Phase 4
StorageService.reset();

// ─── Phase 4 — LocalStorageStrategy: disk operations ─────────────────────────
logSection('Phase 4 — LocalStorageStrategy: Disk Operations');

// Temp dir — tests never pollute the real public/uploads folder
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatapp-storage-test-'));
const local = new LocalStorageStrategy({ uploadsDir: tmpDir, baseUrl: '/uploads' });

logStep(1, 'uploadFile() — writes buffer to disk, returns correct URL');
{
  const result = await local.uploadFile(makeFile('pixel-1', 'avatar.jpg'));
  assert(result.url.startsWith('/uploads/'), 'URL starts with /uploads/');
  assert(result.url.endsWith('.jpg'), 'URL preserves file extension');
  assert(typeof result.filename === 'string' && result.filename.length > 0, 'filename returned');
  const diskPath = path.join(tmpDir, path.basename(result.url));
  assert(fs.existsSync(diskPath), 'file exists on disk');
  assert(fs.readFileSync(diskPath, 'utf8') === 'pixel-1', 'disk content matches buffer');
}

logStep(2, 'getFileUrl() — prepends baseUrl to bare filename');
{
  assert(local.getFileUrl('test.jpg') === '/uploads/test.jpg', 'prepends /uploads/');
}

logStep(3, 'getFileUrl() — absolute URL returned unchanged');
{
  const abs = 'https://example.com/uploads/img.jpg';
  assert(local.getFileUrl(abs) === abs, 'absolute URL unchanged');
}

logStep(4, 'deleteFile() — removes file, returns true');
{
  const { url } = await local.uploadFile(makeFile('del-me', 'del.jpg'));
  const diskPath = path.join(tmpDir, path.basename(url));
  assert(fs.existsSync(diskPath), 'file exists before delete');
  const ok = await local.deleteFile(url);
  assert(ok === true, 'deleteFile returns true');
  assert(!fs.existsSync(diskPath), 'file gone from disk');
}

logStep(5, 'deleteFile() — returns false for non-existent file');
{
  assert((await local.deleteFile('/uploads/ghost-99999.jpg')) === false, 'returns false');
}

logStep(6, 'deleteFile() — skips default-picture.jpg (protected asset)');
{
  assert(
    (await local.deleteFile('/uploads/default-picture.jpg')) === false,
    'protected default picture skipped'
  );
}

logStep(7, 'uploadFiles() batch — distinct URLs, all on disk');
{
  const files = [makeFile('a', 'a.jpg'), makeFile('b', 'b.jpg'), makeFile('c', 'c.jpg')];
  const results = await local.uploadFiles(files);
  assert(results.length === 3, '3 results');
  assert(new Set(results.map((r) => r.url)).size === 3, 'all URLs distinct');
  for (const r of results) {
    assert(fs.existsSync(path.join(tmpDir, path.basename(r.url))), `${r.filename} on disk`);
  }
}

logStep(8, 'deleteFiles() batch — correct success/failed arrays');
{
  const [r1, r2] = await local.uploadFiles([makeFile('x', 'x.jpg'), makeFile('y', 'y.jpg')]);
  const { success, failed } = await local.deleteFiles([r1.url, r2.url, '/uploads/ghost.jpg']);
  assert(success.length === 2, '2 successful deletions');
  assert(failed.length === 1, '1 failed (ghost file)');
}

// Cleanup local temp directory
fs.rmSync(tmpDir, { recursive: true, force: true });
StorageService.reset();

// ─── Phase 5 — Live Storage Provider Integration ──────────────────────────────
if (!LIVE_PROVIDER) {
  console.log(
    `\n${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
  );
  console.log(`${colors.yellow}⚡ Phase 5 SKIPPED — no live credentials detected.${colors.reset}`);
  console.log(`${colors.yellow}   Pass credentials to enable live tests:${colors.reset}`);
  console.log(
    `${colors.yellow}   node tests/storage.test.js \\${colors.reset}`
  );
  console.log(
    `${colors.yellow}     --CLOUDINARY_URL=cloudinary://KEY:SECRET@CLOUD \\${colors.reset}`
  );
  console.log(`${colors.yellow}     --STORAGE_TYPE=cloudinary${colors.reset}`);
  console.log(
    `${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
  );
} else {
  logSection(`Phase 5 — Live ${LIVE_PROVIDER.toUpperCase()} Integration (real network)`);

  StorageService.reset();
  let liveStrategy = null;
  try {
    liveStrategy = StorageService.getInstance();
    const folder = liveStrategy.folder ?? '(default)';
    console.log(
      `${colors.cyan}   Provider: ${LIVE_PROVIDER} | Folder: ${folder}${colors.reset}`
    );
  } catch (e) {
    console.log(`${colors.red}✗ Could not create live strategy: ${e.message}${colors.reset}`);
  }

  if (liveStrategy) {
    try {
      // Poll SDK init instead of blanket sleep — exits as soon as ready
      logStep('init', 'Waiting for provider SDK initialization (up to 10s)…');
      {
        const deadline = Date.now() + 10_000;
        while (!liveStrategy.cloudinary && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 200));
        }
        console.log(
          `   SDK ready: ${liveStrategy.cloudinary ? colors.green + 'yes' : colors.yellow + 'no (dynamic import unavailable)'}${colors.reset}`
        );
      }

      // ─ 5.1 healthCheck ────────────────────────────────────────────────────
      logStep(1, 'healthCheck() — provider is reachable');
      {
        let healthy = false;
        try {
          healthy = await withTimeout(liveStrategy.healthCheck(), 10000, 'healthCheck');
        } catch (e) {
          console.log(`   ${colors.yellow}healthCheck error: ${e.message}${colors.reset}`);
          healthy = false;
        }
        assert(healthy === true, `${LIVE_PROVIDER} healthCheck() returned true`);
      }

      // ─ 5.2 uploadFile ─────────────────────────────────────────────────────
      logStep(2, 'uploadFile() — uploads real file, returns https:// URL');
      let uploaded1 = null;
      {
        try {
          const file = { originalname: 'test-upload.jpg', mimetype: 'image/jpeg', buffer: TINY_JPEG };
          uploaded1 = await withTimeout(liveStrategy.uploadFile(file), 20000, 'uploadFile');
          liveUploads.push({ strategy: liveStrategy, ref: uploaded1.publicId ?? uploaded1.url });
          assert(
            typeof uploaded1?.url === 'string' && uploaded1.url.startsWith('https://'),
            'upload returns absolute https:// URL'
          );
          assert(
            typeof (uploaded1.publicId ?? uploaded1.filename) === 'string',
            'upload returns publicId or filename'
          );
        } catch (e) {
          assert(false, `uploadFile() threw: ${e.message}`);
        }
      }

      // ─ 5.3 deleteFile of own upload ───────────────────────────────────────
      logStep(3, 'deleteFile() — removes the uploaded file');
      {
        if (uploaded1) {
          const ref = uploaded1.publicId ?? uploaded1.url;
          // Remove from auto-cleanup list since we're deleting manually here
          const idx = liveUploads.findIndex((u) => u.ref === ref);
          if (idx !== -1) liveUploads.splice(idx, 1);
          try {
            const ok = await withTimeout(liveStrategy.deleteFile(ref), 15000, 'deleteFile');
            assert(ok === true, 'deleteFile returns true for own upload');
          } catch (e) {
            assert(false, `deleteFile() threw: ${e.message}`);
          }
        } else {
          assert(false, 'skipped — uploadFile failed in step 2');
        }
      }

      // ─ 5.4 uploadFiles batch ─────────────────────────────────────────────
      logStep(4, 'uploadFiles() batch — all succeed');
      {
        try {
          const files = [
            { originalname: 'batch-1.jpg', mimetype: 'image/jpeg', buffer: TINY_JPEG },
            { originalname: 'batch-2.jpg', mimetype: 'image/jpeg', buffer: TINY_JPEG },
          ];
          const results = await withTimeout(
            liveStrategy.uploadFiles(files), 30000, 'uploadFiles batch'
          );
          for (const r of results) {
            liveUploads.push({ strategy: liveStrategy, ref: r.publicId ?? r.url });
          }
          assert(results.length === 2, 'batch: 2 results');
          assert(
            results.every((r) => r.url?.startsWith('https://')),
            'batch: all URLs are https://'
          );
          assert(new Set(results.map((r) => r.url)).size === 2, 'batch: all URLs distinct');
        } catch (e) {
          assert(false, `uploadFiles() threw: ${e.message}`);
        }
      }

      // ─ 5.5 deleteFile for non-existent ───────────────────────────────────
      logStep(5, 'deleteFile() — non-existent publicId → false (or throws)');
      {
        try {
          const gone = await withTimeout(
            liveStrategy.deleteFile('storage-test/__non_existent_99999'),
            10000, 'deleteFile non-existent'
          );
          assert(gone === false, 'returns false for non-existent');
        } catch {
          assert(true, 'throws for non-existent (acceptable)');
        }
      }

    } finally {
      // ─ Guaranteed cleanup ─────────────────────────────────────────────────
      logStep('cleanup', `Cleaning up all live-uploaded files…`);
      await cleanupLiveUploads();
    }
  }
}

// ─── Final Summary ────────────────────────────────────────────────────────────
StorageService.reset();
printSummary();

// Proactively close HTTPS keep-alive connection pool so process.exit() works
// without waiting for socket timeout (~120s on some Node.js versions).
https.globalAgent.destroy();

// Always force-exit — Cloudinary SDK (and other providers) leave open HTTP
// connections that prevent Node.js from exiting naturally.
// If this process.exit() is still blocked, the master SIGKILL timer fires at 90s.
process.exit(state.failed > 0 ? 1 : 0);
