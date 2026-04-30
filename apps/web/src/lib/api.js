const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001/api";
export async function login(payload) {
    const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({ message: "Login gagal." }));
        throw new Error(data.message ?? "Login gagal.");
    }
    return response.json();
}
export async function getDashboard(token) {
    const response = await fetch(`${apiBaseUrl}/dashboard`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    if (!response.ok) {
        throw new Error("Gagal memuat dashboard.");
    }
    return response.json();
}
