import axios from "axios";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3777/api"
).replace(/\/+$/, "");

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export async function register(name, email, password) {
  const response = await API.post("/auth/register", {
    name,
    email,
    password,
  });

  return response.data;
}

export async function login(email, password) {
  const response = await API.post("/auth/login", {
    email,
    password,
  });

  return response.data;
}

export function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("authUser");
}

export async function getChats() {
  const response = await API.get("/chat/chats");
  return response.data;
}

export async function getConversations(chatId) {
  const response = await API.get("/chat/conversations", {
    params: chatId ? { chatId } : {},
  });

  return response.data;
}

export async function sendMessage(question, chatId) {
  const response = await API.post("/chat/conversations", {
    question,
    ...(chatId ? { chatId } : {}),
  });

  return response.data;
}

export function getErrorMessage(error) {
  if (error?.response?.status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (error?.response?.status === 404) {
    return error.response.data?.message || "Chat not found.";
  }

  if (error?.response) {
    return (
      error.response.data?.message ||
      `Request failed (${error.response.status}).`
    );
  }

  if (error?.code === "ECONNABORTED") {
    return "The request timed out. Please try again.";
  }

  return "Cannot connect to the server. Check your API URL and backend.";
}

export default API;
