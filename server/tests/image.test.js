/**
 * Image Upload / Replace / Delete — Integration Test Suite
 *
 * Spins up the real Express server + MongoDB, then exercises the full
 * profile-picture lifecycle through actual HTTP requests:
 *
 *  Phase 1 — Health & Authentication
 *    • Server reachable, DB connected
 *    • Register a test user, verify default picture set
 *
 *  Phase 2 — Upload (first picture)
 *    • PUT /api/user/profile/picture with JPEG multipart body
 *    • Verify 200 + profilePicture URL in response
 *    • Verify file physically exists in public/uploads/
 *    • Verify URL is relative (/uploads/…) — what the mobile normalizeImageUrl() expects
 *    • Verify user_updated Socket.IO event would be emitted
 *
 *  Phase 3 — Replace (second picture)
 *    • Upload a different JPEG
 *    • Verify old file is DELETED from disk (no orphan leak)
 *    • Verify new file exists and URL has changed
 *
 *  Phase 4 — Input Validation
 *    • No file attached → 400
 *    • Unsupported MIME type (text/plain) → 400
 *    • File too large (> 1 MB) → 400
 *    • Unauthenticated request → 401
 *
 *  Phase 5 — URL Contract
 *    • Returned URL is always relative (/uploads/filename.ext)
 *    • Prepending API_URL produces a valid absolute URL (app-side normalizeImageUrl)
 *
 *  Phase 6 — Cleanup
 *    • Delete test user, verify uploaded files are gone
 *
 * Usage:
 *   node tests/image.test.js
 *
 * Requirements:
 *   • .env with MONGODB_URL (local or Atlas)
 *   • STORAGE_TYPE=local (default; Cloudinary/S3 skip disk assertions)
 */

import 'dotenv/config.js';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { setIO } from '../utils/socket.js';
import { colors, state, assert, logSection, logStep, printSummary } from './test.helpers.js';

// ─── Configuration ───────────────────────────────────────────────────────────
const PORT = 5003;
const BASE = `http://localhost:${PORT}`;

// Resolve the server's local upload directory.
// fileURLToPath correctly decodes URL-encoded characters (e.g., %20, Arabic)
// that appear in import.meta.url on Windows.
const __dir = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dir, '../public/uploads');

const IS_LOCAL_STORAGE = (process.env.STORAGE_TYPE || 'local').toLowerCase() === 'local';

const timestamp = Date.now();
const TEST_EMAIL = `img-test-${timestamp}@chatapp.test`;

let httpServer = null;
let testToken = null;
let uploadedFile1 = null; // basename of the first uploaded file
let uploadedFile2 = null; // basename of the second uploaded file

// ─── Synthetic image buffers ─────────────────────────────────────────────────
// Multer validates via Content-Type header + file extension, not magic bytes.
// A buffer with valid JPEG SOI/EOI markers is sufficient for the filter.

/** Build a small syntactically valid JPEG buffer (~100 bytes) */
function makeJpegBuffer(seed = 0xaa) {
  // SOI → APP0 (minimal JFIF) → EOI
  const soi = Buffer.from([0xff, 0xd8]);
  const app0 = Buffer.from([
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01,
    0x00, 0x00,
  ]);
  const payload = Buffer.alloc(64, seed); // distinguishable payload
  const eoi = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([soi, app0, payload, eoi]);
}

/** Build a buffer that is > 1 MB to trigger multer's fileSize limit */
function makeOversizedBuffer() {
  const buf = Buffer.alloc(1024 * 1024 + 512, 0xff);
  buf[0] = 0xff;
  buf[1] = 0xd8; // JPEG SOI
  return buf;
}

// ─── Multipart helper ────────────────────────────────────────────────────────
function buildMultipartBody(boundary, filename, fileBuffer, mimeType) {
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return Buffer.concat([head, fileBuffer, tail]);
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
function makeRequest(method, urlPath, bodyBuffer = null, token = null, contentType = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);

    const headers = {};
    if (contentType) headers['Content-Type'] = contentType;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (bodyBuffer) headers['Content-Length'] = bodyBuffer.length;

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let data;
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
          resolve({ status: res.statusCode, data, headers: res.headers });
        });
      }
    );
    req.on('error', reject);
    if (bodyBuffer) req.write(bodyBuffer);
    req.end();
  });
}

function makeJsonRequest(method, urlPath, body, token) {
  const buf = Buffer.from(JSON.stringify(body));
  return makeRequest(method, urlPath, buf, token, 'application/json');
}

