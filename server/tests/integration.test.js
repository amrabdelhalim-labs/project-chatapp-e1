/**
 * Full-Stack Integration Test Suite
 * Tests complete application workflow including:
 * - Repository Layer (CRUD operations)
 * - Storage Service (file upload/delete/management)
 * - Database transactions and relationships
 * - Validators and error handling
 * - JWT token lifecycle
 *
 * Features:
 * - Creates temporary workspace for file operations
 * - Tests in isolated environment
 * - Performs cleanup after testing
 *
 * Usage: node tests/integration.test.js
 */

import 'dotenv/config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { getRepositoryManager } from '../repositories/index.js';
import StorageService from '../services/storage/storage.service.js';
import { getStorageService } from '../services/storage/storage.service.js';
import { createToken, verifyToken } from '../utils/jwt.js';
import { setIO, getIO } from '../utils/socket.js';
import { validateRegisterInput, validateLoginInput } from '../validators/user.validator.js';
import { validateMessageInput } from '../validators/message.validator.js';
import { colors, state, assert, logSection, logStep, printSummary } from './test.helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempDir = path.join(process.env.TEMP || '/tmp', `mychat-test-${Date.now()}`);
const testImages = [];

let testData = {
  users: [],
  messages: [],
};

/**
 * Create test image file (1x1 pixel PNG)
 */
async function createTestImage(filename) {
  const testImagePath = path.join(tempDir, 'test-images', filename);

  if (!fs.existsSync(path.dirname(testImagePath))) {
    fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
  }

  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);

  fs.writeFileSync(testImagePath, pngBuffer);
  testImages.push(testImagePath);
  return { path: testImagePath, buffer: pngBuffer };
}

/**
 * Initialize temporary workspace
 */
function setupTempWorkspace() {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return true;
}

/**
 * Cleanup temporary workspace
 */
function cleanupTempWorkspace() {
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      return true;
    }
    return false;
  } catch (error) {
    console.error(
      `${colors.yellow}⚠${colors.reset} Warning: Could not fully clean temp workspace:`,
      error.message
    );
    return false;
  }
}

/**
 * Main test workflow
 */
