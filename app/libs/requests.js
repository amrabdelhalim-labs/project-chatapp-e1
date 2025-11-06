import axios from "axios";
import * as FileSystem from "expo-file-system";
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
    const response = await axios.post("/api/user/register", {
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
    });

    return response.data;
};

export const login = async (email, password) => {
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
    const response = await axios.put("/api/user", body, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    return response.data;
};

export const uploadImage = async (accessToken, imageUri) => {
    const response = await FileSystem.uploadAsync(
        `${API_URL}/api/user/profile-picture`,
        imageUri,
        {
            httpMethod: "PUT",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: "profilePicture",
            mimeType: "image/jpeg",
        }
    );
    return response;
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