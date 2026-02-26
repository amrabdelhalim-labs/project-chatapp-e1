import axios from 'axios';
import { API_URL } from '@env';
import { useStore } from './globalState';

// ─── Create Axios Instance with Interceptors ───────────────────────────────
const api = axios.create({
  baseURL: API_URL,
});

// Request Interceptor: automatically attach the access token to every request
api.interceptors.request.use((config) => {
  const { accessToken } = useStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response Interceptor: handle 401 Unauthorized errors (session expiry)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { logout } = useStore.getState();
      await logout();
    }
    return Promise.reject(error);
  }
);

// ─── Auth functions (no token required) ───────────────────────────────────────

export const register = async ({ firstName, lastName, email, password, confirmPassword }) => {
  try {
    const response = await api.post('/api/user/register', {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
    });

    return response.data;
  } catch (error) {
    // Normalize backend validation errors (400) to a simple shape the UI already checks: { error }
    const message = error?.response?.data?.message || error?.message || 'Registration failed';
    return { error: message };
  }
};

export const login = async ({ email, password }) => {
  try {
    const response = await api.post('/api/user/login', {
      email,
      password,
    });

    return response.data;
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || 'Login failed';
    return { error: message };
  }
};

// ─── Protected functions (token is auto-attached by the request interceptor) ─────

export const getProfile = async () => {
  const response = await api.get('/api/user/profile');
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get('/api/user/friends');
  return response.data;
};

export const updateUser = async (body) => {
  const response = await api.put('/api/user/profile', body);
  return response.data;
};

export const updateProfilePicture = async (imageUri) => {
  // Use axios + FormData for React Native multipart upload
  const form = new FormData();
  // Derive a filename and mime based on uri (basic heuristic)
  const fileName = imageUri.split('/').pop() || `photo.jpg`;
  const ext = (fileName.split('.').pop() || 'jpg').toLowerCase();
  const mime =
    ext === 'png'
      ? 'image/png'
      : ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : 'application/octet-stream';

  form.append('file', {
    uri: imageUri,
    name: fileName,
    type: mime,
  });

  const response = await api.put('/api/user/profile/picture', form);
  return response.data;
};

export const createMessage = async ({ receiverId, content }) => {
  const response = await api.post('/api/message', {
    receiverId,
    content,
  });

  return response.data;
};

export const getMessages = async () => {
  const response = await api.get('/api/message/');
  return response.data;
};

export const deleteAccount = async ({ password }) => {
  const response = await api.delete('/api/user/account', {
    data: { password },
  });
  return response.data;
};
