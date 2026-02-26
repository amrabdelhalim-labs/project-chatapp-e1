/**
 * Script to check and upload default profile picture to Cloudinary
 *
 * Usage: node scripts/check-default-picture.js
 *
 * This script:
 * 1. Connects to Cloudinary using CLOUDINARY_URL from .env
 * 2. Checks if default-picture.jpg exists in the cloud
 * 3. If not found, uploads it from public/uploads/default-picture.jpg
 * 4. Prints the secure URL to use in DEFAULT_PROFILE_PICTURE_URL
 */

import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PICTURE_PUBLIC_ID = 'mychat-profiles/default-picture';
const DEFAULT_PICTURE_PATH = path.join(__dirname, '../public/uploads/default-picture.jpg');

async function main() {
  console.log('\n🔍 Checking Cloudinary default profile picture...\n');

  // Parse CLOUDINARY_URL
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  if (!cloudinaryUrl) {
    console.error('❌ CLOUDINARY_URL not found in .env');
    console.log('   Set it like: CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME\n');
    process.exit(1);
  }

  let cloudName, apiKey, apiSecret;
  try {
    const url = new URL(cloudinaryUrl);
    cloudName = url.hostname;
    apiKey = url.username;
    apiSecret = decodeURIComponent(url.password);
  } catch (error) {
    console.error('❌ Invalid CLOUDINARY_URL format');
    console.log('   Expected: cloudinary://API_KEY:API_SECRET@CLOUD_NAME\n');
    process.exit(1);
  }

  console.log(`☁️  Cloud Name: ${cloudName}`);
  console.log(`🔑 API Key: ${apiKey}\n`);

  // Initialize Cloudinary
  let cloudinary;
  try {
    const cloudinaryModule = await import('cloudinary');
    cloudinary = cloudinaryModule.v2;
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    console.log('✅ Cloudinary SDK initialized\n');
  } catch (error) {
    console.error('❌ Failed to load cloudinary package');
    console.log('   Run: npm install cloudinary\n');
    process.exit(1);
  }

  // Test connection
  try {
    await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful\n');
  } catch (error) {
    console.error('❌ Failed to connect to Cloudinary');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }

  // Check if default picture exists
  console.log(`🔎 Searching for: ${DEFAULT_PICTURE_PUBLIC_ID}...`);
  let existingUrl = null;
  try {
    const result = await cloudinary.api.resource(DEFAULT_PICTURE_PUBLIC_ID);
    existingUrl = result.secure_url;
    console.log('✅ Default picture already exists on Cloudinary!\n');
    console.log(`📷 URL: ${existingUrl}\n`);
  } catch (error) {
    if (error.error && error.error.http_code === 404) {
      console.log('⚠️  Default picture not found on Cloudinary\n');
    } else {
      console.error('❌ Error checking Cloudinary:', error.message);
      process.exit(1);
    }
  }

  // Upload if not exists
  if (!existingUrl) {
    console.log('📤 Uploading default-picture.jpg to Cloudinary...');

    if (!fs.existsSync(DEFAULT_PICTURE_PATH)) {
      console.error(`❌ Local file not found: ${DEFAULT_PICTURE_PATH}\n`);
      process.exit(1);
    }

    try {
      const uploadResult = await cloudinary.uploader.upload(DEFAULT_PICTURE_PATH, {
        public_id: DEFAULT_PICTURE_PUBLIC_ID,
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
    } catch (error) {
      console.error('❌ Upload failed:', error.message);
      process.exit(1);
    }
  }

  // Print instructions
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Setup Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📝 Add this to your .env file:\n');
  console.log(`DEFAULT_PROFILE_PICTURE_URL=${existingUrl}\n`);
  console.log('📝 For Heroku, set Config Var:\n');
  console.log(`heroku config:set DEFAULT_PROFILE_PICTURE_URL="${existingUrl}"\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
