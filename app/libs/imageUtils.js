import { API_URL } from '@env';

/**
 * Normalizes a profile picture URL so React Native can load it on any device.
 *
 * Handles all storage providers transparently:
 *  - null / undefined / empty   → default local picture
 *  - relative path (/uploads/…) → prepend API_URL  (local storage, SERVER_URL not set)
 *  - absolute localhost URL      → rewrite host to API_URL  (dev builds on physical devices)
 *  - absolute https:// URL       → use as-is  (Cloudinary, S3, or local with SERVER_URL set)
 *
 * When the server is switched to a cloud provider (Cloudinary / S3), uploaded images will
 * have absolute https:// URLs in the database. This function handles those automatically
 * without any changes in the app.
 *
 * @param {string | null | undefined} url - Raw profilePicture value from the API
 * @returns {string} A fully-qualified URL safe to pass to <Image source={{ uri }} />
 */
export function normalizeImageUrl(url) {
  const defaultPicture = `${API_URL}/uploads/default-picture.jpg`;

  if (!url) return defaultPicture;

  // Relative path — local storage strategy without SERVER_URL (e.g. /uploads/file.jpg)
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `${API_URL}${url}`;
  }

  // Absolute URL — rewrite localhost/127.0.0.1 to the real API host for physical devices
  try {
    const parsed = new URL(url);
    const api = new URL(API_URL);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return `${api.origin}${parsed.pathname}`;
    }
    return url; // Cloud URL (Cloudinary, S3, custom CDN) — use as-is
  } catch {
    return defaultPicture;
  }
}
