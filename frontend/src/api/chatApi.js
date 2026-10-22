import axios from "axios";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  // "http://localhost:3777/api"
  "https://ashe-ai-mern-asknova-api.onrender.com"
).replace(/\/+$/, "");

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

// Attach the authentication token to requests.
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Register a new user.
export async function register(name, email, password) {
  const response = await API.post("/auth/register", {
    name,
    email,
    password,
  });

  return response.data;
}

// Log in an existing user.
export async function login(email, password) {
  const response = await API.post("/auth/login", {
    email,
    password,
  });

  return response.data;
}

// Log out the current user.
export function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("authUser");
}

// Get the current user's chats.
export async function getChats() {
  const response = await API.get("/chat/chats");
  return response.data;
}

// Get messages for a chat.
export async function getConversations(chatId) {
  const response = await API.get("/chat/conversations", {
    params: chatId ? { chatId } : {},
  });

  return response.data;
}

// Send a message with optional file attachments.
export async function sendMessage(message, chatId, files = []) {
  const attachments = Array.from(files || []);
  let response;

  if (attachments.length > 0) {
    const formData = new FormData();

    formData.append("question", message);

    if (chatId !== undefined && chatId !== null && chatId !== "") {
      formData.append("chatId", String(chatId));
    }

    attachments.forEach((file) => {
      formData.append("files", file);
    });

    // Let the browser/Axios generate the multipart boundary.
    response = await API.post("/chat/conversations", formData, {
      timeout: 120000,
    });
  } else {
    response = await API.post("/chat/conversations", {
      question: message,
      ...(chatId !== undefined && chatId !== null && chatId !== ""
        ? { chatId }
        : {}),
    });
  }

  return response.data;
}

// Return readable error messages for the UI.
export function getErrorMessage(error) {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message;

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (status === 404) {
    return serverMessage || "The requested chat or endpoint was not found.";
  }

  if (status === 413) {
    return "The uploaded file is too large.";
  }

  if (status === 415) {
    return "This file type is not supported.";
  }

  if (status === 429) {
    return "Too many requests. Please wait and try again.";
  }

  if (status >= 500) {
    return serverMessage || "The server encountered an error.";
  }

  if (error?.code === "ECONNABORTED") {
    return "The request timed out. Please try again.";
  }

  if (!error?.response) {
    return "Cannot connect to the server. Check your API URL and connection.";
  }

  return serverMessage || error.message || "An unexpected error occurred.";
}

export default API;
