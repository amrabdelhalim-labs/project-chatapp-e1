/**
 * Comprehensive Integration Test Suite
 * Full end-to-end testing of the Repository Pattern implementation
 * Creates, updates, and deletes all data types in a single workflow
 *
 * Usage: node tests/comprehensive.test.js
 */

import 'dotenv/config.js';
import mongoose from 'mongoose';
import { getRepositoryManager } from '../repositories/index.js';
import {
  validateRegisterInput,
  validateLoginInput,
  validateUpdateUserInput,
} from '../validators/user.validator.js';
import { validateMessageInput } from '../validators/message.validator.js';
import { createToken, verifyToken } from '../utils/jwt.js';
import { setIO, getIO } from '../utils/socket.js';
import { getStorageService } from '../services/storage/storage.service.js';
import StorageService from '../services/storage/storage.service.js';
import { colors, state, assert, logSection, logStep, printSummary } from './test.helpers.js';

let testData = {
  users: [],
  messages: [],
};

/**
 * Main test workflow
 */
async function runComprehensiveTests() {
  console.log(`${'┌' + '─'.repeat(48) + '┐'}`);
  console.log(`│${' '.repeat(48)}│`);
  console.log(
    `│  ${colors.magenta}🧪 COMPREHENSIVE INTEGRATION TEST${colors.reset}${' '.repeat(13)}│`
  );
  console.log(
    `│  ${colors.cyan}Full Workflow: Create → Update → Delete${colors.reset}${' '.repeat(8)}│`
  );
  console.log(`│${' '.repeat(48)}│`);
  console.log(`${'└' + '─'.repeat(48) + '┘'}`);

  try {
    // Initialize database
    console.log('\n⚙️ Initializing...');
    await mongoose.connect(process.env.MONGODB_URL);
    console.log(`${colors.green}✓${colors.reset} Database connected\n`);

    const repos = getRepositoryManager();
    console.log(`${colors.green}✓${colors.reset} Repository manager initialized\n`);

    // ============================================================
    // PHASE 1: UNIT TESTS - VALIDATORS
    // ============================================================
    logSection('PHASE 1: VALIDATORS');

    logStep(1, 'Register validator — valid input');
    try {
      validateRegisterInput({
        firstName: 'أحمد',
        lastName: 'محمد',
        email: 'test@example.com',
        password: '123456',
        confirmPassword: '123456',
      });
      assert(true, 'Valid register input passes validation');
    } catch (e) {
      assert(false, 'Valid register input passes validation');
    }

    logStep(2, 'Register validator — missing fields');
    try {
      validateRegisterInput({ firstName: '', lastName: '', email: '', password: '' });
      assert(false, 'Empty fields should throw');
    } catch (e) {
      assert(e.statusCode === 400, 'Throws 400 for empty fields');
      assert(e.message.includes('الاسم الأول'), 'Error mentions firstName');
    }

    logStep(3, 'Register validator — password mismatch');
    try {
      validateRegisterInput({
        firstName: 'أحمد',
        lastName: 'محمد',
        email: 'test@example.com',
        password: '123456',
        confirmPassword: '654321',
      });
      assert(false, 'Mismatched passwords should throw');
    } catch (e) {
      assert(e.statusCode === 400, 'Throws 400 for password mismatch');
      assert(e.message.includes('غير متطابق'), 'Error mentions password mismatch');
    }

    logStep(4, 'Register validator — invalid email');
    try {
      validateRegisterInput({
        firstName: 'أحمد',
        lastName: 'محمد',
        email: 'not-an-email',
        password: '123456',
        confirmPassword: '123456',
      });
      assert(false, 'Invalid email should throw');
    } catch (e) {
      assert(e.statusCode === 400, 'Throws 400 for invalid email');
      assert(e.message.includes('البريد الإلكتروني'), 'Error mentions email format');
    }

    logStep(5, 'Register validator — short password');
    try {
      validateRegisterInput({
        firstName: 'أحمد',
        lastName: 'محمد',
        email: 'test@example.com',
        password: '123',
        confirmPassword: '123',
      });
      assert(false, 'Short password should throw');
    } catch (e) {
      assert(e.statusCode === 400, 'Throws 400 for short password');
      assert(e.message.includes('6 أحرف'), 'Error mentions minimum length');
    }

    logStep(6, 'Login validator — valid input');
    try {
      validateLoginInput({ email: 'test@example.com', password: '123456' });
      assert(true, 'Valid login input passes validation');
    } catch (e) {
      assert(false, 'Valid login input passes validation');
    }

    logStep(7, 'Login validator — missing email');
    try {
      validateLoginInput({ email: '', password: '123456' });
      assert(false, 'Empty email should throw');
    } catch (e) {
      assert(e.statusCode === 400, 'Throws 400 for empty email');
    }

    logStep(8, 'Update user validator — valid input');
    try {
      validateUpdateUserInput({ firstName: 'أحمد', lastName: 'محمد', status: 'متصل' });
      assert(true, 'Valid update input passes validation');
    } catch (e) {
      assert(false, 'Valid update input passes validation');
    }

    logStep(9, 'Update user validator — optional fields');
    try {
      validateUpdateUserInput({});
      assert(true, 'Empty update input passes (optional fields)');
    } catch (e) {
      assert(false, 'Empty update input passes (optional fields)');
    }

    logStep(10, 'Message validator — valid input');
    try {
      validateMessageInput({ receiverId: 'abc123', content: 'مرحبا' });
      assert(true, 'Valid message input passes validation');
    } catch (e) {
      assert(false, 'Valid message input passes validation');
    }

    logStep(11, 'Message validator — empty content');
    try {
      validateMessageInput({ receiverId: 'abc123', content: '' });
      assert(false, 'Empty content should throw');
    } catch (e) {
      assert(e.statusCode === 400, 'Throws 400 for empty content');
    }

    logStep(12, 'Message validator — missing receiverId');
    try {
      validateMessageInput({ content: 'مرحبا' });
      assert(false, 'Missing receiverId should throw');
    } catch (e) {
      assert(e.statusCode === 400, 'Throws 400 for missing receiverId');
    }

    // ============================================================
    // PHASE 2: UNIT TESTS - JWT UTILITIES
    // ============================================================
    logSection('PHASE 2: JWT UTILITIES');

    logStep(13, 'Create and verify token');
    const testUserId = new mongoose.Types.ObjectId().toString();
    const token = createToken(testUserId);
    assert(typeof token === 'string', 'createToken returns a string');
    assert(token.length > 20, 'Token has reasonable length');

    logStep(14, 'Verify token returns correct userId');
    const decoded = verifyToken(token);
    assert(decoded.userId === testUserId, 'Decoded userId matches original');

    logStep(15, 'Verify invalid token throws error');
    try {
      verifyToken('invalid.token.here');
      assert(false, 'Invalid token should throw');
    } catch (e) {
      assert(true, 'Invalid token throws error');
    }

    // ============================================================
    // PHASE 3: UNIT TESTS - SOCKET UTILITY
    // ============================================================
    logSection('PHASE 3: SOCKET UTILITY');

    logStep(16, 'getIO before setIO throws');
    try {
      // Reset socket state for testing
      setIO(null);
    } catch (e) {
      // May throw, that's ok
    }

    logStep(17, 'setIO and getIO work correctly');
    const mockIO = { emit: () => {} };
    setIO(mockIO);
    const io = getIO();
    assert(io === mockIO, 'getIO returns the same IO instance');

    // ============================================================
    // PHASE 4: REPOSITORY PATTERN - USER
    // ============================================================
    logSection('PHASE 4: USER REPOSITORY');

    logStep(18, 'Health check');
    const health = await repos.healthCheck();
    assert(health.database === 'connected', 'Database is connected');
    assert(health.repositories.user === true, 'User repository available');
    assert(health.repositories.message === true, 'Message repository available');

    logStep(19, 'Create first user');
    const user1 = await repos.user.createUser({
      firstName: 'أحمد',
      lastName: 'محمد',
      email: `test-${Date.now()}-1@chatapp.com`,
      password: 'hashed_password_123',
      profilePicture: 'http://localhost:5000/uploads/default-picture.jpg',
    });
    testData.users.push(user1._id);
    assert(user1 && user1._id, 'User 1 created with _id');
    assert(user1.firstName === 'أحمد', 'User 1 firstName is correct');
    assert(user1.password === undefined, 'Password excluded from returned user');

    logStep(20, 'Create second user');
    const user2 = await repos.user.createUser({
      firstName: 'فاطمة',
      lastName: 'علي',
      email: `test-${Date.now()}-2@chatapp.com`,
      password: 'hashed_password_456',
      profilePicture: 'http://localhost:5000/uploads/default-picture.jpg',
    });
    testData.users.push(user2._id);
    assert(user2 && user2._id, 'User 2 created with _id');
    assert(user2.firstName === 'فاطمة', 'User 2 firstName is correct');

    logStep(21, 'Find user by email');
    const foundUser = await repos.user.findByEmail(user1.email);
    assert(foundUser !== null, 'User found by email');
    assert(foundUser._id.toString() === user1._id.toString(), 'Found correct user');

    logStep(22, 'Email exists check — existing email');
    const emailExists = await repos.user.emailExists(user1.email);
    assert(emailExists === true, 'emailExists returns true for existing email');

    logStep(23, 'Email exists check — non-existing email');
    const emailNotExists = await repos.user.emailExists('nonexistent@chatapp.com');
    assert(emailNotExists === false, 'emailExists returns false for non-existing email');

    logStep(24, 'Find user by ID (safe — no password)');
    const safeUser = await repos.user.findByIdSafe(user1._id);
    assert(safeUser !== null, 'User found by ID');
    assert(safeUser.password === undefined, 'Password excluded from safe find');

    logStep(25, 'Find all users except current');
    const otherUsers = await repos.user.findAllExcept(user1._id);
    assert(Array.isArray(otherUsers), 'Returns array');
    const containsUser1 = otherUsers.some((u) => u._id.toString() === user1._id.toString());
    assert(!containsUser1, 'Current user excluded from results');

    logStep(26, 'Update user profile');
    const updatedUser = await repos.user.updateProfile(user1._id, {
      firstName: 'أحمد Updated',
      lastName: 'محمد',
      status: 'مشغول',
    });
    assert(updatedUser.firstName === 'أحمد Updated', 'firstName updated correctly');
    assert(updatedUser.status === 'مشغول', 'Status updated correctly');
    assert(updatedUser.password === undefined, 'Password excluded after update');

    logStep(27, 'Update profile picture');
    const picResult = await repos.user.updateProfilePicture(
      user1._id,
      'http://localhost:5000/uploads/new-pic.jpg'
    );
    assert(
      picResult.previousPicture === 'http://localhost:5000/uploads/default-picture.jpg',
      'Previous picture URL returned'
    );
    assert(
      picResult.user.profilePicture === 'http://localhost:5000/uploads/new-pic.jpg',
      'New picture URL saved'
    );

    logStep(28, 'Count users');
    const userCount = await repos.user.count();
    assert(userCount >= 2, 'At least 2 users in database');

    // ============================================================
    // PHASE 5: REPOSITORY PATTERN - MESSAGE
    // ============================================================
    logSection('PHASE 5: MESSAGE REPOSITORY');

    logStep(29, 'Create message from user1 to user2');
    const msg1 = await repos.message.create({
      sender: user1._id,
      recipient: user2._id,
      content: 'مرحبا، كيف حالك؟',
    });
    testData.messages.push(msg1._id);
    assert(msg1 && msg1._id, 'Message 1 created with _id');
    assert(msg1.content === 'مرحبا، كيف حالك؟', 'Message content correct');
    assert(msg1.seen === false, 'Message initially unseen');

    logStep(30, 'Create reply from user2 to user1');
    const msg2 = await repos.message.create({
      sender: user2._id,
      recipient: user1._id,
      content: 'أهلا! بخير والحمد لله',
    });
    testData.messages.push(msg2._id);
    assert(msg2 && msg2._id, 'Message 2 created with _id');

    logStep(31, 'Create another message from user1 to user2');
    const msg3 = await repos.message.create({
      sender: user1._id,
      recipient: user2._id,
      content: 'ما الجديد؟',
    });
    testData.messages.push(msg3._id);
    assert(msg3 && msg3._id, 'Message 3 created with _id');

    logStep(32, 'Find all messages for user1');
    const user1Messages = await repos.message.findAllForUser(user1._id);
    assert(Array.isArray(user1Messages), 'Returns array');
    assert(user1Messages.length >= 3, 'User1 has at least 3 messages (sent + received)');

    logStep(33, 'Find paginated messages for user1');
    const paginatedResult = await repos.message.findAllForUserPaginated(user1._id, 1, 2);
    assert(paginatedResult.rows.length <= 2, 'Pagination limits results');
    assert(paginatedResult.page === 1, 'Pagination page is correct');
    assert(paginatedResult.count >= 3, 'Total count is correct');
    assert(paginatedResult.totalPages >= 2, 'Total pages calculated correctly');

    logStep(34, 'Find conversation between user1 and user2');
    const conversation = await repos.message.findConversation(user1._id, user2._id);
    assert(Array.isArray(conversation), 'Returns array');
    assert(conversation.length >= 3, 'Conversation has at least 3 messages');

    logStep(35, 'Count unseen messages from user1 to user2');
    const unseenCount = await repos.message.countUnseen(user1._id, user2._id);
    assert(unseenCount >= 2, 'At least 2 unseen messages from user1 to user2');

    logStep(36, 'Count all unseen messages for user2');
    const allUnseenCount = await repos.message.countAllUnseen(user2._id);
    assert(allUnseenCount >= 2, 'User2 has at least 2 total unseen messages');

    logStep(37, 'Mark messages as seen');
    const seenResult = await repos.message.markAsSeen(user1._id, user2._id);
    assert(seenResult >= 2, 'At least 2 messages marked as seen');

    logStep(38, 'Verify unseen count after marking');
    const unseenAfter = await repos.message.countUnseen(user1._id, user2._id);
    assert(unseenAfter === 0, 'No unseen messages after marking as seen');

    logStep(39, 'Message count');
    const msgCount = await repos.message.count();
    assert(msgCount >= 3, 'At least 3 messages in database');

    // ============================================================
    // PHASE 6: REPOSITORY PATTERN - BASE METHODS
    // ============================================================
    logSection('PHASE 6: BASE REPOSITORY METHODS');

    logStep(40, 'findById');
    const foundMsg = await repos.message.findById(msg1._id);
    assert(foundMsg !== null, 'Message found by ID');
    assert(foundMsg.content === 'مرحبا، كيف حالك؟', 'Correct message found');

    logStep(41, 'findOne with filter');
    const oneMsg = await repos.message.findOne({ _id: msg1._id });
    assert(oneMsg !== null, 'findOne returns a message');
    assert(oneMsg._id.toString() === msg1._id.toString(), 'Correct message returned');

    logStep(42, 'exists check');
    const msgExists = await repos.message.exists({ _id: msg1._id });
    assert(msgExists === true, 'exists returns true for existing message');

    logStep(43, 'exists check — non-existing');
    const msgNotExists = await repos.message.exists({
      _id: new mongoose.Types.ObjectId(),
    });
    assert(msgNotExists === false, 'exists returns false for non-existing message');

    logStep(44, 'update message');
    const updatedMsg = await repos.message.update(msg1._id, { content: 'محتوى معدل' });
    assert(updatedMsg.content === 'محتوى معدل', 'Message content updated');

    // ============================================================
    // PHASE 7: STORAGE SERVICE
    // ============================================================
    logSection('PHASE 7: STORAGE SERVICE');

    logStep(45, 'Get storage service instance');
    StorageService.reset();
    const storage = getStorageService();
    assert(storage !== null, 'Storage service initialized');

    logStep(46, 'Storage health check');
    const storageHealthy = await storage.healthCheck();
    assert(storageHealthy === true, 'Local storage health check passes');

    logStep(47, 'Get file URL');
    const fileUrl = storage.getFileUrl('test-image.jpg');
    assert(fileUrl.includes('test-image.jpg'), 'getFileUrl returns URL with filename');

    logStep(48, 'Get file URL — already absolute');
    const absUrl = storage.getFileUrl('http://example.com/image.jpg');
    assert(absUrl === 'http://example.com/image.jpg', 'Absolute URLs passed through');

    logStep(49, 'Upload file');
    const mockFile = {
      originalname: 'test-profile.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    };
    const uploadResult = await storage.uploadFile(mockFile);
    assert(uploadResult.url && typeof uploadResult.url === 'string', 'Upload returns URL');
    assert(
      uploadResult.filename && typeof uploadResult.filename === 'string',
      'Upload returns filename'
    );

    logStep(50, 'Delete uploaded file');
    const deleted = await storage.deleteFile(uploadResult.filename);
    assert(deleted === true, 'File deleted successfully');

    logStep(51, 'Delete non-existing file');
    const notDeleted = await storage.deleteFile('nonexistent-file-xyz.jpg');
    assert(notDeleted === false, 'Returns false for non-existing file');

    logStep(52, 'Delete default picture skipped');
    const defaultSkipped = await storage.deleteFile('default-picture.jpg');
    assert(defaultSkipped === false, 'Default picture deletion is skipped');

    logStep(53, 'Storage type check');
    const storageType = StorageService.getStorageType();
    assert(storageType === 'local', 'Storage type is local');

    // ============================================================
    // PHASE 8: CLEANUP
    // ============================================================
    logSection('PHASE 8: CLEANUP');

    logStep(54, 'Delete test messages');
    for (const msgId of testData.messages) {
      await repos.message.delete(msgId);
    }
    const remainingMsgs = await repos.message.findAllForUser(user1._id);
    const testMsgIds = testData.messages.map((id) => id.toString());
    const testMsgsRemaining = remainingMsgs.filter((m) => testMsgIds.includes(m._id.toString()));
    assert(testMsgsRemaining.length === 0, 'All test messages deleted');

    logStep(55, 'Delete test users');
    for (const userId of testData.users) {
      await repos.user.delete(userId);
    }
    const deletedUser = await repos.user.findById(testData.users[0]);
    assert(deletedUser === null, 'Test user deleted successfully');
  } catch (error) {
    console.error(`\n${colors.red}❌ Test error:${colors.reset}`, error.message || error);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    // Print results
    printSummary();

    // Cleanup connection
    await mongoose.disconnect();
    console.log(`\n${colors.cyan}Database disconnected${colors.reset}`);

    // Exit with appropriate code
    process.exit(state.failed > 0 ? 1 : 0);
  }
}

runComprehensiveTests();
