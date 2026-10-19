const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

/* ===== Affiliation : mémorise le code d'invitation (?ref=CODE) pendant 60 jours ===== */
const REF_KEY = "digitelio_ref";
const REF_TTL_MS = 60 * 24 * 60 * 60 * 1000;
const REF_RE = /^[A-Za-z0-9]{6,12}$/;

export function getStoredRef() {
  try {
    const saved = JSON.parse(localStorage.getItem(REF_KEY) || "null");
    if (saved?.code && REF_RE.test(saved.code) && Date.now() - saved.at < REF_TTL_MS) return saved.code;
  } catch {
    /* stockage indisponible */
  }
  return "";
}

(function captureRef() {
  try {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (code && REF_RE.test(code)) {
      localStorage.setItem(REF_KEY, JSON.stringify({ code: code.toUpperCase(), at: Date.now() }));
    }
  } catch {
    /* stockage indisponible */
  }
})();

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
      body: JSON.stringify({ fullName, email, password, ref: getStoredRef() }),
    }),
  login: (email, password) =>
    apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => apiFetch("/api/auth/me", { method: "GET" }),
  logout: () => apiFetch("/api/auth/logout", { method: "POST" }),
};

