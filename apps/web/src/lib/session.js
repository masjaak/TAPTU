const key = "hadiri-session";
export function saveSession(session) {
    localStorage.setItem(key, JSON.stringify(session));
}
export function readSession() {
    const raw = localStorage.getItem(key);
    if (!raw) {
        return null;
    }
    try {
        return JSON.parse(raw);
    }
    catch {
        localStorage.removeItem(key);
        return null;
    }
}
export function clearSession() {
    localStorage.removeItem(key);
}