function makeUploadRequest(fileBuffer, filename, mimeType) {
  const boundary = `TestImgBoundary${Date.now()}`;
  const body = buildMultipartBody(boundary, filename, fileBuffer, mimeType);
  return makeRequest(
    'PUT',
    '/api/user/profile/picture',
    body,
    testToken,
    `multipart/form-data; boundary=${boundary}`
  );
}

// ─── Disk helpers ─────────────────────────────────────────────────────────────
/** Extract basename from a relative or absolute picture URL */
function basenameFromUrl(url) {
  if (!url) return null;
  return path.basename(url);
}

/** Check whether a file exists in the uploads directory */
function fileExistsOnDisk(filename) {
  if (!filename) return false;
  return fs.existsSync(path.join(UPLOADS_DIR, filename));
}

// ─── normalizeImageUrl (mirror of the mobile implementation) ──────────────────
const API_URL = process.env.API_URL || `http://localhost:${PORT}`;

function normalizeImageUrl(url) {
  if (!url) return `${API_URL}/uploads/default-picture.jpg`;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `${API_URL}${url}`;
  }
  try {
    const parsed = new URL(url);
    const api = new URL(API_URL);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return `${api.origin}${parsed.pathname}`;
    }
  } catch {
    return `${API_URL}/uploads/default-picture.jpg`;
  }
  return url;
}

// ─── Server lifecycle ─────────────────────────────────────────────────────────
async function startServer() {
  await mongoose.connect(process.env.MONGODB_URL);

  // Provide a minimal mock Socket.IO so controllers don't crash
  const ioEvents = [];
  const mockIO = {
    emit: (event, data) => ioEvents.push({ event, data }),
    to: () => ({ emit: () => {} }),
    _events: ioEvents,
  };
  setIO(mockIO);

  const { app } = await import('../index.js');
  return new Promise((resolve) => {
    httpServer = app.listen(PORT, () => resolve(mockIO));
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    if (httpServer) {
      httpServer.close(() => resolve());
    } else {
      resolve();
    }
  });
}

