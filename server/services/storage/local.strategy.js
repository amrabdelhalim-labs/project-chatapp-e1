import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LocalStorageStrategy {
  constructor(config = {}) {
    this.uploadsDir = config.uploadsDir || path.resolve(__dirname, '../../public/uploads');
    this.baseUrl = config.baseUrl || '/uploads';
    this._ensureDirectoryExists();
  }

  _ensureDirectoryExists() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
      console.log(`✅ Created uploads directory: ${this.uploadsDir}`);
    }
  }

  async uploadFile(file) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    const filename = uniqueSuffix + fileExtension;
    const filePath = path.join(this.uploadsDir, filename);

    // Support both buffer (memoryStorage) and path (diskStorage)
    if (file.buffer) {
      await fs.promises.writeFile(filePath, file.buffer);
    } else if (file.path) {
      await fs.promises.copyFile(file.path, filePath);
    }

    return { url: `${this.baseUrl}/${filename}`, filename };
  }

  async uploadFiles(files) {
    return Promise.all(files.map((file) => this.uploadFile(file)));
  }

  async deleteFile(filename) {
    try {
      const cleanFilename = this._extractFilename(filename);
      if (!cleanFilename || cleanFilename === 'default-picture.jpg') return false;

      const filePath = path.join(this.uploadsDir, cleanFilename);
      if (!fs.existsSync(filePath)) {
        console.warn(`File not found for deletion: ${cleanFilename}`);
        return false;
      }
      await fs.promises.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`Failed to delete file ${filename}:`, error.message);
      }
      return false;
    }
  }

  async deleteFiles(filenames) {
    const results = { success: [], failed: [] };
    for (const filename of filenames) {
      const deleted = await this.deleteFile(filename);
      (deleted ? results.success : results.failed).push(filename);
    }
    return results;
  }

  getFileUrl(filename) {
    if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
    if (filename.startsWith(this.baseUrl)) return filename;
    return `${this.baseUrl}/${filename}`;
  }

  async healthCheck() {
    try {
      await fs.promises.access(this.uploadsDir, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  _extractFilename(imageUrl) {
    if (!imageUrl) return null;
    try {
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return path.basename(new URL(imageUrl).pathname);
      }
      return path.basename(imageUrl);
    } catch {
      return null;
    }
  }
}

export default LocalStorageStrategy;
