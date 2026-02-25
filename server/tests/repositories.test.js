/**
 * Repository Pattern Testing Suite
 * Tests all repository operations and database abstraction layer
 * Focused on individual repository CRUD operations
 *
 * Usage: node tests/repositories.test.js
 */

import 'dotenv/config.js';
import mongoose from 'mongoose';
import { getRepositoryManager } from '../repositories/index.js';
import { colors, state, assert, logSection, printSummary } from './test.helpers.js';

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.yellow}┌─────────────────────────────────────────────────┐${colors.reset}`);
  console.log(`${colors.yellow}│  Repository Pattern Testing Suite - Chat App    │${colors.reset}`);
  console.log(`${colors.yellow}└─────────────────────────────────────────────────┘${colors.reset}`);

  try {
    // Initialize database connection
    console.log(`\n${colors.blue}Initializing database connection...${colors.reset}`);
    await mongoose.connect(process.env.MONGODB_URL);
    console.log(`${colors.green}✓ Database connected successfully${colors.reset}`);

    const repos = getRepositoryManager();
    console.log(`${colors.green}✓ Repository manager initialized${colors.reset}`);

    let testUserId1 = null;
    let testUserId2 = null;
    let testMsgIds = [];

    // ============ User Repository Tests ============
    logSection('User Repository');

    // Create test user 1
    const userData1 = {
      firstName: 'أحمد',
      lastName: 'محمد',
      email: `repo-test-${Date.now()}-1@chatapp.test`,
      password: 'hashed_password_123',
      profilePicture: 'http://localhost:5000/uploads/default-picture.jpg',
    };

    try {
      const user1 = await repos.user.createUser(userData1);
      testUserId1 = user1._id;
      assert(!!testUserId1, 'Create user 1');
      assert(user1.firstName === 'أحمد', 'User 1 firstName matches');
      assert(user1.password === undefined, 'Password excluded from create result');
    } catch (error) {
      console.log(`${colors.red}Error creating user 1: ${error.message}${colors.reset}`);
    }

    // Create test user 2
    const userData2 = {
      firstName: 'فاطمة',
      lastName: 'علي',
      email: `repo-test-${Date.now()}-2@chatapp.test`,
      password: 'hashed_password_456',
      profilePicture: 'http://localhost:5000/uploads/default-picture.jpg',
    };

    try {
      const user2 = await repos.user.createUser(userData2);
      testUserId2 = user2._id;
      assert(!!testUserId2, 'Create user 2');
      assert(user2.firstName === 'فاطمة', 'User 2 firstName matches');
    } catch (error) {
      console.log(`${colors.red}Error creating user 2: ${error.message}${colors.reset}`);
    }

    // Find by email
    if (testUserId1) {
      const found = await repos.user.findByEmail(userData1.email);
      assert(found && found._id.toString() === testUserId1.toString(), 'Find user by email');
    }

    // Email exists check
    if (testUserId1) {
      const exists = await repos.user.emailExists(userData1.email);
      assert(exists === true, 'Email exists — true for existing');

      const notExists = await repos.user.emailExists(`nonexistent${Date.now()}@chatapp.test`);
      assert(notExists === false, 'Email exists — false for non-existing');
    }

    // Find by ID (safe — no password)
    if (testUserId1) {
      const found = await repos.user.findByIdSafe(testUserId1);
      assert(found && found._id.toString() === testUserId1.toString(), 'Find user by ID (safe)');
      assert(found.password === undefined, 'Password excluded from safe find');
    }

    // Find all except current
    if (testUserId1) {
      const others = await repos.user.findAllExcept(testUserId1);
      assert(Array.isArray(others), 'findAllExcept returns array');
      const containsSelf = others.some((u) => u._id.toString() === testUserId1.toString());
      assert(!containsSelf, 'Current user excluded from results');
    }

    // Update user profile
    if (testUserId1) {
      const updated = await repos.user.updateProfile(testUserId1, {
        firstName: 'أحمد محدث',
        status: 'مشغول',
      });
      assert(updated.firstName === 'أحمد محدث', 'Update user firstName');
      assert(updated.status === 'مشغول', 'Update user status');
      assert(updated.password === undefined, 'Password excluded after update');
    }

    // Update profile picture
    if (testUserId1) {
      const result = await repos.user.updateProfilePicture(
        testUserId1,
        'http://localhost:5000/uploads/new-picture.jpg'
      );
      assert(!!result.previousPicture, 'Previous picture URL returned');
      assert(
        result.user.profilePicture === 'http://localhost:5000/uploads/new-picture.jpg',
        'Profile picture updated'
      );
    }

    // Count users
    const userCount = await repos.user.count();
    assert(userCount >= 2, `User count is at least 2 (got ${userCount})`);

    // ============ Message Repository Tests ============
    logSection('Message Repository');

    // Create messages
    if (testUserId1 && testUserId2) {
      const msg1 = await repos.message.create({
        sender: testUserId1,
        recipient: testUserId2,
        content: 'مرحبا يا فاطمة!',
      });
      testMsgIds.push(msg1._id);
      assert(!!msg1._id, 'Create message 1');
      assert(msg1.content === 'مرحبا يا فاطمة!', 'Message content correct');
      assert(msg1.seen === false, 'Message initially unseen');

      const msg2 = await repos.message.create({
        sender: testUserId2,
        recipient: testUserId1,
        content: 'أهلا أحمد، كيف حالك؟',
      });
      testMsgIds.push(msg2._id);
      assert(!!msg2._id, 'Create message 2 (reply)');

      const msg3 = await repos.message.create({
        sender: testUserId1,
        recipient: testUserId2,
        content: 'بخير، والحمد لله',
      });
      testMsgIds.push(msg3._id);
      assert(!!msg3._id, 'Create message 3');
    }

    // Find all messages for user
    if (testUserId1) {
      const messages = await repos.message.findAllForUser(testUserId1);
      assert(Array.isArray(messages), 'findAllForUser returns array');
      assert(messages.length >= 3, `User 1 has at least 3 messages (got ${messages.length})`);
    }

    // Paginated messages
    if (testUserId1) {
      const result = await repos.message.findAllForUserPaginated(testUserId1, 1, 2);
      assert(result.rows.length <= 2, 'Pagination limits results');
      assert(result.page === 1, 'Correct page number');
      assert(result.count >= 3, 'Total count is correct');
      assert(result.totalPages >= 2, 'Total pages calculated');
    }

    // Find conversation
    if (testUserId1 && testUserId2) {
      const conversation = await repos.message.findConversation(testUserId1, testUserId2);
      assert(Array.isArray(conversation), 'findConversation returns array');
      assert(conversation.length >= 3, `Conversation has at least 3 messages`);
    }

    // Count unseen
    if (testUserId1 && testUserId2) {
      const unseenCount = await repos.message.countUnseen(testUserId1, testUserId2);
      assert(unseenCount >= 2, `At least 2 unseen from user 1 to user 2 (got ${unseenCount})`);

      const totalUnseen = await repos.message.countAllUnseen(testUserId2);
      assert(totalUnseen >= 2, `User 2 total unseen >= 2 (got ${totalUnseen})`);
    }

    // Mark as seen
    if (testUserId1 && testUserId2) {
      const modified = await repos.message.markAsSeen(testUserId1, testUserId2);
      assert(modified >= 2, `Marked at least 2 as seen (got ${modified})`);

      const afterSeen = await repos.message.countUnseen(testUserId1, testUserId2);
      assert(afterSeen === 0, 'No unseen after marking');
    }

    // exists & findById
    if (testMsgIds.length > 0) {
      const exists = await repos.message.exists({ _id: testMsgIds[0] });
      assert(exists === true, 'Message exists check — true');

      const notExists = await repos.message.exists({ _id: new mongoose.Types.ObjectId() });
      assert(notExists === false, 'Message exists check — false');

      const found = await repos.message.findById(testMsgIds[0]);
      assert(found !== null, 'findById returns message');
    }

    // ============ Repository Manager Tests ============
    logSection('Repository Manager & Health Check');

    const health = await repos.healthCheck();
    assert(health.database === 'connected', 'Database is connected');
    assert(health.repositories.user === true, 'User repository healthy');
    assert(health.repositories.message === true, 'Message repository healthy');

    // ============ Cascade & Cleanup Tests ============
    logSection('Cascade Operations & Cleanup');

    // Delete messages
    for (const msgId of testMsgIds) {
      await repos.message.delete(msgId);
    }
    if (testMsgIds.length > 0) {
      const deletedMsg = await repos.message.findById(testMsgIds[0]);
      assert(deletedMsg === null, 'Messages deleted successfully');
    }

    // Delete users
    if (testUserId1) {
      await repos.user.delete(testUserId1);
      const deleted1 = await repos.user.findById(testUserId1);
      assert(deleted1 === null, 'User 1 deleted');
    }

    if (testUserId2) {
      await repos.user.delete(testUserId2);
      const deleted2 = await repos.user.findById(testUserId2);
      assert(deleted2 === null, 'User 2 deleted');
    }

    // ============ Test Summary ============
    printSummary();
  } catch (error) {
    console.error(`${colors.red}Fatal error during testing: ${error.message}${colors.reset}`);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log(`\n${colors.cyan}Database disconnected${colors.reset}`);
    process.exit(state.failed > 0 ? 1 : 0);
  }
}

runTests();