// ─── Main test runner ─────────────────────────────────────────────────────────
async function runImageTests() {
  console.log('\n' + '┌' + '─'.repeat(50) + '┐');
  console.log('│' + ' '.repeat(50) + '│');
  console.log(
    `│  ${colors.magenta}🖼  IMAGE UPLOAD / REPLACE / DELETE — E2E${colors.reset}      │`
  );
  console.log(`│  ${colors.cyan}HTTP Multipart → Express → Local Storage${colors.reset}       │`);
  console.log('│' + ' '.repeat(50) + '│');
  console.log('└' + '─'.repeat(50) + '┘\n');

  let mockIO;

  try {
    // ══════════════════════════════════════════════════════════════
    // SETUP
    // ══════════════════════════════════════════════════════════════
    logSection('SETUP');

    logStep(1, 'Start test server');
    mockIO = await startServer();
    assert(true, `Test server running on port ${PORT}`);

    if (IS_LOCAL_STORAGE) {
      logStep(2, 'Verify uploads directory exists');
      assert(fs.existsSync(UPLOADS_DIR), `uploads dir exists: ${UPLOADS_DIR}`);
    }

    // ══════════════════════════════════════════════════════════════
    // PHASE 1 — HEALTH & AUTHENTICATION
    // ══════════════════════════════════════════════════════════════
    logSection('PHASE 1 — Health & Authentication');

    logStep(3, 'GET /api/health');
    const health = await makeRequest('GET', '/api/health');
    assert(health.status === 200, `Health 200 (got ${health.status})`);
    assert(health.data.database === 'connected', 'MongoDB connected');

    logStep(4, 'POST /api/user/register — create test user');
    const regRes = await makeJsonRequest('POST', '/api/user/register', {
      firstName: 'ImgTest',
      lastName: 'User',
      email: TEST_EMAIL,
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
    });
    assert(regRes.status === 201, `Register 201 (got ${regRes.status})`);
    assert(!!regRes.data.accessToken, 'Access token returned');
    assert(!!regRes.data.user?.profilePicture, 'Default profilePicture set on register');
    testToken = regRes.data.accessToken;

    const defaultPicture = regRes.data.user.profilePicture;
    const defaultBasename = basenameFromUrl(defaultPicture);
    assert(
      defaultBasename === 'default-picture.jpg',
      `Default picture is default-picture.jpg (got "${defaultBasename}")`
    );

    // ══════════════════════════════════════════════════════════════
    // PHASE 2 — UPLOAD FIRST PICTURE
    // ══════════════════════════════════════════════════════════════
    logSection('PHASE 2 — Upload First Picture (JPEG)');

    logStep(5, 'PUT /api/user/profile/picture — upload JPEG #1');
    const jpeg1 = makeJpegBuffer(0xaa);
    const upload1 = await makeUploadRequest(jpeg1, 'avatar1.jpg', 'image/jpeg');

    assert(upload1.status === 200, `Upload 1 returns 200 (got ${upload1.status})`);
    assert(!!upload1.data?.profilePicture, 'profilePicture field in response');

    const pic1Url = upload1.data.profilePicture;
    uploadedFile1 = basenameFromUrl(pic1Url);

    assert(!!uploadedFile1, `Extracted filename from URL: "${pic1Url}"`);
    assert(pic1Url.startsWith('/uploads/'), `URL is a relative /uploads/ path: "${pic1Url}"`);
    assert(uploadedFile1 !== 'default-picture.jpg', 'Returned a new file, not the default');

    if (IS_LOCAL_STORAGE) {
      logStep(6, 'Verify file #1 written to disk');
      assert(fileExistsOnDisk(uploadedFile1), `File "${uploadedFile1}" exists in uploads/`);
    }

    logStep(7, 'Verify normalizeImageUrl resolves the relative URL to a full URI');
    const normalized1 = normalizeImageUrl(pic1Url);
    assert(
      normalized1.startsWith('http://') || normalized1.startsWith('https://'),
      `normalizeImageUrl produces absolute URI: "${normalized1}"`
    );
    assert(
      normalized1.includes('/uploads/'),
      `Absolute URI still references /uploads/ path: "${normalized1}"`
    );

    logStep(8, 'Verify Socket.IO user_updated was emitted');
    const userUpdatedEvents = mockIO._events.filter((e) => e.event === 'user_updated');
    assert(userUpdatedEvents.length >= 1, 'user_updated socket event emitted on upload');
    assert(
      userUpdatedEvents.at(-1).data?.profilePicture === pic1Url,
      'user_updated carries updated profilePicture URL'
    );

    // ══════════════════════════════════════════════════════════════
    // PHASE 3 — REPLACE PICTURE (verifies old file deletion)
    // ══════════════════════════════════════════════════════════════
    logSection('PHASE 3 — Replace Picture (old file must be deleted)');

    logStep(9, 'PUT /api/user/profile/picture — upload JPEG #2 (replacement)');
    const jpeg2 = makeJpegBuffer(0x55); // different seed → different content
    const upload2 = await makeUploadRequest(jpeg2, 'avatar2.jpg', 'image/jpeg');

    assert(upload2.status === 200, `Upload 2 returns 200 (got ${upload2.status})`);

    const pic2Url = upload2.data?.profilePicture;
    uploadedFile2 = basenameFromUrl(pic2Url);

    assert(!!pic2Url, 'profilePicture field in upload #2 response');
    assert(pic2Url !== pic1Url, 'URL changed after replacement');
    assert(pic2Url.startsWith('/uploads/'), `Replacement URL is still relative: "${pic2Url}"`);

    if (IS_LOCAL_STORAGE) {
      logStep(10, 'Verify old file #1 was deleted from disk');
      assert(!fileExistsOnDisk(uploadedFile1), `Old file "${uploadedFile1}" removed from disk ✓`);

      logStep(11, 'Verify new file #2 exists on disk');
      assert(fileExistsOnDisk(uploadedFile2), `New file "${uploadedFile2}" exists on disk ✓`);
    }

    logStep(12, 'Verify profile still returns updated picture via GET /api/user/profile');
    const profileRes = await makeRequest('GET', '/api/user/profile', null, testToken);
    assert(profileRes.status === 200, `GET profile 200 (got ${profileRes.status})`);
    assert(
      profileRes.data?.profilePicture === pic2Url,
      `Stored picture matches upload #2: "${profileRes.data?.profilePicture}"`
    );

    // ══════════════════════════════════════════════════════════════
    // PHASE 4 — INPUT VALIDATION
    // ══════════════════════════════════════════════════════════════
    logSection('PHASE 4 — Input Validation');

    logStep(13, 'PUT /api/user/profile/picture — no file attached → 400');
    const boundary = `TestBoundaryEmpty${Date.now()}`;
    const emptyBody = Buffer.from(`--${boundary}--\r\n`);
    const noFileRes = await makeRequest(
      'PUT',
      '/api/user/profile/picture',
      emptyBody,
      testToken,
      `multipart/form-data; boundary=${boundary}`
    );
    assert(noFileRes.status === 400, `No-file request returns 400 (got ${noFileRes.status})`);

    logStep(14, 'PUT /api/user/profile/picture — unsupported MIME (text/plain) → 400');
    const textBuf = Buffer.from('not an image');
    const badMimeRes = await makeUploadRequest(textBuf, 'hack.txt', 'text/plain');
    // multer fileFilter rejects non-image types
    assert(
      badMimeRes.status === 400 || badMimeRes.status === 500,
      `Non-image MIME rejected (got ${badMimeRes.status})`
    );

    logStep(15, 'PUT /api/user/profile/picture — file > 1 MB → 400 / 413');
    const bigBuf = makeOversizedBuffer();
    const bigRes = await makeUploadRequest(bigBuf, 'toobig.jpg', 'image/jpeg');
    assert(
      bigRes.status === 400 || bigRes.status === 413,
      `Oversized file rejected (got ${bigRes.status})`
    );

    logStep(16, 'PUT /api/user/profile/picture — no auth token → 401');
    const savedToken = testToken;
    testToken = null; // temporarily clear
    const unauthedRes = await makeUploadRequest(jpeg1, 'avatar-unauthed.jpg', 'image/jpeg');
    testToken = savedToken;
    assert(
      unauthedRes.status === 401,
      `Unauthenticated request returns 401 (got ${unauthedRes.status})`
    );

    // ══════════════════════════════════════════════════════════════
    // PHASE 5 — URL CONTRACT (normalizeImageUrl mirror)
    // ══════════════════════════════════════════════════════════════
    logSection('PHASE 5 — URL Contract (normalizeImageUrl)');

    logStep(17, 'null / undefined url → default picture absolute URL');
    const nullNorm = normalizeImageUrl(null);
    assert(nullNorm.includes('default-picture.jpg'), `null → "${nullNorm}"`);
    assert(nullNorm.startsWith('http'), 'null → absolute URL');

    logStep(18, 'Relative /uploads/path → absolute URL with API base');
    const relNorm = normalizeImageUrl('/uploads/some-file.jpg');
    assert(relNorm === `${API_URL}/uploads/some-file.jpg`, `relative → "${relNorm}"`);

    logStep(19, 'Absolute localhost URL → rewritten to current API_URL host');
    const localhostUrl = 'http://localhost:5000/uploads/old-file.jpg';
    const locNorm = normalizeImageUrl(localhostUrl);
    assert(!locNorm.includes('localhost:5000'), `localhost URL host replaced: "${locNorm}"`);
    assert(locNorm.includes('/uploads/old-file.jpg'), `Pathname preserved: "${locNorm}"`);

    logStep(20, 'External https URL → returned unchanged');
    const cloudUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    const cloudNorm = normalizeImageUrl(cloudUrl);
    assert(cloudNorm === cloudUrl, `Cloudinary URL untouched: "${cloudNorm}"`);

    // ══════════════════════════════════════════════════════════════
    // PHASE 6 — CLEANUP
    // ══════════════════════════════════════════════════════════════
    logSection('PHASE 6 — Cleanup');

    logStep(21, 'Delete test user via MongoDB (direct cleanup)');
    const repos = (await import('../repositories/index.js')).getRepositoryManager();
    const deleted = await repos.user.model.deleteOne({ email: TEST_EMAIL });
    assert(deleted.deletedCount === 1, 'Test user deleted from database');

    if (IS_LOCAL_STORAGE && uploadedFile2) {
      logStep(22, 'Manually clean up remaining uploaded file');
      const remaining = path.join(UPLOADS_DIR, uploadedFile2);
      if (fs.existsSync(remaining)) {
        fs.unlinkSync(remaining);
      }
      assert(!fs.existsSync(remaining), `Remaining file "${uploadedFile2}" cleaned up`);
    }
  } catch (err) {
    console.error(`\n${colors.red}✗ Unexpected error: ${err.message}${colors.reset}`);
    console.error(err.stack);
    state.failed++;
    state.total++;
  } finally {
    await stopServer();
    await mongoose.disconnect();
    printSummary();
    process.exit(state.failed > 0 ? 1 : 0);
  }
}

runImageTests();
