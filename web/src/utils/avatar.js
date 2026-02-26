const DEFAULT_AVATAR_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
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

const getApiBaseUrl = () => {
  const envUrl = process.env.REACT_APP_API_URL;
  if (envUrl && envUrl !== 'undefined') {
    return envUrl.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
};

const normalizeProfilePicture = (value) => {
  if (!value || value === 'undefined') return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;

  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return value.startsWith('/') ? value : `/${value}`;

  if (value.startsWith('/')) return `${baseUrl}${value}`;
  return `${baseUrl}/${value}`;
};

const getDefaultAvatarUrl = () => {
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}/uploads/default-picture.jpg` : DEFAULT_AVATAR_SVG;
};

export const getAvatarSrc = (profilePicture) => {
  const normalized = normalizeProfilePicture(profilePicture);
  if (!normalized || normalized.includes('/undefined')) {
    return getDefaultAvatarUrl();
  }
  return normalized;
};

export const handleAvatarError = (event) => {
  if (!event?.currentTarget) return;
  const img = event.currentTarget;
  if (img.dataset.fallbackApplied === 'true') return;
  img.dataset.fallbackApplied = 'true';
  img.src = DEFAULT_AVATAR_SVG;
};

export { DEFAULT_AVATAR_SVG };
