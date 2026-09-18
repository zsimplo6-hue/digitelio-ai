import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`;
  }

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
          <h1 className="text-2xl font-bold">Bienvenue !</h1>
          <p className="mt-1 text-sm text-digi-navy/60 dark:text-white/60">
            Connectez-vous à votre compte pour continuer.
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">
              {error}
            </div>
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

            <div>
              <label className="mb-1 block text-sm font-medium">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe"
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

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-digi-navy/70 dark:text-white/70">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded"
                />
                Se souvenir de moi
              </label>
              <a href="#" className="text-digi-blue hover:underline">
                Mot de passe oublié ?
              </a>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3 text-xs text-digi-navy/40 dark:text-white/40">
            <div className="h-px flex-1 bg-digi-navy/10 dark:bg-white/10" />
            ou
            <div className="h-px flex-1 bg-digi-navy/10 dark:bg-white/10" />
          </div>

          <div className="mt-4 space-y-3">
            <button onClick={handleGoogleLogin} className="btn-secondary w-full">
              Continuer avec Google
            </button>
            <button className="btn-secondary w-full" disabled>
              Continuer avec Facebook
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-digi-navy/60 dark:text-white/60">
            Vous n'avez pas de compte ?{" "}
            <Link to="/signup" className="font-semibold text-digi-blue hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
          }
