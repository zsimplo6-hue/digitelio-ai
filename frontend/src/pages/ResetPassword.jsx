import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError("");
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne sont pas identiques.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Une erreur est survenue.");
      setDone(true);
      setTimeout(() => navigate("/login"), 3500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const noToken = !/^[0-9a-f]{64}$/.test(token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-digi-gradient-radial px-6 py-12 dark:bg-digi-navy">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2 text-xl font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-digi-gradient text-white">
            D
          </span>
          Digitelio <span className="text-gradient">AI</span>
        </div>

        <div className="card shadow-digi-glow">
          <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>

          {noToken ? (
            <>
              <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-500">
                Ce lien est invalide. Refaites une demande de réinitialisation.
              </div>
              <Link to="/forgot-password" className="btn-primary mt-6 w-full">
                Refaire une demande
              </Link>
            </>
          ) : done ? (
            <>
              <div className="mt-4 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
                ✅ Votre mot de passe a été modifié. Redirection vers la connexion…
              </div>
              <Link to="/login" className="btn-primary mt-6 w-full">
                Se connecter
              </Link>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-digi-navy/60 dark:text-white/60">
                Choisissez un nouveau mot de passe (8 caractères minimum).
              </p>

              {error && (
                <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">
                  {error}{" "}
                  {/invalide|expiré/i.test(error) && (
                    <Link to="/forgot-password" className="font-semibold underline">
                      Refaire une demande
                    </Link>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="8 caractères minimum"
                      className="w-full rounded-lg border border-digi-navy/10 bg-white px-4 py-2.5 pr-12 text-sm outline-none focus:border-digi-blue dark:border-white/15 dark:bg-white/5"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-digi-navy/50 dark:text-white/50"
                    >
                      {showPassword ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Confirmer le mot de passe</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Retapez le mot de passe"
                    className="w-full rounded-lg border border-digi-navy/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-digi-blue dark:border-white/15 dark:bg-white/5"
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? "Enregistrement..." : "Changer mon mot de passe"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
              }
