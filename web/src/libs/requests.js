import axios from "axios";

axios.defaults.baseURL = process.env.API_URL || "http://localhost:5000";

export const register = async ({
  lastName,
  firstName,
  email,
  password,
  confirmPassword,
}) => {
  const response = await axios.post(`/api/user/register`, {
    lastName,
    firstName,
    email,
    password,
    confirmPassword,
  });

  return response.data;
};

export const login = async ({ email, password }) => {
  const response = await axios.post(`/api/user/login`, {
    email,
    password,
  });

  return response.data;
};