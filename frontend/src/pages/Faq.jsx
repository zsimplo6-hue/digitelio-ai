import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PublicShell from "../components/PublicShell.jsx";
import { FAQ_CATEGORIES, mailTo } from "../data/support.js";

const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Faq() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  const groups = useMemo(() => {
    const n = norm(q.trim());
    return FAQ_CATEGORIES.filter((c) => cat === "all" || c.id === cat)
      .map((c) => ({
        ...c,
        items: n ? c.items.filter((it) => norm(it.q + " " + it.a).includes(n)) : c.items,
      }))
      .filter((c) => c.items.length > 0);
  }, [q, cat]);

  return (
    <PublicShell
      kicker="Questions fréquentes"
      title="FAQ"
      subtitle="Toutes les réponses sur Digitelio AI : création, abonnement, paiement, compte. Une question n'est pas listée ? Écrivez-nous."
    >
      <div className="sp-search">
        <input
          type="search"
          placeholder="Rechercher une question…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Rechercher dans la FAQ"
        />
      </div>

      <div className="sp-chips" role="tablist">
        <button type="button" className={cat === "all" ? "on" : ""} onClick={() => setCat("all")}>Toutes</button>
        {FAQ_CATEGORIES.map((c) => (
          <button key={c.id} type="button" className={cat === c.id ? "on" : ""} onClick={() => setCat(c.id)}>
            {c.icon} {c.title}
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="sp-empty">
          Aucune réponse ne correspond à « {q} ». <a href={mailTo("Question sur Digitelio AI")}>Posez-nous la question →</a>
        </div>
      )}

      {groups.map((c) => (
        <section key={c.id} id={c.id} className="sp-group">
          <h2 className="sp-group__title">
            <span>{c.icon}</span> {c.title}
          </h2>
          {c.items.map((it) => (
            <details key={it.q} className="sp-qa" open={!!q.trim()}>
              <summary>{it.q}</summary>
              <p>{it.a}</p>
            </details>
          ))}
        </section>
      ))}

      <SupportCta />
    </PublicShell>
  );
}

export function SupportCta() {
  return (
    <section className="sp-cta">
      <div>
        <h3>Besoin d'une aide personnalisée ?</h3>
        <p>Notre équipe vous répond par email. Précisez l'adresse email de votre compte pour aller plus vite.</p>
      </div>
      <div className="sp-cta__btns">
        <a className="sp-btn sp-btn--primary" href={mailTo("Support Digitelio AI")}>✉️ Contacter le support</a>
        <Link className="sp-btn" to="/aide">Centre d'aide</Link>
      </div>
    </section>
  );
          }

