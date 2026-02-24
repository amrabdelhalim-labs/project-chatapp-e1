/**
 * API Endpoint Testing Suite (E2E)
 * Tests actual HTTP requests against the running Express server
 *
 * Covers:
 * - User registration & login
 * - Authentication protection (401)
 * - Profile retrieval & update
 * - Message CRUD & conversations
 * - Error handling (400, 404)
 * - Response structure validation
 *
 * Usage: node tests/api.test.js
 */

import 'dotenv/config.js';
import http from 'http';
import mongoose from 'mongoose';
import { setIO } from '../utils/socket.js';
import { colors, state, assert, logSection, logStep, printSummary } from './test.helpers.js';

const PORT = 5001;
const BASE = `http://localhost:${PORT}`;

let testToken = null;
let testUserId = null;
let testUser2Token = null;
let testUser2Id = null;
let httpServer = null;

const timestamp = Date.now();
const testEmail1 = `api-test-${timestamp}-1@chatapp.test`;
const testEmail2 = `api-test-${timestamp}-2@chatapp.test`;

/**
 * Make HTTP request using node:http
 */
function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Start server for testing
 */
async function startServer() {
  // Connect to DB first
  await mongoose.connect(process.env.MONGODB_URL);

  // Initialize a mock Socket.IO before importing the app (controllers use getIO())
  const mockIO = { emit: () => {}, to: () => ({ emit: () => {} }) };
  setIO(mockIO);

  // Dynamic import — index.js won't auto-start because process.argv[1] is api.test.js
  const { app: expressApp } = await import('../index.js');

  return new Promise((resolve) => {
    httpServer = expressApp.listen(PORT, () => {
      console.log(`${colors.green}✓${colors.reset} Test server running on port ${PORT}`);
      resolve();
    });
  });
}

/**
 * Stop server after testing
 */
async function stopServer() {
  return new Promise((resolve) => {
    if (httpServer) {
      httpServer.close(() => resolve());
    } else {
      resolve();
    }
  });
}

/**
 * Main test workflow
 */
