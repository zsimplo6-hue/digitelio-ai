import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import TemplatePreview from "../components/TemplatePreview.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Input } from "../components/ui/Field.jsx";
import { TEMPLATES, TEMPLATE_ORDER, fontsImport } from "../utils/templates.js";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

export default function BrandKit() {
  const [b, setB] = useState({
    brand_name: "", author_name: "", tagline: "",
    accent_color: "", cover_color: "", default_template: "finance",
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`${API}/api/brand`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setB(d.brand))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => {
    setMsg("");
    setB((x) => ({ ...x, [k]: e.target.value }));
  };

  async function save() {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch(`${API}/api/brand`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(b),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur d'enregistrement.");
      setB(data.brand);
      setMsg("Votre style est enregistré ✓");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const tpl = TEMPLATES[b.default_template] || TEMPLATES.finance;

  return (
    <DashboardLayout title="Mon style">
      <style>{fontsImport(TEMPLATE_ORDER)}</style>
      <div className="dg-settings-wrap" style={{ maxWidth: "44rem" }}>
        <h1 className="text-2xl font-bold">Mon style</h1>
        <p className="dg-page__subtitle">
          Votre kit de marque : il s'applique à la couverture et aux pages de tous vos eBooks.
        </p>

        {loading ? (
          <p className="dg-page__subtitle">Chargement...</p>
        ) : (
          <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
            <Card title="Aperçu">
              <TemplatePreview
                templateId={b.default_template}
                brand={b}
                title={b.brand_name || "Titre de votre eBook"}
                size="lg"
              />
            </Card>

            <Card title="Identité">
              <Input label="Nom de marque" value={b.brand_name} onChange={set("brand_name")} placeholder="Ex : Hunter Art Éditions" maxLength={40} />
              <Input label="Nom de l'auteur" value={b.author_name} onChange={set("author_name")} placeholder="Ex : Jean Dupont" maxLength={60} />
              <Input label="Slogan (page finale)" value={b.tagline} onChange={set("tagline")} placeholder="Ex : Le savoir qui change votre vie" maxLength={120} />
              <p className="dg-helper-text" style={{ marginTop: 0 }}>
                Sans nom de marque, la couverture affiche « DIGITELIO AI ».
              </p>
            </Card>

            <Card title="Couleurs">
              <div className="dg-field">
                <label className="dg-field__label">Couleur d'accent</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="color"
                    value={b.accent_color || tpl.colors.accent}
                    onChange={set("accent_color")}
                    style={{ width: 52, height: 40, border: 0, background: "none" }}
                  />
                  <button type="button" className="dg-chip" onClick={() => setB((x) => ({ ...x, accent_color: "" }))}>
                    Couleur du modèle
                  </button>
                </div>
              </div>
              <div className="dg-field">
                <label className="dg-field__label">Couleur de couverture</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="color"
                    value={b.cover_color || "#0B0B0B"}
                    onChange={set("cover_color")}
                    style={{ width: 52, height: 40, border: 0, background: "none" }}
                  />
                  <button type="button" className="dg-chip" onClick={() => setB((x) => ({ ...x, cover_color: "" }))}>
                    Couverture du modèle
                  </button>
                </div>
              </div>
            </Card>

            <Card title="Modèle par défaut">
              <div className="dg-cover-actions" style={{ flexWrap: "wrap", marginTop: 0 }}>
                {TEMPLATE_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="dg-chip"
                    style={b.default_template === id ? { borderColor: "#7C3AED", fontWeight: 700 } : undefined}
                    onClick={() => {
                      setMsg("");
                      setB((x) => ({ ...x, default_template: id }));
                    }}
                  >
                    {TEMPLATES[id].name}
                  </button>
                ))}
              </div>
            </Card>

            {err && <div className="dg-alert dg-alert--error">{err}</div>}
            {msg && <div className="dg-alert dg-alert--success">{msg}</div>}

            <Button variant="primary" size="lg" onClick={save} disabled={busy} style={{ width: "100%" }}>
              {busy ? "Enregistrement..." : "💾 Enregistrer mon style"}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
                      }
