import BaseRepository from './base.repository.js';
import Message from '../models/Message.js';

/**
 * Message Repository — data access for the Message model.
 * Encapsulates all message-related database operations.
 */
class MessageRepository extends BaseRepository {
  constructor() {
    super(Message);
  }

  /**
   * Get all messages for a user (sent or received), sorted by creation date.
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async findAllForUser(userId) {
    return this.model
      .find({ $or: [{ sender: userId }, { recipient: userId }] })
      .sort({ createdAt: 1 });
  }

  /**
   * Get paginated messages for a user.
   * @param {string} userId
   * @param {number} [page=1]
   * @param {number} [limit=50]
   * @returns {Promise<import('./repository.interface.js').PaginatedResult>}
   */
  async findAllForUserPaginated(userId, page = 1, limit = 50) {
    const filter = { $or: [{ sender: userId }, { recipient: userId }] };
    return this.findPaginated(page, limit, filter, { sort: { createdAt: 1 } });
  }

  /**
   * Get messages between two specific users, sorted by date.
   * @param {string} userId1
   * @param {string} userId2
   * @returns {Promise<Array>}
   */
  async findConversation(userId1, userId2) {
    return this.model
      .find({
        $or: [
          { sender: userId1, recipient: userId2 },
          { sender: userId2, recipient: userId1 },
        ],
      })
      .sort({ createdAt: 1 });
  }

  /**
   * Mark all unseen messages from a sender to a recipient as seen.
   * @param {string} senderId — the user who sent the messages
   * @param {string} recipientId — the user who is marking them as seen
   * @returns {Promise<number>} — count of modified messages
   */
  async markAsSeen(senderId, recipientId) {
    return this.updateMany(
      { sender: senderId, recipient: recipientId, seen: false },
      { seen: true }
    );
  }

  /**
   * Count unseen messages from a specific sender to a recipient.
   * @param {string} senderId
   * @param {string} recipientId
   * @returns {Promise<number>}
   */
  async countUnseen(senderId, recipientId) {
    return this.count({
      sender: senderId,
      recipient: recipientId,
      seen: false,
    });
  }

  /**
   * Count all unseen messages for a user (from all senders).
   * @param {string} recipientId
   * @returns {Promise<number>}
   */
  async countAllUnseen(recipientId) {
    return this.count({ recipient: recipientId, seen: false });
  }

  /**
   * Delete all messages in a conversation between two users.
   * @param {string} userId1
   * @param {string} userId2
   * @returns {Promise<number>}
   */
  async deleteConversation(userId1, userId2) {
    return this.deleteMany({
      $or: [
        { sender: userId1, recipient: userId2 },
        { sender: userId2, recipient: userId1 },
      ],
    });
  }

  /**
   * Delete all messages associated with a user (sent or received).
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async deleteByUser(userId) {
    return this.deleteMany({
      $or: [{ sender: userId }, { recipient: userId }],
    });
  }
}

// Singleton pattern
let instance = null;

/**
 * @returns {MessageRepository}
 */
export function getMessageRepository() {
  if (!instance) instance = new MessageRepository();
  return instance;
}

export { MessageRepository };
