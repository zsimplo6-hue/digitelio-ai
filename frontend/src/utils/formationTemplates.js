const hexToRgb = (hex) => [0, 2, 4].map((i) => parseInt(hex.replace("#", "").slice(i, i + 2), 16));
const lum = (hex) => {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
const alpha = (hex, a) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

export const FORMATION_ORDER = ["academy", "masterclass", "impact", "emerald", "sunrise", "studio"];

export const FORMATION_TEMPLATES = {
  academy: {
    id: "academy",
    name: "Académie Or",
    tagline: "Noir profond et or, prestige absolu",
    ideal: "Finance, business, trading, formations haut de gamme",
    fonts: "family=Cinzel:wght@400;700&family=Manrope:wght@300;400;600;700",
    heading: "'Cinzel', serif",
    body: "'Manrope', sans-serif",
    colors: {
      paper: "#FBFAF6", ink: "#0B0B0B", text: "#222222",
      accent: "#D4AF37", accentSoft: "rgba(212,175,55,0.14)", onAccent: "#0B0B0B",
      cover: "radial-gradient(circle at 25% 15%,#1d1d1d,#050505 70%)",
      coverInk: "#F5F0E1", coverSub: "#FFFFFF",
      titleBg: "linear-gradient(180deg,#F6E27A 0%,#D4AF37 50%,#8C6D1F 100%)",
    },
    layout: { cover: "center", ribbons: true, upper: true },
  },
  masterclass: {
    id: "masterclass",
    name: "Master Class",
    tagline: "Bleu nuit et platine, autorité éditoriale",
    ideal: "Expertise, leadership, carrière, consulting",
    fonts: "family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600",
    heading: "'Playfair Display', serif",
    body: "'Inter', sans-serif",
    colors: {
      paper: "#FFFFFF", ink: "#0A1B33", text: "#1F2D44",
      accent: "#7F96BD", accentSoft: "rgba(127,150,189,0.16)", onAccent: "#071426",
      cover: "linear-gradient(155deg,#071426,#13294B 60%,#1B3A66)",
      coverInk: "#FFFFFF", coverSub: "#C9D3E3",
      titleBg: "linear-gradient(180deg,#FFFFFF,#C9D3E3)",
    },
    layout: { cover: "left", ribbons: false, upper: false },
  },
  impact: {
    id: "impact",
    name: "Impact",
    tagline: "Violet électrique, énergie et modernité",
    ideal: "Marketing digital, réseaux sociaux, entrepreneuriat, IA",
    fonts: "family=Sora:wght@600;700;800&family=Inter:wght@400;500;600",
    heading: "'Sora', sans-serif",
    body: "'Inter', sans-serif",
    colors: {
      paper: "#FFFFFF", ink: "#14102B", text: "#2A2547",
      accent: "#7C3AED", accentSoft: "rgba(124,58,237,0.10)", onAccent: "#FFFFFF",
      cover: "linear-gradient(140deg,#2A0B6B,#6D3BF5 55%,#C13BF5)",
      coverInk: "#FFFFFF", coverSub: "#EBDDFF",
      titleBg: "linear-gradient(#FFFFFF,#FFFFFF)",
    },
    layout: { cover: "left", ribbons: false, upper: true },
  },
  emerald: {
    id: "emerald",
    name: "Émeraude",
    tagline: "Vert profond et champagne, raffinement",
    ideal: "Bien-être, santé, nutrition, développement personnel",
    fonts: "family=Cormorant+Garamond:wght@600;700&family=Lato:wght@400;700",
    heading: "'Cormorant Garamond', serif",
    body: "'Lato', sans-serif",
    colors: {
      paper: "#F8F6EF", ink: "#0B3D2E", text: "#23463A",
      accent: "#B8975A", accentSoft: "rgba(184,151,90,0.16)", onAccent: "#0B3D2E",
      cover: "linear-gradient(165deg,#06281F,#0E5A43)",
      coverInk: "#F3EBD3", coverSub: "#D8C08A",
      titleBg: "linear-gradient(180deg,#F3E2B0,#C9A55C)",
    },
    layout: { cover: "frame", ribbons: false, upper: false },
  },
  sunrise: {
    id: "sunrise",
    name: "Aurore",
    tagline: "Dégradé coucher de soleil, chaleureux et inspirant",
    ideal: "Créativité, cuisine, lifestyle, coaching",
    fonts: "family=DM+Serif+Display&family=Nunito+Sans:wght@400;600;700",
    heading: "'DM Serif Display', serif",
    body: "'Nunito Sans', sans-serif",
    colors: {
      paper: "#FFFBF6", ink: "#2B1A14", text: "#45302A",
      accent: "#E8553D", accentSoft: "rgba(232,85,61,0.10)", onAccent: "#FFFFFF",
      cover: "linear-gradient(160deg,#FF9A5A,#E8553D 55%,#B8326B)",
      coverInk: "#FFFFFF", coverSub: "#FFE9DC",
      titleBg: "linear-gradient(#FFFFFF,#FFFFFF)",
    },
    layout: { cover: "center", ribbons: false, upper: false },
  },
  studio: {
    id: "studio",
    name: "Studio",
    tagline: "Minimaliste blanc et noir, design éditorial",
    ideal: "Design, tech, photo, productivité, no-code",
    fonts: "family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600",
    heading: "'Space Grotesk', sans-serif",
    body: "'Inter', sans-serif",
    colors: {
      paper: "#FFFFFF", ink: "#0A0A0A", text: "#262626",
      accent: "#111111", accentSoft: "rgba(17,17,17,0.06)", onAccent: "#C6F432",
      cover: "#F4F4F0", coverInk: "#0A0A0A", coverSub: "#555555",
      titleBg: "linear-gradient(#0A0A0A,#0A0A0A)",
    },
    layout: { cover: "left", ribbons: false, upper: true },
  },
};

export function formationFontsImport(ids, withArabic = false) {
  const fams = ids.map((id) => FORMATION_TEMPLATES[id]?.fonts).filter(Boolean).join("&");
  const ar = withArabic ? "&family=Noto+Naskh+Arabic:wght@400;700" : "";
  return `@import url('https://fonts.googleapis.com/css2?${fams}${ar}&display=swap');`;
}

export function formationThemeVars(id, brand = {}) {
  const t = FORMATION_TEMPLATES[id] || FORMATION_TEMPLATES.academy;
  const c = t.colors;
  const accent = brand.accent_color || c.accent;
  let cover = c.cover;
  let coverInk = c.coverInk;
  let coverSub = c.coverSub;
  let titleBg = c.titleBg;
  if (brand.cover_color) {
    const dark = lum(brand.cover_color) < 0.6;
    cover = brand.cover_color;
    coverInk = dark ? "#FFFFFF" : "#1B1B1F";
    coverSub = dark ? "rgba(255,255,255,0.8)" : "rgba(27,27,31,0.75)";
    titleBg = `linear-gradient(${coverInk},${coverInk})`;
  }
  return {
    "--paper": c.paper,
    "--ink": c.ink,
    "--text": c.text,
    "--accent": accent,
    "--accent-soft": brand.accent_color ? alpha(accent, 0.12) : c.accentSoft,
    "--on-accent": brand.accent_color ? (lum(accent) > 0.6 ? "#1B1B1F" : "#FFFFFF") : c.onAccent,
    "--cover-bg": cover,
    "--cover-ink": coverInk,
    "--cover-sub": coverSub,
    "--title-bg": titleBg,
    "--h-font": t.heading,
    "--b-font": t.body,
  };
      }
