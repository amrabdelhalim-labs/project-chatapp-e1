class S3StorageStrategy {
  constructor(config = {}) {
    this.s3Client = null;
    this.bucket = config.bucket || process.env.AWS_S3_BUCKET;
    this.region = config.region || process.env.AWS_REGION || 'us-east-1';
    this.accessKeyId = config.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
    this.secretAccessKey = config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
    this.folder = config.folder || 'uploads/profiles';

    if (!this.bucket || !this.accessKeyId || !this.secretAccessKey) {
      throw new Error(
        'AWS S3 credentials are required: AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY'
      );
    }
    this._initializeS3();
  }

  async _initializeS3() {
    try {
      const { S3Client } = await import('@aws-sdk/client-s3');
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      });
      console.log('✅ AWS S3 storage initialized');
    } catch (error) {
      throw new Error(
        'Failed to load @aws-sdk/client-s3. Install it with: npm install @aws-sdk/client-s3'
      );
    }
  }

  async uploadFile(file) {
    if (!this.s3Client) await this._initializeS3();
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileExtension = file.originalname.split('.').pop();
    const key = `${this.folder}/${uniqueSuffix}.${fileExtension}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      })
    );

    return {
      url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
      filename: key,
    };
  }

  async uploadFiles(files) {
    return Promise.all(files.map((file) => this.uploadFile(file)));
  }

  async deleteFile(keyOrUrl) {
    if (!this.s3Client) await this._initializeS3();
    try {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const key = this._extractKey(keyOrUrl);
      if (!key) return false;
      await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (error) {
      console.error(`Failed to delete from S3: ${keyOrUrl}`, error.message);
      return false;
    }
  }

  async deleteFiles(keys) {
    const results = { success: [], failed: [] };
    for (const key of keys) {
      const deleted = await this.deleteFile(key);
      (deleted ? results.success : results.failed).push(key);
    }
    return results;
  }

  getFileUrl(key) {
    if (key.startsWith('http://') || key.startsWith('https://')) return key;
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async healthCheck() {
    if (!this.s3Client) {
      try {
        await this._initializeS3();
      } catch {
        return false;
      }
    }
    try {
      const { HeadBucketCommand } = await import('@aws-sdk/client-s3');
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch {
      return false;
    }
  }

  _extractKey(urlOrKey) {
    if (!urlOrKey) return null;
    try {
      if (urlOrKey.includes('s3.') && urlOrKey.includes('.amazonaws.com')) {
        return new URL(urlOrKey).pathname.substring(1);
      }
      return urlOrKey;
    } catch {
      return null;
    }
  }
}

export default S3StorageStrategy;
