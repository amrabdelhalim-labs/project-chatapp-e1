/**
 * Socket.IO instance holder — breaks the circular dependency
 * between index.js and controllers.
 *
 * Usage:
 *   - In index.js:  setIO(io)  after creating the Server instance
 *   - In controllers: getIO()  to emit events
 */

let io = null;

/**
 * Store the Socket.IO Server instance.
 * @param {import('socket.io').Server} instance
 */
export function setIO(instance) {
  io = instance;
}

/**
 * Retrieve the Socket.IO Server instance.
 * @returns {import('socket.io').Server}
 */
export function getIO() {
  if (!io) {
    throw new Error('Socket.IO has not been initialized — call setIO() first');
  }
  return io;
}
