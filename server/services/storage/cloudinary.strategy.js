class CloudinaryStorageStrategy {
  constructor(config = {}) {
    this.cloudinary = null;
    this.folder = config.folder || process.env.CLOUDINARY_FOLDER || 'mychat-profiles';

    // Support CLOUDINARY_URL (Heroku addon format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME)
    // Takes precedence over individual vars — individual vars act as fallback
    const cloudinaryUrl = process.env.CLOUDINARY_URL;
    if (cloudinaryUrl) {
      try {
        const url = new URL(cloudinaryUrl);
        this.cloudName = config.cloudName || url.hostname;
        this.apiKey = config.apiKey || url.username;
        this.apiSecret = config.apiSecret || decodeURIComponent(url.password);
      } catch {
        throw new Error('CLOUDINARY_URL is malformed. Expected: cloudinary://API_KEY:API_SECRET@CLOUD_NAME');
      }
    } else {
      // Fallback: individual environment variables
      this.cloudName = config.cloudName || process.env.CLOUDINARY_CLOUD_NAME;
      this.apiKey = config.apiKey || process.env.CLOUDINARY_API_KEY;
      this.apiSecret = config.apiSecret || process.env.CLOUDINARY_API_SECRET;
    }

    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      throw new Error(
        'Cloudinary credentials missing. Set CLOUDINARY_URL (Heroku) or ' +
        'CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET'
      );
    }
    // Start async SDK initialization eagerly. Caching the promise prevents:
    //  • Duplicate imports when concurrent requests arrive before init completes
    //  • Unhandled-rejection crashes (the reject path is re-thrown when methods
    //    await _initPromise, not here in the constructor)
    this._initPromise = this._initializeCloudinary();
    this._initPromise.catch(() => {}); // prevent unhandledRejection at construction time
  }

  async _initializeCloudinary() {
    try {
      const cloudinary = await import('cloudinary');
      this.cloudinary = cloudinary.v2;
      this.cloudinary.config({
        cloud_name: this.cloudName,
        api_key: this.apiKey,
        api_secret: this.apiSecret,
      });
      console.log('✅ Cloudinary storage initialized');
    } catch (error) {
      throw new Error('Failed to load cloudinary package. Install it with: npm install cloudinary');
    }
  }

  /** Await the cached init promise — all callers share the same promise. */
  async _ensureInitialized() {
    await this._initPromise;
  }

  async uploadFile(file) {
    await this._ensureInitialized();
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder: this.folder,
          resource_type: 'image',
          transformation: [
            { width: 512, height: 512, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good' },
          ],
        },
        (error, result) => {
          if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
          resolve({
            url: result.secure_url,
            filename: result.public_id,
            publicId: result.public_id,
          });
        }
      );
      uploadStream.end(file.buffer);
    });
  }

  async uploadFiles(files) {
    return Promise.all(files.map((file) => this.uploadFile(file)));
  }

  async deleteFile(publicIdOrUrl) {
    await this._ensureInitialized();
    try {
      const publicId = this._extractPublicId(publicIdOrUrl);
      if (!publicId) return false;
      const result = await this.cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error(`Failed to delete from Cloudinary: ${publicIdOrUrl}`, error.message);
      return false;
    }
  }

  async deleteFiles(publicIds) {
    const results = { success: [], failed: [] };
    for (const id of publicIds) {
      const deleted = await this.deleteFile(id);
      (deleted ? results.success : results.failed).push(id);
    }
    return results;
  }

  /**
   * Get the public URL for a Cloudinary asset.
   * Safely returns publicId as-is if Cloudinary is not yet initialized
   * (e.g. called in the same tick as server startup before the async init resolves).
   * @param {string} publicId - Cloudinary public_id or existing absolute URL
   * @returns {string}
   */
  getFileUrl(publicId) {
    if (!publicId) return publicId;
    if (publicId.startsWith('http://') || publicId.startsWith('https://')) return publicId;
    if (!this.cloudinary) {
      // Async init not yet resolved — return as-is (safe fallback).
      console.warn(
        '[Cloudinary] getFileUrl called before initialization — returning publicId as-is'
      );
      return publicId;
    }
    return this.cloudinary.url(publicId, {
      secure: true,
      transformation: [{ quality: 'auto:good' }],
    });
  }

  async healthCheck() {
    try {
      await this._ensureInitialized();
      await this.cloudinary.api.ping();
      return true;
    } catch {
      return false;
    }
  }

  _extractPublicId(urlOrId) {
    if (!urlOrId) return null;
    try {
      if (urlOrId.includes('cloudinary.com')) {
        const parts = urlOrId.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex !== -1) {
          return parts
            .slice(uploadIndex + 2)
            .join('/')
            .replace(/\.[^/.]+$/, '');
        }
      }
      return urlOrId;
    } catch {
      return null;
    }
  }
}

export default CloudinaryStorageStrategy;
