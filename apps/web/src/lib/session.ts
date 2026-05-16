import type { LoginResponse } from "@taptu/shared";
import { getDemoRoleFromToken } from "./demo";

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
    const session = JSON.parse(raw) as LoginResponse;
    const demoRole = getDemoRoleFromToken(session.token);

    if (session.token.startsWith("demo:") && demoRole !== session.user.role) {
      localStorage.removeItem(key);
      return null;
    }

    return session;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(key);
}
