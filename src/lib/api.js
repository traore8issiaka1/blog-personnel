import { clearToken, readToken } from "./auth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function request(path, options = {}) {
  const token = readToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.error || "Erreur reseau");
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function apiRegister(payload) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiLogin(payload) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiGetState() {
  return request("/state");
}

export async function apiSendFriendRequest(targetUserId) {
  return request("/friends/requests", {
    method: "POST",
    body: JSON.stringify({ targetUserId }),
  });
}

export async function apiRespondToRequest(requestId, accept) {
  return request(`/friends/requests/${requestId}/respond`, {
    method: "POST",
    body: JSON.stringify({ accept }),
  });
}

export async function apiRemoveFriend(friendId) {
  return request("/friends/remove", {
    method: "POST",
    body: JSON.stringify({ friendId }),
  });
}

export async function apiBlockUser(targetUserId) {
  return request("/friends/block", {
    method: "POST",
    body: JSON.stringify({ targetUserId }),
  });
}

export async function apiUnblockUser(targetUserId) {
  return request("/friends/unblock", {
    method: "POST",
    body: JSON.stringify({ targetUserId }),
  });
}

export async function apiCreateArticle(payload) {
  return request("/articles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiUpdateArticle(articleId, payload) {
  return request(`/articles/${articleId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function apiDeleteArticle(articleId) {
  return request(`/articles/${articleId}`, {
    method: "DELETE",
  });
}

export async function apiAddComment(articleId, content) {
  return request(`/articles/${articleId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function handleUnauthorized(error) {
  if (error?.status === 401) {
    clearToken();
  }
}
