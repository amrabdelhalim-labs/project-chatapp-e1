import { API_URL } from '@env';

/**
 * Mobile Avatar Fallback System
 * Provides enhanced image utilities for React Native with SVG fallback
 */

// SVG fallback avatar embedded (data URI)
export const DEFAULT_AVATAR_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="#1f2937"/>' +
    '<stop offset="100%" stop-color="#374151"/>' +
    '</linearGradient></defs>' +
    '<rect width="128" height="128" rx="64" fill="url(#g)"/>' +
    '<circle cx="64" cy="50" r="22" fill="#9ca3af"/>' +
    '<path d="M20 118c8-26 28-36 44-36s36 10 44 36" fill="#6b7280"/>' +
    '</svg>'
)}`;

/**
 * Get normalized avatar URL for use in Image component
 * Supports multiple storage backends: Local, Cloudinary, AWS S3
 *
 * @param {string|null|undefined} profilePicture - Raw profilePicture from API
 * @returns {string} Safe URL for Image source
 */
export function getAvatarUrl(profilePicture) {
  // Error detection
  if (!profilePicture || profilePicture === 'undefined' || typeof profilePicture !== 'string') {
    return getDefaultAvatarUrl();
  }

  // Path includes /undefined (backend error)
  if (profilePicture.includes('/undefined')) {
    return getDefaultAvatarUrl();
  }

  try {
    // Already absolute URL
    if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
      const parsed = new URL(profilePicture);
      const api = new URL(API_URL);

      // Rewrite localhost for physical devices
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return `${api.origin}${parsed.pathname}`;
      }

      return profilePicture; // Cloud URL
    }

    // Relative path - prepend API_URL
    return `${API_URL}${profilePicture}`;
  } catch {
    return getDefaultAvatarUrl();
  }
}

/**
 * Get default avatar with fallback chain
 * 1. Try server default picture
 * 2. Fallback to embedded SVG
 */
function getDefaultAvatarUrl() {
  try {
    return `${API_URL}/uploads/default-picture.jpg`;
  } catch {
    return DEFAULT_AVATAR_SVG;
  }
}

/**
 * Error handler for Image load failures
 * Use with Image onError handler to fallback to SVG
 *
 * @returns {string} SVG fallback URL for Image source
 */
export function getAvatarFallback() {
  return DEFAULT_AVATAR_SVG;
}

/**
 * Safely create image source object for React Native Image
 * Handles URI and Headers for Cloudinary/S3 URLs
 *
 * @param {string|null|undefined} profilePicture - Raw profilePicture from API
 * @returns {object} Source object for <Image source={{...}} />
 */
export function createAvatarSource(profilePicture) {
  const uri = getAvatarUrl(profilePicture);
  return { uri };
}

/**
 * Check if URL is from an external service (Cloudinary, S3)
 * Useful for determining if fallback caching is needed
 *
 * @param {string} url - URL to check
 * @returns {boolean} True if URL is external
 */
export function isExternalAvatarUrl(url) {
  if (!url || url.startsWith('data:')) return false;
  try {
    const urlObj = new URL(url);
    const apiObj = new URL(API_URL);
    return urlObj.hostname !== apiObj.hostname;
  } catch {
    return false;
  }
}
