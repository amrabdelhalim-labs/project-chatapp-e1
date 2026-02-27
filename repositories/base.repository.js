/**
 * Base Repository — generic CRUD operations for any Mongoose model.
 * All entity repositories extend this class.
 *
 * @implements {IRepository}
 */
class BaseRepository {
  /**
   * @param {import('mongoose').Model} model
   */
  constructor(model) {
    this.model = model;
  }

  /**
   * Find all documents matching a filter.
   * @param {Object} [filter={}]
   * @param {Object} [options={}] — projection, sort, populate, etc.
   * @returns {Promise<Array>}
   */
  async findAll(filter = {}, options = {}) {
    const { select, sort, populate } = options;
    let query = this.model.find(filter);
    if (select) query = query.select(select);
    if (sort) query = query.sort(sort);
    if (populate) query = query.populate(populate);
    return query.exec();
  }

  /**
   * Find a single document matching a filter.
   * @param {Object} filter
   * @param {Object} [options={}]
   * @returns {Promise<Object|null>}
   */
  async findOne(filter, options = {}) {
    const { select, populate } = options;
    let query = this.model.findOne(filter);
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    return query.exec();
  }

  /**
   * Find a document by its _id.
   * @param {string} id
   * @param {Object} [options={}]
   * @returns {Promise<Object|null>}
   */
  async findById(id, options = {}) {
    const { select, populate } = options;
    let query = this.model.findById(id);
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    return query.exec();
  }

  /**
   * Paginated query with safe bounds.
   * @param {number} [page=1]
   * @param {number} [limit=20]
   * @param {Object} [filter={}]
   * @param {Object} [options={}]
   * @returns {Promise<PaginatedResult>}
   */
  async findPaginated(page = 1, limit = 20, filter = {}, options = {}) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const skip = (safePage - 1) * safeLimit;

    const [rows, count] = await Promise.all([
      this.model.find(filter, null, { ...options, skip, limit: safeLimit }),
      this.model.countDocuments(filter),
    ]);

    return {
      rows,
      count,
      page: safePage,
      totalPages: Math.ceil(count / safeLimit),
    };
  }

  /**
   * Create a new document.
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) {
    return this.model.create(data);
  }

  /**
   * Update a document by _id and return the updated version.
   * @param {string} id
   * @param {Object} data
   * @param {Object} [options={ new: true }]
   * @returns {Promise<Object|null>}
   */
  async update(id, data, options = { new: true }) {
    return this.model.findByIdAndUpdate(id, data, options);
  }

  /**
   * Update many documents matching a filter.
   * @param {Object} filter
   * @param {Object} data
   * @returns {Promise<number>} — number of modified documents
   */
  async updateMany(filter, data) {
    const result = await this.model.updateMany(filter, data).exec();
    return result.modifiedCount;
  }

  /**
   * Delete a document by _id.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async delete(id) {
    return this.model.findByIdAndDelete(id);
  }

  /**
   * Delete many documents matching a filter.
   * @param {Object} filter
   * @returns {Promise<number>}
   */
  async deleteMany(filter) {
    const result = await this.model.deleteMany(filter);
    return result.deletedCount;
  }

  /**
   * Check if a document exists matching a filter.
   * @param {Object} filter
   * @returns {Promise<boolean>}
   */
  async exists(filter) {
    const doc = await this.model.exists(filter);
    return !!doc;
  }

  /**
   * Count documents matching a filter.
   * @param {Object} [filter={}]
   * @returns {Promise<number>}
   */
  async count(filter = {}) {
    return this.model.countDocuments(filter);
  }
}

export default BaseRepository;
