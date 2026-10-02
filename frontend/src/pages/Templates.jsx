import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import TemplatePreview from "../components/TemplatePreview.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { TEMPLATES, TEMPLATE_ORDER, fontsImport } from "../utils/templates.js";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

export default function Templates() {
  const [brand, setBrand] = useState({});
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`${API}/api/brand`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setBrand(d.brand || {}))
      .catch(() => {});
  }, []);

  async function setDefault(id) {
    setBusy(id);
    setErr("");
    setMsg("");
    try {
      const res = await fetch(`${API}/api/brand`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ default_template: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur d'enregistrement.");
      setBrand(data.brand);
      setMsg(`« ${TEMPLATES[id].name} » sera utilisé par défaut pour vos eBooks ✓`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <DashboardLayout title="Modèles">
      <style>{fontsImport(TEMPLATE_ORDER)}</style>
      <div className="dg-settings-wrap" style={{ maxWidth: "56rem" }}>
        <h1 className="text-2xl font-bold">Modèles</h1>
        <p className="dg-page__subtitle">
          6 mises en page soignées, avec leurs propres polices et couleurs. Pour changer le modèle d'un eBook
          existant, ouvrez-le puis choisissez « Modèle du livre ».
        </p>

        {err && <div className="dg-alert dg-alert--error">{err}</div>}
        {msg && <div className="dg-alert dg-alert--success">{msg}</div>}

        <div
          style={{
            display: "grid",
            gap: 16,
            marginTop: 20,
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          }}
        >
          {TEMPLATE_ORDER.map((id) => {
            const t = TEMPLATES[id];
            const isDefault = brand.default_template === id;
            return (
              <Card key={id}>
                <TemplatePreview templateId={id} brand={{}} size={open === id ? "lg" : "sm"} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {t.name} {isDefault && <span className="dg-pill dg-pill--ok" style={{ marginLeft: 6 }}>Par défaut</span>}
                  </div>
                  <div className="dg-helper-text" style={{ marginTop: 2 }}>{t.tagline}</div>
                  <div className="dg-helper-text" style={{ marginTop: 2 }}>Idéal pour : {t.ideal}</div>
                </div>
                <div className="dg-cover-actions" style={{ flexWrap: "wrap" }}>
                  <button type="button" className="dg-chip" onClick={() => setOpen(open === id ? null : id)}>
                    {open === id ? "Réduire" : "Agrandir l'aperçu"}
                  </button>
                  <Button
                    variant={isDefault ? "secondary" : "primary"}
                    size="sm"
                    disabled={isDefault || busy === id}
                    onClick={() => setDefault(id)}
                  >
                    {isDefault ? "✓ Modèle par défaut" : busy === id ? "..." : "Utiliser par défaut"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
        }
