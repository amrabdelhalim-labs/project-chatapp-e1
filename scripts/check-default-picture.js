/**
 * Script to check and upload default profile picture to cloud storage
 *
 * Usage: node scripts/check-default-picture.js
 *
 * Uses storage strategies from services/storage/ directly to:
 * - Verify storage health
 * - Check if default picture exists
 * - Upload if missing
 *
 * Supports all storage types: local, cloudinary, s3
 */

import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { getStorageService } from '../services/storage/storage.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PICTURE_PATH = path.join(__dirname, '../public/uploads/default-picture.jpg');
const DEFAULT_PICTURE_PUBLIC_ID = 'mychat-profiles/default-picture';

// ───────────────────────────────────────────────────────────────────────────

async function checkLocal(storage) {
  console.log('🗄️  Storage Type: LOCAL');
  console.log(`📁 Checking: ${DEFAULT_PICTURE_PATH}\n`);

  if (!fs.existsSync(DEFAULT_PICTURE_PATH)) {
    console.error(`❌ Local file not found: ${DEFAULT_PICTURE_PATH}\n`);
    process.exit(1);
  }

  // Verify health
  const healthy = await storage.healthCheck();
  if (!healthy) {
    console.error('❌ Local storage health check failed\n');
    process.exit(1);
  }

  const localUrl = '/uploads/default-picture.jpg';
  console.log('✅ Default picture exists locally\n');
  return {
    url: localUrl,
    message: `Local storage uses: ${localUrl} (served by express.static)`,
  };
}

// ───────────────────────────────────────────────────────────────────────────

async function checkCloudinary(storage) {
  console.log('☁️  Storage Type: CLOUDINARY');

  // Verify health first
  const healthy = await storage.healthCheck();
  if (!healthy) {
    console.error('❌ Cloudinary health check failed');
    console.log('   Check credentials in .env (CLOUDINARY_URL or individual vars)\n');
    process.exit(1);
  }

  console.log('✅ Cloudinary connection successful\n');

  // Access the underlying cloudinary instance
  await storage._ensureInitialized();
  const cloudinary = storage.cloudinary;
  const folder = storage.folder;
  const publicId = `${folder}/default-picture`;

  console.log(`🔎 Searching for: ${publicId}...`);
  let existingUrl = null;

  try {
    const result = await cloudinary.api.resource(publicId);
    existingUrl = result.secure_url;
    console.log('✅ Default picture already exists on Cloudinary!\n');
    console.log(`📷 URL: ${existingUrl}\n`);
    return { url: existingUrl, message: 'Already exists on Cloudinary' };
  } catch (error) {
    if (error.error && error.error.http_code === 404) {
      console.log('⚠️  Default picture not found on Cloudinary\n');
    } else {
      console.error('❌ Error checking Cloudinary:', error.message);
      process.exit(1);
    }
  }

  // Upload if not exists
  console.log('📤 Uploading default-picture.jpg to Cloudinary...');

  if (!fs.existsSync(DEFAULT_PICTURE_PATH)) {
    console.error(`❌ Local file not found: ${DEFAULT_PICTURE_PATH}\n`);
    process.exit(1);
  }

  try {
    const uploadResult = await cloudinary.uploader.upload(DEFAULT_PICTURE_PATH, {
      public_id: publicId,
      overwrite: false,
      resource_type: 'image',
      transformation: [
        { width: 512, height: 512, crop: 'fill', gravity: 'face' },
        { quality: 'auto:good' },
      ],
    });

    existingUrl = uploadResult.secure_url;
    console.log('✅ Upload successful!\n');
    console.log(`📷 URL: ${existingUrl}\n`);
    return { url: existingUrl, message: 'Uploaded successfully' };
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    process.exit(1);
  }
}

// ───────────────────────────────────────────────────────────────────────────

async function checkS3(storage) {
  console.log('🪣 Storage Type: AWS S3');

  // Verify health first
  const healthy = await storage.healthCheck();
  if (!healthy) {
    console.error('❌ S3 health check failed');
    console.log('   Check credentials in .env (AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, etc.)\n');
    process.exit(1);
  }

  console.log('✅ AWS S3 connection successful\n');

  // Access the underlying S3 client
  if (!storage.s3Client) {
    await storage._initializeS3();
  }

  const bucket = storage.bucket;
  const region = storage.region;
  const folder = storage.folder;
  const key = `${folder}/default-picture.jpg`;

  console.log(`🔎 Checking if exists: ${key}...`);

  try {
    const { HeadObjectCommand, PutObjectCommand } = await import('@aws-sdk/client-s3');

    // Check if file exists
    try {
      await storage.s3Client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );

      const existingUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
      console.log('✅ Default picture already exists on S3!\n');
      console.log(`📷 URL: ${existingUrl}\n`);
      return { url: existingUrl, message: 'Already exists on S3' };
    } catch (error) {
      if (error.name === 'NotFound') {
        console.log('⚠️  Default picture not found on S3\n');
      } else {
        throw error;
      }
    }

    // Upload if not exists
    console.log('📤 Uploading default-picture.jpg to S3...');

    if (!fs.existsSync(DEFAULT_PICTURE_PATH)) {
      console.error(`❌ Local file not found: ${DEFAULT_PICTURE_PATH}\n`);
      process.exit(1);
    }

    const fileBuffer = fs.readFileSync(DEFAULT_PICTURE_PATH);
    await storage.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: 'image/jpeg',
      })
    );

    const uploadedUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    console.log('✅ Upload successful!\n');
    console.log(`📷 URL: ${uploadedUrl}\n`);

    return { url: uploadedUrl, message: 'Uploaded successfully' };
  } catch (error) {
    console.error('❌ Failed to check or upload to S3:', error.message);
    process.exit(1);
  }
}

// ───────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔍 Checking default profile picture setup...\n');

  const storageType = (process.env.STORAGE_TYPE || 'local').toLowerCase();

  // Get storage service instance (uses singleton pattern)
  let storage;
  try {
    storage = getStorageService();
  } catch (error) {
    console.error('❌ Failed to initialize storage service');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }

  let result;

  switch (storageType) {
    case 'local':
      result = await checkLocal(storage);
      break;
    case 'cloudinary':
      result = await checkCloudinary(storage);
      break;
    case 's3':
      result = await checkS3(storage);
      break;
    default:
      console.error(`❌ Unknown STORAGE_TYPE: ${storageType}`);
      console.log('   Supported: local, cloudinary, s3\n');
      process.exit(1);
  }

  // Print final status
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Setup Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (storageType === 'local') {
    console.log('📝 Local storage does not require DEFAULT_PROFILE_PICTURE_URL');
    console.log('   (uses express.static to serve /uploads/default-picture.jpg)\n');
  } else {
    console.log('📝 Add to your .env file:\n');
    console.log(`DEFAULT_PROFILE_PICTURE_URL=${result.url}\n`);
    console.log(`📝 For Heroku, set Config Var:\n`);
    console.log(`heroku config:set DEFAULT_PROFILE_PICTURE_URL="${result.url}"\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
