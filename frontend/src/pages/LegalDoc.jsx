import PublicShell from "../components/PublicShell.jsx";
import { LEGAL_UPDATED, SUPPORT_EMAIL, mailTo } from "../data/support.js";

/* Affiche un document juridique : sommaire + articles numérotés */
export function LegalDoc({ kicker, title, subtitle, sections }) {
  return (
    <PublicShell kicker={kicker} title={title} subtitle={subtitle}>
      <div className="sp-legal">
        <p className="sp-updated">Dernière mise à jour : {LEGAL_UPDATED}</p>
        <nav className="sp-toc" aria-label="Sommaire">
          <b>Sommaire</b>
          <ol>
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>
        {sections.map((s, i) => (
          <article key={s.id} id={s.id} className="sp-art">
            <h2>
              <span>{i + 1}</span> {s.title}
            </h2>
            {s.body.map((b, j) =>
              Array.isArray(b) ? (
                <ul key={j}>
                  {b.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
              ) : (
                <p key={j}>{b}</p>
              )
            )}
          </article>
        ))}
        <p className="sp-legal__contact">
          Une question sur ce document ? <a href={mailTo("Question sur les conditions")}>{SUPPORT_EMAIL}</a>
        </p>
      </div>
    </PublicShell>
  );
                      }
