import axios from "axios";

// Backend URL: set VITE_API_BASE_URL (on Vercel, in the frontend project's settings).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const TOKEN_KEY = "cropvision_token";
export const ADMIN_TOKEN_KEY = "cropvision_admin_token";

// Fired (with { tokenKey }) when the server rejects a stored token, so the
// matching auth context can sign the user out instead of showing errors.
export const SESSION_EXPIRED_EVENT = "cropvision:session-expired";

export function createApiClient(tokenKey) {
  const client = axios.create({ baseURL: API_BASE_URL });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem(tokenKey);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401 && error.config?.headers?.Authorization) {
        localStorage.removeItem(tokenKey);
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { tokenKey } }));
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export const apiClient = createApiClient(TOKEN_KEY);

// Messages for errors the hosting platform returns before our API answers.
const STATUS_MESSAGES = {
  413: "This photo is too large to upload. Please choose a smaller one.",
  502: "The server is having trouble right now. Please try again shortly.",
  503: "The server is having trouble right now. Please try again shortly.",
  504: "The request took too long. Please try again.",
};

export function extractErrorMessage(error) {
  const data = error?.response?.data;
  if (data?.error?.message) return data.error.message;
  if (STATUS_MESSAGES[error?.response?.status]) return STATUS_MESSAGES[error.response.status];
  if (error?.code === "ECONNABORTED") return "The request took too long. Please try again.";
  if (error?.message === "Network Error") return "Can't reach the server. Check your internet connection.";
  if (error?.message) return error.message;
  return "Something went wrong. Please try again.";
}

export default apiClient;

// "Did you mean ramesh@gmail.com?" -- the server's suggested email for a typo, if any.
export function emailSuggestion(error) {
  return error?.response?.data?.error?.details?.suggestion || null;
}
