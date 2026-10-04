import { useState } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle.jsx";
import Logo from "../components/Logo.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error("Une erreur est survenue. Réessayez dans un instant.");
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-digi-gradient-radial px-6 py-12 dark:bg-digi-navy">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <Link to="/" aria-label="Digitelio AI" className="mb-8 flex justify-center">
          <Logo height={64} />
        </Link>

        <div className="card shadow-digi-glow">
          <h1 className="text-2xl font-bold">Mot de passe oublié ?</h1>

          {sent ? (
            <>
              <div className="mt-4 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
                Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé. Il est
                valable 30 minutes. Pensez à vérifier vos courriers indésirables.
              </div>
              <Link to="/login" className="btn-primary mt-6 w-full">
                Retour à la connexion
              </Link>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-digi-navy/60 dark:text-white/60">
                Saisissez l'email de votre compte : nous vous enverrons un lien pour choisir un nouveau mot de
                passe.
              </p>

              {error && (
                <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Adresse e-mail</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full rounded-lg border border-digi-navy/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-digi-blue dark:border-white/15 dark:bg-white/5"
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? "Envoi..." : "Envoyer le lien"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-digi-navy/60 dark:text-white/60">
                <Link to="/login" className="font-semibold text-digi-blue hover:underline">
                  ← Retour à la connexion
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
