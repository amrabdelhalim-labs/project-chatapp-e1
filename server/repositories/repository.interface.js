/**
 * @typedef {Object} IRepository
 * @property {function(Object): Promise<Array>} findAll
 * @property {function(Object): Promise<Object|null>} findOne
 * @property {function(string, Object): Promise<Object|null>} findById
 * @property {function(number, number, Object): Promise<PaginatedResult>} findPaginated
 * @property {function(Object): Promise<Object>} create
 * @property {function(string, Object, Object): Promise<Object|null>} update
 * @property {function(string): Promise<Object|null>} delete
 * @property {function(Object): Promise<boolean>} exists
 * @property {function(Object): Promise<number>} count
 */

/**
 * @typedef {Object} PaginatedResult
 * @property {Array} rows
 * @property {number} count
 * @property {number} page
 * @property {number} totalPages
 */

export default {};
