import axios from "axios";
import { API_URL } from "@env";
import { useStore } from "./globalState";

axios.defaults.baseURL = API_URL;

// Add axios interceptor to handle 401 errors
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Auto logout on unauthorized access
      const { logout } = useStore.getState();
      await logout();
    }
    return Promise.reject(error);
  }
);

export const register = async ({
    firstName,
    lastName,
    email,
    password,
    confirmPassword,
}) => {
    try {
        const response = await axios.post("/api/user/register", {
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

export const login = async ({ email, password }) => {
    const response = await axios.post("/api/user/login", {
        email,
        password,
    });

    return response.data;
};

export const getProfile = async (accessToken) => {
    const response = await axios.get("/api/user/profile", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    return response.data;
};

export const getUsers = async (accessToken) => {
    const response = await axios.get("/api/user/friends", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    return response.data;
};

export const updateUser = async (accessToken, body) => {
    const response = await axios.put("/api/user/profile", body, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    return response.data;
};

export const updateProfilePicture = async (accessToken, imageUri) => {
    // Use axios + FormData for React Native multipart upload
    const form = new FormData();
    // Derive a filename and mime based on uri (basic heuristic)
    const fileName = imageUri.split("/").pop() || `photo.jpg`;
    const ext = (fileName.split(".").pop() || "jpg").toLowerCase();
    const mime = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "application/octet-stream";

    form.append("file", {
        uri: imageUri,
        name: fileName,
        type: mime,
    });

    const response = await axios.put("/api/user/profile/picture", form, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            // Let axios set proper multipart boundary automatically; no explicit Content-Type
        },
    });

    return response.data;
};

export const createMessage = async (accessToken, { receiverId, content }) => {
    const response = await axios.post(
        "/api/message",
        {
            receiverId,
            content,
        },
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    return response.data;
};

export const getMessages = async (accessToken) => {
    const response = await axios.get("/api/message/", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    return response.data;
};

