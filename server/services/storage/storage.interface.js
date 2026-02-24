/**
 * Storage Service Interface
 *
 * Defines the contract for all storage strategies.
 * Any storage implementation (local, S3, Cloudinary, etc.) must implement these methods.
 */

/**
 * @typedef {Object} UploadResult
 * @property {string} url - Public URL to access the uploaded file
 * @property {string} filename - The filename (or key/identifier) in storage
 * @property {string} [publicId] - Optional public ID (used by Cloudinary)
 */

/**
 * @typedef {Object} StorageStrategy
 * @property {function(Express.Multer.File): Promise<UploadResult>} uploadFile
 * @property {function(Express.Multer.File[]): Promise<UploadResult[]>} uploadFiles
 * @property {function(string): Promise<boolean>} deleteFile
 * @property {function(string[]): Promise<{success: string[], failed: string[]}>} deleteFiles
 * @property {function(string): string} getFileUrl
 * @property {function(): Promise<boolean>} healthCheck
 */

export default {};
