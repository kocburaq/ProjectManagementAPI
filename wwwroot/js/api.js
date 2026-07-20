const BASE = "/api";
const SESSION_KEY = "pmapi_session";

export class ApiError extends Error {
  constructor(message, status, fieldErrors) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors || null;
  }
}

export function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function extractMessage(body, fallback) {
  if (!body) return fallback;
  if (typeof body === "string") return body;
  if (body.Message) return body.Message;
  if (body.message) return body.message;
  if (body.errors) {
    const parts = Object.entries(body.errors).map(([field, msgs]) => {
      const list = Array.isArray(msgs) ? msgs : [msgs];
      return `${field}: ${list.join(", ")}`;
    });
    if (parts.length) return parts.join(" | ");
  }
  if (body.title) return body.title;
  return fallback;
}

export async function apiFetch(path, { method = "GET", body, query } = {}) {
  let url = BASE + path;

  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, value);
      }
    });
    const qs = params.toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }

  const headers = {};
  const session = getSession();
  if (session && session.accessToken) {
    headers["Authorization"] = `Bearer ${session.accessToken}`;
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Sunucuya ulaşılamadı. API çalışıyor mu?", 0, null);
  }

  if (res.status === 204) return null;

  const text = await res.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearSession();
    }
    const message = extractMessage(payload, `İstek başarısız oldu (${res.status}).`);
    const fieldErrors = payload && payload.errors ? payload.errors : null;
    throw new ApiError(message, res.status, fieldErrors);
  }

  return payload;
}