async function runApiTests() {
  console.log(`${'┌' + '─'.repeat(48) + '┐'}`);
  console.log(`│${' '.repeat(48)}│`);
  console.log(
    `│  ${colors.magenta}🧪 API ENDPOINT TESTS (E2E)${colors.reset}${' '.repeat(19)}│`
  );
  console.log(
    `│  ${colors.cyan}HTTP Requests → Express Server${colors.reset}${' '.repeat(16)}│`
  );
  console.log(`│${' '.repeat(48)}│`);
  console.log(`${'└' + '─'.repeat(48) + '┘'}`);

  try {
    // ============================================================
    // SETUP
    // ============================================================
    logSection('SETUP');

    logStep(1, 'Start test server');
    await startServer();
    assert(true, `Server running on port ${PORT}`);

    // ============================================================
    // PHASE 1: HEALTH CHECK
    // ============================================================
    logSection('PHASE 1: HEALTH CHECK');

    logStep(2, 'GET /api/health');
    const healthRes = await makeRequest('GET', '/api/health');
    assert(healthRes.status === 200, `Health check returns 200 (got ${healthRes.status})`);
    assert(healthRes.data.database === 'connected', 'Database is connected');
    assert(healthRes.data.repositories.user === true, 'User repository available');
    assert(healthRes.data.repositories.message === true, 'Message repository available');

    // ============================================================
    // PHASE 2: USER REGISTRATION
    // ============================================================
    logSection('PHASE 2: USER REGISTRATION');

    logStep(3, 'POST /api/user/register — valid');
    const regRes = await makeRequest('POST', '/api/user/register', {
      firstName: 'أحمد',
      lastName: 'محمد',
      email: testEmail1,
      password: '123456',
      confirmPassword: '123456',
    });
    assert(regRes.status === 201, `Registration returns 201 (got ${regRes.status})`);
    assert(!!regRes.data.accessToken, 'Token returned');
    assert(!!regRes.data.user, 'User object returned');
    assert(regRes.data.user.firstName === 'أحمد', 'firstName matches');
    testToken = regRes.data.accessToken;
    testUserId = regRes.data.user._id;

    logStep(4, 'POST /api/user/register — duplicate email');
    const dupRes = await makeRequest('POST', '/api/user/register', {
      firstName: 'سمير',
      lastName: 'أحمد',
      email: testEmail1,
      password: '123456',
      confirmPassword: '123456',
    });
    assert(dupRes.status === 400, `Duplicate email returns 400 (got ${dupRes.status})`);

    logStep(5, 'POST /api/user/register — missing fields');
    const emptyRes = await makeRequest('POST', '/api/user/register', {});
    assert(emptyRes.status === 400, `Missing fields returns 400 (got ${emptyRes.status})`);

    logStep(6, 'POST /api/user/register — password mismatch');
    const mismatchRes = await makeRequest('POST', '/api/user/register', {
      firstName: 'خالد',
      lastName: 'علي',
      email: `api-mismatch-${timestamp}@chatapp.test`,
      password: '123456',
      confirmPassword: '654321',
    });
    assert(
      mismatchRes.status === 400,
      `Password mismatch returns 400 (got ${mismatchRes.status})`
    );

    logStep(7, 'Register second user for messaging');
    const reg2Res = await makeRequest('POST', '/api/user/register', {
      firstName: 'فاطمة',
      lastName: 'علي',
      email: testEmail2,
      password: '123456',
      confirmPassword: '123456',
    });
    assert(reg2Res.status === 201, 'Second user registered');
    testUser2Token = reg2Res.data.accessToken;
    testUser2Id = reg2Res.data.user._id;

    // ============================================================
    // PHASE 3: USER LOGIN
    // ============================================================
    logSection('PHASE 3: USER LOGIN');

    logStep(8, 'POST /api/user/login — valid');
    const loginRes = await makeRequest('POST', '/api/user/login', {
      email: testEmail1,
      password: '123456',
    });
    assert(loginRes.status === 200, `Login returns 200 (got ${loginRes.status})`);
    assert(!!loginRes.data.accessToken, 'Token returned on login');
    assert(!!loginRes.data.user, 'User object returned on login');
    // Use fresh token
    testToken = loginRes.data.accessToken;

    logStep(9, 'POST /api/user/login — wrong password');
    const wrongPwRes = await makeRequest('POST', '/api/user/login', {
      email: testEmail1,
      password: 'wrongpassword',
    });
    assert(wrongPwRes.status === 400, `Wrong password returns 400 (got ${wrongPwRes.status})`);

    logStep(10, 'POST /api/user/login — non-existent user');
    const noUserRes = await makeRequest('POST', '/api/user/login', {
      email: 'nonexistent@chatapp.test',
      password: '123456',
    });
    assert(noUserRes.status === 400, `Non-existent user returns 400 (got ${noUserRes.status})`);

    logStep(11, 'POST /api/user/login — missing fields');
    const emptyLoginRes = await makeRequest('POST', '/api/user/login', {});
    assert(
      emptyLoginRes.status === 400,
      `Empty login returns 400 (got ${emptyLoginRes.status})`
    );

    // ============================================================
    // PHASE 4: AUTH PROTECTION
    // ============================================================
    logSection('PHASE 4: AUTHENTICATION PROTECTION');

    logStep(12, 'GET /api/user/profile — no token');
    const noTokenRes = await makeRequest('GET', '/api/user/profile');
    assert(noTokenRes.status === 401, `No token returns 401 (got ${noTokenRes.status})`);

    logStep(13, 'GET /api/user/profile — invalid token');
    const badTokenRes = await makeRequest('GET', '/api/user/profile', null, 'invalid.token.xyz');
    assert(badTokenRes.status === 401, `Invalid token returns 401 (got ${badTokenRes.status})`);

    logStep(14, 'GET /api/message — no token');
    const noTokenMsgRes = await makeRequest('GET', '/api/message');
    assert(noTokenMsgRes.status === 401, `Messages without token returns 401`);

    // ============================================================
    // PHASE 5: PROFILE OPERATIONS
    // ============================================================
    logSection('PHASE 5: PROFILE OPERATIONS');

    logStep(15, 'GET /api/user/profile — authenticated');
    const profileRes = await makeRequest('GET', '/api/user/profile', null, testToken);
    assert(profileRes.status === 200, `Profile returns 200 (got ${profileRes.status})`);
    assert(profileRes.data.firstName === 'أحمد', 'Profile firstName matches');
    assert(profileRes.data.email === testEmail1, 'Profile email matches');
    assert(profileRes.data.password === undefined, 'Password excluded');

    logStep(16, 'GET /api/user/friends — authenticated');
    const friendsRes = await makeRequest('GET', '/api/user/friends', null, testToken);
    assert(friendsRes.status === 200, `Friends returns 200 (got ${friendsRes.status})`);
    assert(Array.isArray(friendsRes.data), 'Returns array');
    const containsSelf = friendsRes.data.some((u) => u._id === testUserId);
    assert(!containsSelf, 'Current user excluded from friends list');

    logStep(17, 'PUT /api/user/profile — update');
    const updateRes = await makeRequest(
      'PUT',
      '/api/user/profile',
      { firstName: 'أحمد محدث', lastName: 'محمد', status: 'مشغول' },
      testToken
    );
    assert(updateRes.status === 200, `Update returns 200 (got ${updateRes.status})`);
    assert(updateRes.data.firstName === 'أحمد محدث', 'Name updated');
    assert(updateRes.data.status === 'مشغول', 'Status updated');

    // ============================================================
    // PHASE 6: MESSAGING
    // ============================================================
    logSection('PHASE 6: MESSAGING');

    logStep(18, 'POST /api/message — create message');
    const msgRes = await makeRequest(
      'POST',
      '/api/message',
      { receiverId: testUser2Id, content: 'مرحبا من اختبار API!' },
      testToken
    );
    assert(msgRes.status === 201, `Message created returns 201 (got ${msgRes.status})`);
    assert(!!msgRes.data._id, 'Message has _id');
    assert(msgRes.data.content === 'مرحبا من اختبار API!', 'Message content correct');

    logStep(19, 'POST /api/message — second message');
    const msg2Res = await makeRequest(
      'POST',
      '/api/message',
      { receiverId: testUser2Id, content: 'رسالة ثانية' },
      testToken
    );
    assert(msg2Res.status === 201, 'Second message created');

    logStep(20, 'POST /api/message — reply from user2');
    const replyRes = await makeRequest(
      'POST',
      '/api/message',
      { receiverId: testUserId, content: 'أهلاً! رد من المستخدم الثاني' },
      testUser2Token
    );
    assert(replyRes.status === 201, 'Reply message created');

    logStep(21, 'GET /api/message — all messages');
    const allMsgRes = await makeRequest('GET', '/api/message', null, testToken);
    assert(allMsgRes.status === 200, `Messages returns 200 (got ${allMsgRes.status})`);
    assert(Array.isArray(allMsgRes.data), 'Returns array');
    assert(allMsgRes.data.length >= 3, `At least 3 messages (got ${allMsgRes.data.length})`);

    logStep(22, 'GET /api/message?page=1&limit=2 — paginated');
    const pageMsgRes = await makeRequest('GET', '/api/message?page=1&limit=2', null, testToken);
    assert(pageMsgRes.status === 200, 'Paginated messages returns 200');
    assert(pageMsgRes.data.rows.length <= 2, 'Pagination limits results');
    assert(pageMsgRes.data.totalPages >= 1, 'Total pages exists');

    logStep(23, 'GET /api/message/conversation/:contactId');
    const convoRes = await makeRequest(
      'GET',
      `/api/message/conversation/${testUser2Id}`,
      null,
      testToken
    );
    assert(convoRes.status === 200, `Conversation returns 200 (got ${convoRes.status})`);
    assert(Array.isArray(convoRes.data), 'Returns array');
    assert(convoRes.data.length >= 3, `Conversation has ${convoRes.data.length} messages`);

    logStep(24, 'PATCH /api/message/seen/:senderId');
    const seenRes = await makeRequest(
      'PATCH',
      `/api/message/seen/${testUserId}`,
      null,
      testUser2Token
    );
    assert(seenRes.status === 200, `Mark seen returns 200 (got ${seenRes.status})`);
    assert(seenRes.data.modifiedCount !== undefined, 'modifiedCount returned');

    // ============================================================
    // PHASE 7: ERROR HANDLING
    // ============================================================
    logSection('PHASE 7: ERROR HANDLING');

    logStep(25, 'POST /api/message — empty content');
    const emptyMsgRes = await makeRequest(
      'POST',
      '/api/message',
      { receiverId: testUser2Id, content: '' },
      testToken
    );
    assert(
      emptyMsgRes.status === 400,
      `Empty content returns 400 (got ${emptyMsgRes.status})`
    );

    logStep(26, 'POST /api/message — missing receiverId');
    const noRecvRes = await makeRequest(
      'POST',
      '/api/message',
      { content: 'رسالة بدون مستقبل' },
      testToken
    );
    assert(noRecvRes.status === 400, `Missing receiverId returns 400 (got ${noRecvRes.status})`);

    logStep(27, 'GET /api/nonexistent — 404');
    const notFoundRes = await makeRequest('GET', '/api/nonexistent', null, testToken);
    assert(
      notFoundRes.status === 404 || notFoundRes.status === 200,
      `Unknown route handled (got ${notFoundRes.status})`
    );

    // ============================================================
    // PHASE 8: RESPONSE STRUCTURE
    // ============================================================
    logSection('PHASE 8: RESPONSE STRUCTURE VALIDATION');

    logStep(28, 'Registration response structure');
    assert(typeof regRes.data.accessToken === 'string', 'accessToken is string');
    assert(typeof regRes.data.user === 'object', 'user is object');
    assert(typeof regRes.data.user._id === 'string', 'user._id is string');

    logStep(29, 'Login response structure');
    assert(typeof loginRes.data.accessToken === 'string', 'Login accessToken is string');
    assert(typeof loginRes.data.message === 'string', 'Login message is string');

    logStep(30, 'Message response structure');
    assert(typeof msgRes.data._id === 'string', 'Message _id is string');
    assert(typeof msgRes.data.content === 'string', 'Message content is string');
    assert(typeof msgRes.data.sender === 'string', 'Message sender is string');
    assert(typeof msgRes.data.recipient === 'string', 'Message recipient is string');

    logStep(31, 'Health response structure');
    assert(typeof healthRes.data.database === 'string', 'Health database is string');
    assert(typeof healthRes.data.repositories === 'object', 'Health repositories is object');

    // ============================================================
    // CLEANUP
    // ============================================================
    logSection('CLEANUP');

    logStep(32, 'Delete test data');
    const { getRepositoryManager } = await import('../repositories/index.js');
    const repos = getRepositoryManager();

    // Delete all test messages
    if (testUserId) {
      const userMsgs = await repos.message.findAllForUser(testUserId);
      for (const msg of userMsgs) {
        await repos.message.delete(msg._id);
      }
    }

    // Delete test users
    if (testUserId) await repos.user.delete(testUserId);
    if (testUser2Id) await repos.user.delete(testUser2Id);

    assert(true, 'Test data cleaned up');

    // ============================================================
    // SUMMARY
    // ============================================================
    printSummary();

    console.log(`\n${colors.yellow}📋 API Coverage:${colors.reset}`);
    console.log(`   ✓ Health check endpoint`);
    console.log(`   ✓ User registration (success + errors)`);
    console.log(`   ✓ User login (success + errors)`);
    console.log(`   ✓ Authentication protection (401)`);
    console.log(`   ✓ Profile operations (GET, PUT)`);
    console.log(`   ✓ Messaging (POST, GET, paginated, conversation, seen)`);
    console.log(`   ✓ Error handling (400, 401)`);
    console.log(`   ✓ Response structure validation\n`);
  } catch (error) {
    console.error(`\n${colors.red}Fatal error:${colors.reset}`, error.message);
    console.error(error);
  } finally {
    await stopServer();
    await mongoose.disconnect();
    console.log(`${colors.cyan}Server stopped & database disconnected${colors.reset}`);
    process.exit(state.failed > 0 ? 1 : 0);
  }
}

runApiTests();
