import axios from "axios";

// ─── إنشاء Axios Instance مع Interceptors ───────────────────────
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// Request Interceptor: إضافة التوكن تلقائياً لكل طلب
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token && token !== "null" && token !== "undefined") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: التعامل مع أخطاء 401 (انتهاء الجلسة)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("currentReceiver");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ─── دوال المصادقة (لا تحتاج توكن) ─────────────────────────────

export const register = async ({
  firstName,
  lastName,
  email,
  password,
  confirmPassword,
}) => {
  try {
    const response = await api.post("/api/user/register", {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
    });

    return response.data;
  } catch (error) {
    // Normalize backend validation errors (400) to a simple shape the UI already checks: { error }
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Registration failed";
    return { error: message };
  }
};

export const login = async ({email, password}) => {
  try {
    const response = await api.post("/api/user/login", {
      email,
      password,
    });

    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Login failed";
    return { error: message };
  }
};

// ─── دوال تحتاج مصادقة (التوكن يُضاف تلقائياً عبر Interceptor) ─

export const getProfile = async () => {
  const response = await api.get("/api/user/profile");
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get("/api/user/friends");
  return response.data;
};

export const updateUser = async (body) => {
  const response = await api.put("/api/user/profile", body);
  return response.data;
};

export const updateProfilePicture = async (formData) => {
  const response = await api.put("/api/user/profile/picture", formData);
  return response.data;
};

export const createMessage = async ({ receiverId, content }) => {
  const response = await api.post("/api/message", {
    receiverId,
    content,
  });
  return response.data;
};

export const getMessages = async () => {
  const response = await api.get("/api/message/");
  return response.data;
};