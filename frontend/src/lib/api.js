import axios from "axios";

export const API_BASE_URL =
  import.meta.env?.VITE_API_URL || "http://localhost:5000/api";

export const ACCESS_TOKEN_KEY = "student_portal_access_token";
export const SESSION_EXPIRED_EVENT = "student_portal_session_expired";

const api = axios.create({
  baseURL: API_BASE_URL,
});

const getLocalStorage = () =>
  typeof window === "undefined" ? null : window.localStorage;

export const clearStoredSession = () => {
  getLocalStorage()?.removeItem(ACCESS_TOKEN_KEY);
};

export const notifySessionExpired = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
};

api.interceptors.request.use((config) => {
  const token = getLocalStorage()?.getItem(ACCESS_TOKEN_KEY);

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const handleUnauthorizedError = (error) => {
  const hasStoredSession = Boolean(getLocalStorage()?.getItem(ACCESS_TOKEN_KEY));

  if (error?.response?.status === 401 && hasStoredSession) {
    clearStoredSession();
    notifySessionExpired();
  }

  return Promise.reject(error);
};

api.interceptors.response.use((response) => response, handleUnauthorizedError);

const humanizeFieldName = (field) =>
  String(field)
    .replace(/^(body|params|query)\./, "")
    .replaceAll(".", " ")
    .replaceAll("_", " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .toLowerCase();

const getPayloadMessages = (payload) => {
  const validationMessages = Array.isArray(payload?.errors)
    ? payload.errors
        .map((error) => {
          const message = error?.message;

          if (!message) {
            return "";
          }

          const field = error.field ? humanizeFieldName(error.field) : "";

          return field ? `${field}: ${message}` : message;
        })
        .filter(Boolean)
    : [];

  if (validationMessages.length > 0) {
    return [payload?.message, validationMessages.join(" ")].filter(Boolean);
  }

  if (payload?.message) {
    return [payload.message];
  }

  return [];
};

export const getErrorMessage = (error) => {
  const payloadMessages = getPayloadMessages(error.response?.data);

  if (payloadMessages.length > 0) {
    return payloadMessages.join(" ");
  }

  return error.message || "The request could not be completed.";
};

export default api;
