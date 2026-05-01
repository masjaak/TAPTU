import type { LoginResponse } from "@taptu/shared";

const key = "taptu-session";

export function saveSession(session: LoginResponse) {
  localStorage.setItem(key, JSON.stringify(session));
}

export function readSession(): LoginResponse | null {
  const raw = localStorage.getItem(key);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as LoginResponse;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(key);
}
