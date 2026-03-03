const TOKEN_KEY = "blog_personnel_token_v1";

export function readToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function writeToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function extractUserIdFromToken(token) {
  if (!token) return null;
  try {
    const payloadBase64 = token
      .split(".")[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padded = payloadBase64.padEnd(Math.ceil(payloadBase64.length / 4) * 4, "=");
    const json = atob(padded);
    const payload = JSON.parse(json);
    return payload.userId || null;
  } catch {
    return null;
  }
}
