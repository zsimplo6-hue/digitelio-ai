const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include", // essentiel pour envoyer/recevoir le cookie de session
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error || "Une erreur est survenue.";
    throw new Error(message);
  }

  return data;
}

export const api = {
  signup: (fullName, email, password) =>
    apiFetch("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ fullName, email, password }),
    }),
  login: (email, password) =>
    apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => apiFetch("/api/auth/me", { method: "GET" }),
  logout: () => apiFetch("/api/auth/logout", { method: "POST" }),
};

