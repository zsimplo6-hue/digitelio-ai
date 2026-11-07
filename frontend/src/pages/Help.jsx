import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PublicShell from "../components/PublicShell.jsx";
import { SupportCta } from "./Faq.jsx";
import { ALL_FAQ, FAQ_CATEGORIES, SUPPORT_EMAIL, mailTo } from "../data/support.js";

const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const POPULAR = [
  "Comment fonctionne l'abonnement ?",
  "J'ai payé mais mon plan n'est pas activé. Que faire ?",
  "J'ai oublié mon mot de passe.",
  "La génération est lente ou s'arrête.",
  "Comment obtenir le PDF de ma formation ?",
];

export default function Help() {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const n = norm(q.trim());
    return n ? ALL_FAQ.filter((it) => norm(it.q + " " + it.a).includes(n)).slice(0, 8) : [];
  }, [q]);
  const popular = ALL_FAQ.filter((it) => POPULAR.includes(it.q));

  return (
    <PublicShell
      wide
      kicker="Centre d'aide"
      title="Comment pouvons-nous vous aider ?"
      subtitle="Trouvez une réponse en quelques secondes ou contactez directement notre équipe de support."
    >
      <div className="sp-search">
        <input
          type="search"
          placeholder="Décrivez votre problème : paiement, PDF, mot de passe…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Rechercher dans le centre d'aide"
        />
      </div>

      {q.trim() && (
        <div className="sp-results">
          {results.length === 0 && (
            <div className="sp-empty">
              Aucun résultat. <a href={mailTo("Question sur Digitelio AI")}>Écrivez-nous →</a>
            </div>
          )}
          {results.map((it) => (
            <details key={it.q} className="sp-qa" open>
              <summary>
                {it.q} <em>{it.catTitle}</em>
              </summary>
              <p>{it.a}</p>
            </details>
          ))}
        </div>
      )}

      <h2 className="sp-h2">Parcourir par thème</h2>
      <div className="sp-cats">
        {FAQ_CATEGORIES.map((c) => (
          <Link key={c.id} to={`/faq#${c.id}`} className="sp-cat">
            <span className="sp-cat__ic">{c.icon}</span>
            <b>{c.title}</b>
            <small>{c.desc}</small>
            <em>{c.items.length} réponses →</em>
          </Link>
        ))}
      </div>

      <div className="sp-two">
        <section>
          <h2 className="sp-h2">Questions populaires</h2>
          <div className="sp-pop">
            {popular.map((it) => (
              <details key={it.q} className="sp-qa">
                <summary>{it.q}</summary>
                <p>{it.a}</p>
              </details>
            ))}
            <Link to="/faq" className="sp-more">Voir toutes les questions →</Link>
          </div>
        </section>

        <aside className="sp-contact">
          <h2 className="sp-h2" style={{ marginTop: 0 }}>Contacter le support</h2>
          <p>
            Un souci de paiement, de compte ou de génération ? Écrivez-nous, nous vous répondons par email.
          </p>
          <a className="sp-mail" href={mailTo("Support Digitelio AI")}>✉️ {SUPPORT_EMAIL}</a>
          <div className="sp-check">
            <b>Pour une réponse plus rapide, indiquez :</b>
            <ul>
              <li>l'email de votre compte Digitelio AI ;</li>
              <li>ce que vous essayiez de faire ;</li>
              <li>une capture d'écran du problème ;</li>
              <li>pour un paiement : le plan, le montant et la date.</li>
            </ul>
          </div>
          <a className="sp-btn sp-btn--primary" href={mailTo("Support Digitelio AI")}>Envoyer un email</a>
        </aside>
      </div>

      <section className="sp-links">
        <Link to="/conditions">Conditions d'utilisation</Link>
        <Link to="/confidentialite">Politique de confidentialité</Link>
        <Link to="/faq">FAQ complète</Link>
      </section>

      <SupportCta />
    </PublicShell>
  );
}
