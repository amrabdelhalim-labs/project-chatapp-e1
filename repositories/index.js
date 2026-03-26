import { getUserRepository } from './user.repository.js';
import { getMessageRepository } from './message.repository.js';
import mongoose from 'mongoose';

/**
 * RepositoryManager — centralized access to all repositories.
 * Provides a single entry point for data access across the application.
 */
class RepositoryManager {
  constructor() {
    this._user = getUserRepository();
    this._message = getMessageRepository();
  }

  /** @returns {import('./user.repository.js').UserRepository} */
  get user() {
    return this._user;
  }

  /** @returns {import('./message.repository.js').MessageRepository} */
  get message() {
    return this._message;
  }

  /**
   * Verify all systems are operational.
   * @returns {Promise<{ database: string, repositories: { user: boolean, message: boolean } }>}
   */
  async healthCheck() {
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

    return {
      database: dbStatus,
      repositories: {
        user: !!this._user,
        message: !!this._message,
      },
    };
  }
}

// Singleton
let manager = null;

/**
 * @returns {RepositoryManager}
 */
export function getRepositoryManager() {
  if (!manager) manager = new RepositoryManager();
  return manager;
}

export { RepositoryManager };
