function compressImage(file, maxW = 1000, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire l'image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image illisible."));
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ---------- Éditeur d'une leçon ---------- */
function LessonEditor({ formation, module, onChange }) {
  const [content, setContent] = useState(module.content || "");
  const [videoUrl, setVideoUrl] = useState(module.video_url || "");
  const [resources, setResources] = useState(module.resources || []);
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState("edit");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const cleanVideo = videoUrl.trim();
  const embed = embedUrl(cleanVideo);
  const ytId = youtubeId(cleanVideo);
  const cleanResources = resources
    .filter((r) =>
      r.type === "image" ? (r.url || "").trim() : (r.label || "").trim() && (r.url || "").trim()
    )
    .map((r) => (r.type === "image" ? { ...r, label: (r.label || "").trim() || "Image" } : { ...r, type: "link" }));
  const rtl = formation.language === "ar";

  async function save() {
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const data = await api(`/formations/${formation.id}/modules/${module.id}`, {
        method: "PUT",
        body: JSON.stringify({ content, video_url: cleanVideo, resources: cleanResources }),
      });
      onChange(data.module);
      setResources(data.module.resources);
      setMsg("Leçon enregistrée ✓");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    if (content.trim() && !window.confirm("Remplacer le texte actuel par une nouvelle leçon générée ?")) return;
    setGenerating(true);
    setErr("");
    setMsg("");
    try {
      const data = await api(`/formations/${formation.id}/modules/${module.id}/generate`, {
        method: "POST",
      });
      setContent(data.module.content);
      onChange({ id: module.id, content: data.module.content });
      setMsg("Leçon générée et enregistrée ✓");
    } catch (e) {
      setErr(e.message);
    } finally {
      setGenerating(false);
    }
  }

  function updateResource(i, field, value) {
    setResources((list) => list.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  function addLink() {
    setResources((l) => [...l, { type: "link", label: "", url: "" }]);
    setAdding(false);
  }

  async function onImageFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    setMsg("");
    if (!file.type.startsWith("image/")) {
      setErr("Choisissez une image (JPG, PNG ou WebP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErr("Image trop lourde (10 Mo maximum).");
      return;
    }
    try {
      let data = await compressImage(file, 1000, 0.8);
      if (data.length > 380000) data = await compressImage(file, 800, 0.65);
      if (data.length > 380000) data = await compressImage(file, 600, 0.55);
      if (data.length > 400000) {
        setErr("Image trop lourde, choisissez-en une plus légère.");
        return;
      }
      setResources((l) => [...l, { type: "image", label: "", url: data }]);
      setAdding(false);
    } catch (e2) {
      setErr(e2.message);
    }
  }

  return (
    <>
      <div className="fm-screen no-print">
        <div className="fm-card">
          <div className="fm-label">Leçon : {module.title}</div>

          <button className="fm-btn fm-btn-gold" onClick={generate} disabled={generating || saving}>
            {generating ? "Rédaction en cours..." : "✨ Générer la leçon"}
          </button>

          <div className="fm-tabs">
            <button className={tab === "edit" ? "fm-tab on" : "fm-tab"} onClick={() => setTab("edit")}>
              Éditer
            </button>
            <button className={tab === "preview" ? "fm-tab on" : "fm-tab"} onClick={() => setTab("preview")}>
              Aperçu
            </button>
          </div>

          {tab === "edit" ? (
            <textarea
              className="fm-input fm-textarea"
              dir={rtl ? "rtl" : "ltr"}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Texte de la leçon (Markdown : ### Titre, - puce)..."
            />
          ) : (
            <div
              className="fm-lesson"
              dir={rtl ? "rtl" : "ltr"}
              dangerouslySetInnerHTML={{
                __html: content.trim() ? renderMarkdown(content) : "<p>Aucun texte pour le moment.</p>",
              }}
            />
          )}

          <div className="fm-label" style={{ marginTop: "1.2rem" }}>Vidéo</div>
          <input
            className="fm-input"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Lien YouTube ou Vimeo (https://...)"
          />
          {embed && (
            <div className="fm-video">
              <iframe src={embed} title="Vidéo de la leçon" allowFullScreen />
            </div>
          )}
          {cleanVideo && !embed && (
            <a className="fm-link" href={cleanVideo} target="_blank" rel="noreferrer">
              Ouvrir la vidéo ↗
            </a>
          )}

          <div className="fm-label" style={{ marginTop: "1.2rem" }}>Ressources</div>
          {resources.map((r, i) =>
            r.type === "image" ? (
              <div key={i} className="fm-res fm-res-image">
                <img src={r.url} alt={r.label || "Image"} className="fm-res-thumb" />
                <input
                  className="fm-input"
                  value={r.label || ""}
                  onChange={(e) => updateResource(i, "label", e.target.value)}
                  placeholder="Légende de l'image (facultatif)"
                  maxLength={100}
                />
                <button className="fm-del" onClick={() => setResources((l) => l.filter((_, idx) => idx !== i))}>
                  ✕
                </button>
              </div>
            ) : (
              <div key={i} className="fm-res">
                <input
                  className="fm-input"
                  value={r.label || ""}
                  onChange={(e) => updateResource(i, "label", e.target.value)}
                  placeholder="Nom (ex : Modèle Canva)"
                />
                <input
                  className="fm-input"
                  value={r.url || ""}
                  onChange={(e) => updateResource(i, "url", e.target.value)}
                  placeholder="https://..."
                />
                <button className="fm-del" onClick={() => setResources((l) => l.filter((_, idx) => idx !== i))}>
                  ✕
                </button>
              </div>
            )
          )}

          {adding ? (
            <div className="fm-addbox">
              <div className="fm-muted fm-small">Que voulez-vous ajouter ?</div>
              <div className="fm-addrow">
                <button type="button" className="fm-chip" onClick={addLink}>
                  🔗 Lien (vidéo, page, document)
                </button>
                <label className="fm-chip" style={{ cursor: "pointer" }}>
                  🖼️ Image
                  <input type="file" accept="image/*" hidden onChange={onImageFile} />
                </label>
                <button type="button" className="fm-chip" onClick={() => setAdding(false)}>
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button className="fm-chip" onClick={() => setAdding(true)}>
              + Ajouter une ressource
            </button>
          )}

          {err && <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{err}</div>}
          {msg && <div className="fm-ok">{msg}</div>}

          <div className="fm-actions">
            <button className="btn-primary fm-btn" onClick={save} disabled={saving || generating}>
              {saving ? "Enregistrement..." : "💾 Enregistrer"}
            </button>
            <button className="fm-btn fm-btn-outline" onClick={() => window.print()} disabled={!content.trim()}>
              📄 Télécharger en PDF
            </button>
          </div>
        </div>
      </div>

      {/* Feuille imprimée (invisible à l'écran) */}
      <div className="fm-sheet" dir={rtl ? "rtl" : "ltr"}>
        <div className="fm-sheet-kicker">{formation.title}</div>
        <h1 className="fm-sheet-title">{module.title}</h1>

        <div
          className="fm-lesson"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content || "") }}
        />

        {cleanVideo && (
          <div className="fm-sheet-videobox">
            <h2 className="fm-sheet-h2">Vidéo de la leçon</h2>
            {ytId && (
              <a className="fm-sheet-thumb" href={cleanVideo} target="_blank" rel="noreferrer">
                <img
                  src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                  alt="Miniature de la vidéo"
                  loading="eager"
                />
                <span className="fm-play">▶</span>
              </a>
            )}
            <a className="fm-sheet-btn" href={cleanVideo} target="_blank" rel="noreferrer">
              ▶ Regarder la vidéo de la leçon
            </a>
          </div>
        )}

        {cleanResources.length > 0 && (
          <div className="fm-sheet-res">
            <h2 className="fm-sheet-h2">Ressources</h2>
            {cleanResources
              .filter((r) => r.type === "image")
              .map((r, i) => (
                <figure key={`i${i}`} className="fm-sheet-img">
                  <img src={r.url} alt={r.label} />
                  {r.label && <figcaption>{r.label}</figcaption>}
                </figure>
              ))}
            <ul>
              {cleanResources
                .filter((r) => r.type !== "image")
                .map((r, i) => (
                  <li key={i}>
                    <a href={r.url} target="_blank" rel="noreferrer">
                      {r.label}
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
