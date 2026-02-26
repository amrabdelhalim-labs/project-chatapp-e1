import BaseRepository from './base.repository.js';
import User from '../models/User.js';

/**
 * User Repository — data access for the User model.
 * Encapsulates all user-related database operations.
 */
class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  /**
   * Find a user by email address.
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email) {
    return this.model.findOne({ email });
  }

  /**
   * Check if an email is already registered.
   * @param {string} email
   * @returns {Promise<boolean>}
   */
  async emailExists(email) {
    return this.exists({ email });
  }

  /**
   * Find a user by ID, excluding the password field.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async findByIdSafe(id) {
    return this.model.findById(id).select('-password');
  }

  /**
   * Get all users except the given user (for contact/friend list).
   * Excludes password field.
   * @param {string} excludeUserId
   * @returns {Promise<Array>}
   */
  async findAllExcept(excludeUserId) {
    return this.model.find({ _id: { $ne: excludeUserId } }).select('-password');
  }

  /**
   * Update user profile fields (firstName, lastName, status).
   * Returns the updated user without the password.
   * @param {string} id
   * @param {Object} data — { firstName?, lastName?, status? }
   * @returns {Promise<Object|null>}
   */
  async updateProfile(id, data) {
    const user = await this.model.findByIdAndUpdate(id, data, { new: true });
    if (user) user.password = undefined;
    return user;
  }

  /**
   * Update user profile picture URL.
   * Returns the previous profile picture URL and the updated user.
   * @param {string} id
   * @param {string} pictureUrl
   * @returns {Promise<{ previousPicture: string|null, user: Object }>}
   */
  async updateProfilePicture(id, pictureUrl) {
    const previous = await this.model.findById(id).select('profilePicture');
    const previousPicture = previous?.profilePicture || null;

    const user = await this.model.findByIdAndUpdate(
      id,
      { profilePicture: pictureUrl },
      { new: true }
    );
    if (user) user.password = undefined;

    return { previousPicture, user };
  }

  /**
   * Create a new user and return without the password field.
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createUser(data) {
    const user = await this.model.create(data);
    user.password = undefined;
    return user;
  }

  /**
   * Delete a user and all their messages (for delete account feature).
   * Uses cascade delete pattern: remove all user messages first, then user.
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  async deleteUserWithMessages(userId, messageRepository) {
    // Delete all messages where user is sender or recipient
    if (messageRepository) {
      await messageRepository.deleteByUser(userId);
    }

    // Then delete the user
    return this.delete(userId);
  }
}

// Singleton pattern
let instance = null;

/**
 * @returns {UserRepository}
 */
export function getUserRepository() {
  if (!instance) instance = new UserRepository();
  return instance;
}

export { UserRepository };
