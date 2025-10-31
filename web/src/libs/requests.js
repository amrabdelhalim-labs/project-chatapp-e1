import axios from "axios";

axios.defaults.baseURL = process.env.REACT_APP_API_URL;

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

export const login = async ({email, password}) => {
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

export const updateProfilePicture = async (accessToken, formData) => {
  const response = await axios.put("/api/user/profile/picture", formData, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
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