async function runFullStackTests() {
  console.log(`${'┌' + '─'.repeat(53) + '┐'}`);
  console.log(`│${' '.repeat(53)}│`);
  console.log(
    `│  ${colors.magenta}🧪 FULL-STACK INTEGRATION TEST${colors.reset}${' '.repeat(21)}│`
  );
  console.log(
    `│  ${colors.cyan}Repository + Storage + JWT + Validators${colors.reset}${' '.repeat(13)}│`
  );
  console.log(`│${' '.repeat(53)}│`);
  console.log(`${'└' + '─'.repeat(53) + '┘'}`);

  try {
    // ============================================================
    // SETUP PHASE
    // ============================================================
    logSection('SETUP PHASE');

    logStep(1, 'Create temporary workspace');
    const setupOk = setupTempWorkspace();
    assert(setupOk, `Temporary workspace created: ${tempDir}`);

    logStep(2, 'Initialize database');
    await mongoose.connect(process.env.MONGODB_URL);
    assert(true, 'Database connected');

    const repos = getRepositoryManager();
    assert(!!repos.user, 'User repository initialized');
    assert(!!repos.message, 'Message repository initialized');

    logStep(3, 'Initialize Socket utility');
    const mockIO = { emit: () => {}, to: () => ({ emit: () => {} }) };
    setIO(mockIO);
    assert(getIO() === mockIO, 'Socket utility initialized');

    // ============================================================
    // PHASE 1: JWT TOKEN LIFECYCLE
    // ============================================================
    logSection('PHASE 1: JWT TOKEN LIFECYCLE');

    logStep(4, 'Create token for test user');
    const fakeUserId = new mongoose.Types.ObjectId().toString();
    const token = createToken(fakeUserId);
    assert(typeof token === 'string' && token.length > 20, 'Token created');

    logStep(5, 'Verify token payload');
    const decoded = verifyToken(token);
    assert(decoded.userId === fakeUserId, 'Token userId matches');

    logStep(6, 'Reject invalid token');
    let invalidRejected = false;
    try {
      verifyToken('invalid.token.value');
    } catch {
      invalidRejected = true;
    }
    assert(invalidRejected, 'Invalid token rejected');

    logStep(7, 'Reject tampered token');
    let tamperedRejected = false;
    try {
      verifyToken(token + 'tampered');
    } catch {
      tamperedRejected = true;
    }
    assert(tamperedRejected, 'Tampered token rejected');

    // ============================================================
    // PHASE 2: VALIDATORS
    // ============================================================
    logSection('PHASE 2: INPUT VALIDATION');

    logStep(8, 'Valid registration passes');
    let regValid = true;
    try {
      validateRegisterInput({
        firstName: 'أحمد',
        lastName: 'محمد',
        email: 'test@test.com',
        password: '123456',
        confirmPassword: '123456',
      });
    } catch {
      regValid = false;
    }
    assert(regValid, 'Valid registration input passes');

    logStep(9, 'Invalid registration — empty fields');
    let regEmpty = false;
    try {
      validateRegisterInput({});
    } catch (e) {
      regEmpty = e.statusCode === 400;
    }
    assert(regEmpty, 'Empty registration throws 400');

    logStep(10, 'Invalid registration — password mismatch');
    let regMismatch = false;
    try {
      validateRegisterInput({
        firstName: 'أحمد',
        lastName: 'محمد',
        email: 'test@test.com',
        password: '123456',
        confirmPassword: '654321',
      });
    } catch (e) {
      regMismatch = e.statusCode === 400;
    }
    assert(regMismatch, 'Password mismatch throws 400');

    logStep(11, 'Valid login passes');
    let loginValid = true;
    try {
      validateLoginInput({ email: 'test@test.com', password: '123456' });
    } catch {
      loginValid = false;
    }
    assert(loginValid, 'Valid login input passes');

    logStep(12, 'Valid message passes');
    let msgValid = true;
    try {
      validateMessageInput({ receiverId: 'abc', content: 'مرحبا' });
    } catch {
      msgValid = false;
    }
    assert(msgValid, 'Valid message input passes');

    logStep(13, 'Invalid message — empty content');
    let msgEmpty = false;
    try {
      validateMessageInput({ receiverId: 'abc', content: '' });
    } catch (e) {
      msgEmpty = e.statusCode === 400;
    }
    assert(msgEmpty, 'Empty message content throws 400');

    // ============================================================
    // PHASE 3: USER MANAGEMENT & DATABASE
    // ============================================================
    logSection('PHASE 3: USER MANAGEMENT & DATABASE');

    logStep(14, 'Create users with Arabic names');
    const user1 = await repos.user.createUser({
      firstName: 'محمد',
      lastName: 'أحمد',
      email: `integ-${Date.now()}-1@chatapp.test`,
      password: 'hashed_pwd_1',
      profilePicture: 'http://localhost:5000/uploads/default-picture.jpg',
    });
    testData.users.push(user1._id);
    assert(!!user1._id, 'User 1 created');

    const user2 = await repos.user.createUser({
      firstName: 'فاطمة',
      lastName: 'علي',
      email: `integ-${Date.now()}-2@chatapp.test`,
      password: 'hashed_pwd_2',
      profilePicture: 'http://localhost:5000/uploads/default-picture.jpg',
    });
    testData.users.push(user2._id);
    assert(!!user2._id, 'User 2 created');

    logStep(15, 'Find and verify user by email');
    const foundUser = await repos.user.findByEmail(user1.email);
    assert(foundUser && foundUser._id.toString() === user1._id.toString(), 'User found by email');

    logStep(16, 'Update user profile');
    const updated = await repos.user.updateProfile(user1._id, {
      firstName: 'محمد أحمد',
      status: 'متصل الآن',
    });
    assert(updated.firstName === 'محمد أحمد', 'User name updated');
    assert(updated.status === 'متصل الآن', 'User status updated');

    logStep(17, 'Count users');
    const userCount = await repos.user.count();
    assert(userCount >= 2, `Database contains ${userCount} users`);

    // ============================================================
    // PHASE 4: MESSAGING & CONVERSATIONS
    // ============================================================
    logSection('PHASE 4: MESSAGING & CONVERSATIONS');

    logStep(18, 'Create messages between users');
    const msg1 = await repos.message.create({
      sender: user1._id,
      recipient: user2._id,
      content: 'مرحبا فاطمة، كيف حالك؟',
    });
    testData.messages.push(msg1._id);
    assert(!!msg1._id, 'Message 1 sent');

    const msg2 = await repos.message.create({
      sender: user2._id,
      recipient: user1._id,
      content: 'أهلاً محمد! بخير والحمد لله',
    });
    testData.messages.push(msg2._id);
    assert(!!msg2._id, 'Message 2 (reply) sent');

    const msg3 = await repos.message.create({
      sender: user1._id,
      recipient: user2._id,
      content: 'ما هي أخبارك اليوم؟',
    });
    testData.messages.push(msg3._id);
    assert(!!msg3._id, 'Message 3 sent');

    logStep(19, 'Find conversation between two users');
    const conversation = await repos.message.findConversation(user1._id, user2._id);
    assert(conversation.length >= 3, `Conversation has ${conversation.length} messages`);

    logStep(20, 'Verify message order (sorted by createdAt)');
    const isOrdered = conversation.every(
      (msg, i) => i === 0 || msg.createdAt >= conversation[i - 1].createdAt
    );
    assert(isOrdered, 'Messages sorted chronologically');

    logStep(21, 'Count unseen messages');
    const unseen = await repos.message.countUnseen(user1._id, user2._id);
    assert(unseen >= 2, `${unseen} unseen messages from user1 to user2`);

    logStep(22, 'Mark messages as seen');
    const seenCount = await repos.message.markAsSeen(user1._id, user2._id);
    assert(seenCount >= 2, `Marked ${seenCount} messages as seen`);

    const afterSeen = await repos.message.countUnseen(user1._id, user2._id);
    assert(afterSeen === 0, 'All messages now seen');

    logStep(23, 'Paginated messages');
    const page = await repos.message.findAllForUserPaginated(user1._id, 1, 2);
    assert(page.rows.length <= 2, 'Pagination respects limit');
    assert(page.totalPages >= 1, 'Total pages calculated');

    // ============================================================
    // PHASE 5: STORAGE SERVICE
    // ============================================================
    logSection('PHASE 5: STORAGE SERVICE & FILE MANAGEMENT');

    logStep(24, 'Create test image in temp workspace');
    const testImage = await createTestImage('صورة-اختبار.png');
    assert(fs.existsSync(testImage.path), 'Test image created');

    logStep(25, 'Initialize Storage Service');
    StorageService.reset();
    const storage = getStorageService();
    const storageType = StorageService.getStorageType();
    assert(!!storage, `Storage service initialized (strategy: ${storageType})`);

    logStep(26, 'Storage health check');
    const healthy = await storage.healthCheck();
    assert(healthy === true, 'Storage health check passes');

    logStep(27, 'Upload file via storage service');
    const mockFile = {
      originalname: 'profile-test.jpg',
      mimetype: 'image/jpeg',
      buffer: testImage.buffer,
    };
    const uploadResult = await storage.uploadFile(mockFile);
    assert(!!uploadResult.url, `File uploaded: ${uploadResult.url}`);
    assert(!!uploadResult.filename, `Filename: ${uploadResult.filename}`);

    logStep(28, 'Get file URL');
    const url = storage.getFileUrl(uploadResult.filename);
    assert(url.includes(uploadResult.filename), 'getFileUrl contains filename');

    logStep(29, 'Delete uploaded file');
    const deleted = await storage.deleteFile(uploadResult.filename);
    assert(deleted === true, 'File deleted successfully');

    logStep(30, 'Delete non-existing file returns false');
    const notDeleted = await storage.deleteFile('nonexistent-xyz.jpg');
    assert(notDeleted === false, 'Returns false for missing file');

    logStep(31, 'Default picture protected from deletion');
    const defaultProtected = await storage.deleteFile('default-picture.jpg');
    assert(defaultProtected === false, 'Default picture not deleted');

    logStep(32, 'Upload multiple files');
    const mockFiles = [
      { originalname: 'pic1.png', mimetype: 'image/png', buffer: testImage.buffer },
      { originalname: 'pic2.png', mimetype: 'image/png', buffer: testImage.buffer },
    ];
    const multiResult = await storage.uploadFiles(mockFiles);
    assert(multiResult.length === 2, 'Uploaded 2 files');

    // Cleanup uploaded files
    for (const r of multiResult) {
      await storage.deleteFile(r.filename);
    }

    // ============================================================
    // PHASE 6: CASCADE & CLEANUP
    // ============================================================
    logSection('PHASE 6: CASCADE OPERATIONS & CLEANUP');

    logStep(33, 'Delete all test messages');
    for (const msgId of testData.messages) {
      await repos.message.delete(msgId);
    }
    const msgRemaining =
      testData.messages.length > 0 ? await repos.message.findById(testData.messages[0]) : null;
    assert(msgRemaining === null, 'All test messages deleted');

    logStep(34, 'Delete all test users');
    for (const userId of testData.users) {
      await repos.user.delete(userId);
    }
    const userRemaining =
      testData.users.length > 0 ? await repos.user.findById(testData.users[0]) : null;
    assert(userRemaining === null, 'All test users deleted');

    logStep(35, 'Clean up test images');
    for (const imgPath of testImages) {
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    assert(true, `${testImages.length} test images cleaned`);

    logStep(36, 'Clean up temp workspace');
    const cleanedUp = cleanupTempWorkspace();
    assert(cleanedUp || !fs.existsSync(tempDir), 'Temp workspace cleaned');

    // ============================================================
    // TEST SUMMARY
    // ============================================================
    printSummary();

    console.log(`\n${colors.yellow}📋 Test Coverage:${colors.reset}`);
    console.log(`   ✓ JWT Token Lifecycle`);
    console.log(`   ✓ Input Validators (Registration, Login, Message)`);
    console.log(`   ✓ User Repository (CRUD)`);
    console.log(`   ✓ Message Repository (CRUD, Conversations, Seen)`);
    console.log(`   ✓ Storage Service (Upload, Delete, Health)`);
    console.log(`   ✓ File Management (Temp workspace, Cleanup)`);
    console.log(`   ✓ Data Cleanup & Isolation\n`);
  } catch (error) {
    console.error(`\n${colors.red}Fatal error:${colors.reset}`, error.message);
    console.error(error);
  } finally {
    cleanupTempWorkspace();
    await mongoose.disconnect();
    console.log(`${colors.cyan}Database disconnected${colors.reset}`);
    process.exit(state.failed > 0 ? 1 : 0);
  }
}

runFullStackTests();
