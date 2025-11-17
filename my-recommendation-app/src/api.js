// API 설정 및 유틸리티
const API_BASE = (import.meta?.env?.VITE_API_BASE ?? "http://localhost:8000").replace(/\/+$/, "");

// 인증 헤더 생성
export const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// 기본 fetch 래퍼
export const apiFetch = async (endpoint, options = {}) => {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
};

// HTTP 메서드별 헬퍼
export const apiGet = (endpoint, options = {}) => 
  apiFetch(endpoint, { ...options, method: "GET" });

export const apiPost = (endpoint, body, options = {}) =>
  apiFetch(endpoint, {
    ...options,
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });

export const apiPut = (endpoint, body, options = {}) =>
  apiFetch(endpoint, {
    ...options,
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });

export const apiPatch = (endpoint, body, options = {}) =>
  apiFetch(endpoint, {
    ...options,
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });

export const apiDelete = (endpoint, options = {}) =>
  apiFetch(endpoint, { ...options, method: "DELETE" });

export default API_BASE;

