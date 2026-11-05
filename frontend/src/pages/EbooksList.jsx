import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

const LANG_NAMES = { fr: "Français", en: "English", es: "Español", pt: "Português", de: "Deutsch", it: "Italiano", ar: "العربية" };
const COVERS = [
  "linear-gradient(135deg,#1b1340,#5b2fc9)",
  "linear-gradient(135deg,#0b2447,#1d6fb8)",
  "linear-gradient(135deg,#3d0f2a,#a1275f)",
  "linear-gradient(135deg,#0d3b36,#16a085)",
  "linear-gradient(135deg,#3b2410,#c27a1e)",
  "linear-gradient(135deg,#1a1a2e,#4a4e8f)",
];
const PAGE_SIZE = 6;

function fmtDate(s) {
  if (!s) return "";
  const d = new Date(String(s).replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/* Description propre : sans symboles Markdown, sans emoji, longueur limitée */
function cleanDesc(text, title = "") {
  let t = String(text || "");
  t = t.replace(/[\p{Extended_Pictographic}️‍]/gu, "");
  t = t.replace(/[#*_`>]+/g, " ").replace(/\s+/g, " ").trim();
  const ti = String(title || "").trim();
  if (ti && t.toLowerCase().startsWith(ti.toLowerCase())) t = t.slice(ti.length).replace(/^[\s:,.\-–]+/, "");
  if (t.length > 150) t = t.slice(0, 150).replace(/\s+\S*$/, "") + "…";
  return t;
}

const coverOf = (id) => {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COVERS[h % COVERS.length];
};

export default function EbooksList() {
  const [ebooks, setEbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`${API}/api/ebooks`, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Erreur de chargement.");
        if (alive) setEbooks(data.ebooks || []);
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const published = ebooks.filter((b) => b.status === "published").length;
  const drafts = ebooks.length - published;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return ebooks.filter((b) => {
      if (filter === "published" && b.status !== "published") return false;
      if (filter === "draft" && b.status === "published") return false;
      return !term || `${b.title} ${b.description || ""}`.toLowerCase().includes(term);
    });
  }, [ebooks, q, filter]);

  const searching = q.trim() !== "" || filter !== "all";
  const visible = searching || showAll ? filtered : filtered.slice(0, PAGE_SIZE);

  return (
    <DashboardLayout>
      <div className="eb-wrap">
        <section className="eb-hero">
          <div className="eb-kicker">Bibliothèque</div>
          <h1 className="eb-hero-title">Vos eBooks</h1>
          <p className="eb-hero-sub">Retrouvez tous vos eBooks, relisez-les et exportez-les en PDF premium.</p>
          <div className="eb-stats">
            <span><b>{ebooks.length}</b> eBook{ebooks.length > 1 ? "s" : ""}</span>
            <span><b>{published}</b> publié{published > 1 ? "s" : ""}</span>
            <span><b>{drafts}</b> brouillon{drafts > 1 ? "s" : ""}</span>
          </div>
          <Link to="/dashboard/ebooks/create" className="eb-cta">
            ✨ Créer un eBook
          </Link>
        </section>

        {error && <div className="dg-alert dg-alert--error">{error}</div>}

        {loading ? (
          <p className="dg-page__subtitle">Chargement...</p>
        ) : ebooks.length === 0 ? (
          <div className="eb-empty">
            <div className="eb-empty-icon">📘</div>
            <h2>Votre bibliothèque est vide</h2>
            <p>Créez votre premier eBook : un titre, une description, et l'IA rédige tout pour vous.</p>
            <Link to="/dashboard/ebooks/create" className="eb-cta">Créer mon premier eBook</Link>
          </div>
        ) : (
          <>
            <div className="eb-toolbar">
              <input
                type="search"
                className="eb-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="🔎 Rechercher un eBook"
                aria-label="Rechercher un eBook"
              />
              <div className="eb-tabs" role="tablist">
                {[["all", "Tous"], ["draft", "Brouillons"], ["published", "Publiés"]].map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-selected={filter === id} className={filter === id ? "on" : ""} onClick={() => setFilter(id)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="dg-page__subtitle" style={{ marginTop: 16 }}>Aucun eBook ne correspond à votre recherche.</p>
            ) : (
              <div className="eb-grid">
                {visible.map((b) => (
                  <Link key={b.id} to={`/dashboard/ebooks/${b.id}`} className="eb-card">
                    <div className="eb-cover" style={{ background: coverOf(b.id) }}>
                      <span className="eb-cover-icon">📘</span>
                      <span className={`eb-badge${b.status === "published" ? " ok" : ""}`}>
                        {b.status === "published" ? "Publié" : "Brouillon"}
                      </span>
                    </div>
                    <div className="eb-body">
                      <h2 className="eb-title">{b.title}</h2>
                      {cleanDesc(b.description, b.title) && <p className="eb-desc">{cleanDesc(b.description, b.title)}</p>}
                      <div className="eb-meta">
                        <span>{LANG_NAMES[b.language] || "Français"}</span>
                        {fmtDate(b.created_at) && <span>{fmtDate(b.created_at)}</span>}
                      </div>
                      <span className="eb-open">Ouvrir ›</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {!searching && filtered.length > PAGE_SIZE && (
              <button type="button" className="eb-more" onClick={() => setShowAll((v) => !v)}>
                {showAll ? "Voir moins" : `Voir tous les eBooks (${filtered.length})`}
              </button>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
