class CloudinaryStorageStrategy {
  constructor(config = {}) {
    this.cloudinary = null;
    this.cloudName = config.cloudName || process.env.CLOUDINARY_CLOUD_NAME;
    this.apiKey = config.apiKey || process.env.CLOUDINARY_API_KEY;
    this.apiSecret = config.apiSecret || process.env.CLOUDINARY_API_SECRET;
    this.folder = config.folder || 'mychat-profiles';

    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      throw new Error(
        'Cloudinary credentials are required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET'
      );
    }
    this._initializeCloudinary();
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
      throw new Error(
        'Failed to load cloudinary package. Install it with: npm install cloudinary'
      );
    }
  }

  async uploadFile(file) {
    if (!this.cloudinary) await this._initializeCloudinary();
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
          if (error)
            return reject(new Error(`Cloudinary upload failed: ${error.message}`));
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
    if (!this.cloudinary) await this._initializeCloudinary();
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

  getFileUrl(publicId) {
    if (publicId.startsWith('http://') || publicId.startsWith('https://')) return publicId;
    return this.cloudinary.url(publicId, {
      secure: true,
      transformation: [{ quality: 'auto:good' }],
    });
  }

  async healthCheck() {
    if (!this.cloudinary) {
      try {
        await this._initializeCloudinary();
      } catch {
        return false;
      }
    }
    try {
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
