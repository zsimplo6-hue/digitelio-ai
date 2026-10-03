import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import TemplatePreview from "../components/TemplatePreview.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { TEMPLATES, TEMPLATE_ORDER, fontsImport } from "../utils/templates.js";
import { FORMATION_TEMPLATES, FORMATION_ORDER, formationFontsImport } from "../utils/formationTemplates.js";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

const GRID = {
  display: "grid",
  gap: 16,
  marginTop: 16,
  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
};

async function call(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur d'enregistrement.");
  return data;
}

export default function Templates() {
  const [brand, setBrand] = useState({});
  const [formationDefault, setFormationDefault] = useState("noir");
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    call("/api/brand")
      .then((d) => setBrand(d.brand || {}))
      .catch(() => {});
    call("/api/formations/default/style")
      .then((d) => d.template && setFormationDefault(d.template))
      .catch(() => {});
  }, []);

  async function setEbookDefault(id) {
    setBusy(id);
    setErr("");
    setMsg("");
    try {
      const data = await call("/api/brand", {
        method: "PUT",
        body: JSON.stringify({ default_template: id }),
      });
      setBrand(data.brand);
      setMsg(`« ${TEMPLATES[id].name} » sera utilisé par défaut pour vos eBooks ✓`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  }

  async function setFormationDefaultTpl(id) {
    setBusy(`f-${id}`);
    setErr("");
    setMsg("");
    try {
      const data = await call("/api/formations/default/style", {
        method: "PUT",
        body: JSON.stringify({ template: id }),
      });
      setFormationDefault(data.template);
      setMsg(`« ${FORMATION_TEMPLATES[id].name} » sera utilisé par défaut pour vos formations ✓`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <DashboardLayout title="Modèles">
      <style>{fontsImport(TEMPLATE_ORDER)}</style>
      <style>{formationFontsImport(FORMATION_ORDER)}</style>
      <div className="dg-settings-wrap" style={{ maxWidth: "56rem" }}>
        <h1 className="text-2xl font-bold">Modèles d'eBooks</h1>
        <p className="dg-page__subtitle">
          6 mises en page premium, avec leurs propres polices et couleurs. Pour changer le modèle d'un eBook
          existant, ouvrez-le puis choisissez « Modèle du livre ».
        </p>

        {err && <div className="dg-alert dg-alert--error">{err}</div>}
        {msg && <div className="dg-alert dg-alert--success">{msg}</div>}

        <div style={GRID}>
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
                    onClick={() => setEbookDefault(id)}
                  >
                    {isDefault ? "✓ Modèle par défaut" : busy === id ? "..." : "Utiliser par défaut"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <h1 className="text-2xl font-bold" style={{ marginTop: 44 }}>Modèles de formations</h1>
        <p className="dg-page__subtitle">
          6 modèles ultra premium, différents de ceux des eBooks, pour le PDF de vos formations (couverture,
          sommaire, modules). Pour changer le modèle d'une formation existante : ouvrez-la, puis « Modèle de la
          formation ».
        </p>

        <div style={GRID}>
          {FORMATION_ORDER.map((id) => {
            const t = FORMATION_TEMPLATES[id];
            const key = `f-${id}`;
            const isDefault = formationDefault === id;
            return (
              <Card key={key}>
                <TemplatePreview
                  kind="formation"
                  templateId={id}
                  brand={{}}
                  title="Titre de votre formation"
                  size={open === key ? "lg" : "sm"}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {t.name} {isDefault && <span className="dg-pill dg-pill--ok" style={{ marginLeft: 6 }}>Par défaut</span>}
                  </div>
                  <div className="dg-helper-text" style={{ marginTop: 2 }}>{t.tagline}</div>
                  <div className="dg-helper-text" style={{ marginTop: 2 }}>Idéal pour : {t.ideal}</div>
                </div>
                <div className="dg-cover-actions" style={{ flexWrap: "wrap" }}>
                  <button type="button" className="dg-chip" onClick={() => setOpen(open === key ? null : key)}>
                    {open === key ? "Réduire" : "Agrandir l'aperçu"}
                  </button>
                  <Button
                    variant={isDefault ? "secondary" : "primary"}
                    size="sm"
                    disabled={isDefault || busy === key}
                    onClick={() => setFormationDefaultTpl(id)}
                  >
                    {isDefault ? "✓ Modèle par défaut" : busy === key ? "..." : "Utiliser par défaut"}
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
