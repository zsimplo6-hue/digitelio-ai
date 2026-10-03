const hexToRgb = (hex) => [0, 2, 4].map((i) => parseInt(hex.replace("#", "").slice(i, i + 2), 16));
const lum = (hex) => {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
const alpha = (hex, a) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

export const FORMATION_ORDER = ["noir", "aurora", "bordeaux", "ivoire", "neon", "ocean"];

export const FORMATION_TEMPLATES = {
  noir: {
    id: "noir",
    name: "Black Label",
    tagline: "Noir absolu et champagne, luxe discret",
    ideal: "Formations haut de gamme, finance, investissement, mentoring",
    fonts: "family=Bodoni+Moda:wght@500;700&family=Jost:wght@400;500;600",
    heading: "'Bodoni Moda', serif",
    body: "'Jost', sans-serif",
    colors: {
      paper: "#FBFAF7", ink: "#0A0A0A", text: "#252525",
      accent: "#B89B66", onAccent: "#0A0A0A",
      cover: "radial-gradient(circle at 70% 10%,#1d1a15,#060606 70%)",
      coverInk: "#F4EEE2", coverSub: "#CDB68A",
      titleBg: "linear-gradient(180deg,#F3E7C9 0%,#CDB68A 55%,#8E7A55 100%)",
    },
    layout: { cover: "center", ribbons: true, upper: true },
  },
  aurora: {
    id: "aurora",
    name: "Aurora",
    tagline: "Bleu nuit et turquoise lumineux, tech et avenir",
    ideal: "IA, no-code, technologie, marketing digital, data",
    fonts: "family=Outfit:wght@400;600;700;800&family=Space+Grotesk:wght@400;500;700",
    heading: "'Outfit', sans-serif",
    body: "'Space Grotesk', sans-serif",
    colors: {
      paper: "#FFFFFF", ink: "#06182B", text: "#1C2E40",
      accent: "#0FA899", onAccent: "#FFFFFF",
      cover: "linear-gradient(150deg,#070B1F,#0B2C45 55%,#0E5C63)",
      coverInk: "#FFFFFF", coverSub: "#9FE8DA",
      titleBg: "linear-gradient(#FFFFFF,#BFFAF0)",
    },
    layout: { cover: "left", ribbons: false, upper: false },
  },
  bordeaux: {
    id: "bordeaux",
    name: "Bordeaux Royal",
    tagline: "Bordeaux profond et or, élégance classique",
    ideal: "Business, leadership, droit, immobilier, carrière",
    fonts: "family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;600;700",
    heading: "'Libre Baskerville', serif",
    body: "'Source Sans 3', sans-serif",
    colors: {
      paper: "#FFFBF7", ink: "#2B0713", text: "#40222B",
      accent: "#B5822A", onAccent: "#FFFFFF",
      cover: "linear-gradient(160deg,#2B0713,#5E1228 60%,#7A1B35)",
      coverInk: "#FBEFE3", coverSub: "#E6C27A",
      titleBg: "linear-gradient(#F7E3B0,#E6C27A)",
    },
    layout: { cover: "frame", ribbons: false, upper: true },
  },
  ivoire: {
    id: "ivoire",
    name: "Ivoire Éditorial",
    tagline: "Papier ivoire et terracotta, style magazine",
    ideal: "Design, créativité, photo, artisanat, lifestyle",
    fonts: "family=Fraunces:wght@600;700&family=DM+Sans:wght@400;500;700",
    heading: "'Fraunces', serif",
    body: "'DM Sans', sans-serif",
    colors: {
      paper: "#FFFFFF", ink: "#1A1A1A", text: "#2E2E2E",
      accent: "#B3472A", onAccent: "#FFFFFF",
      cover: "#F2ECDF", coverInk: "#1A1A1A", coverSub: "#6B5E4E",
      titleBg: "linear-gradient(#1A1A1A,#1A1A1A)",
    },
    layout: { cover: "left", ribbons: false, upper: false },
  },
  neon: {
    id: "neon",
    name: "Néon Pulse",
    tagline: "Nuit violette et néon, énergie créateur",
    ideal: "Réseaux sociaux, création de contenu, e-commerce, jeunes publics",
    fonts: "family=Syne:wght@600;700;800&family=Inter:wght@400;500;600",
    heading: "'Syne', sans-serif",
    body: "'Inter', sans-serif",
    colors: {
      paper: "#FFFFFF", ink: "#150B26", text: "#2C2140",
      accent: "#C026D3", onAccent: "#FFFFFF",
      cover: "linear-gradient(145deg,#0B0B12,#17102B 60%,#2A0F3F)",
      coverInk: "#FFFFFF", coverSub: "#D9B3FF",
      titleBg: "linear-gradient(90deg,#C6F432,#6EF3C5)",
    },
    layout: { cover: "left", ribbons: true, upper: true },
  },
  ocean: {
    id: "ocean",
    name: "Océan",
    tagline: "Bleu profond et corail, confiance et sérénité",
    ideal: "Santé, coaching, langues, éducation, développement personnel",
    fonts: "family=Raleway:wght@500;700;800&family=Nunito+Sans:wght@400;600;700",
    heading: "'Raleway', sans-serif",
    body: "'Nunito Sans', sans-serif",
    colors: {
      paper: "#F7FCFD", ink: "#05202C", text: "#1D3A47",
      accent: "#E8603A", onAccent: "#FFFFFF",
      cover: "linear-gradient(160deg,#03212F,#06506B 60%,#0A7A8F)",
      coverInk: "#FFFFFF", coverSub: "#BDE9F0",
      titleBg: "linear-gradient(#FFFFFF,#BDE9F0)",
    },
    layout: { cover: "center", ribbons: false, upper: false },
  },
};

/* Ancien identifiant, gardé pour ne rien casser */
FORMATION_TEMPLATES.academy = FORMATION_TEMPLATES.noir;

export function formationFontsImport(ids, withArabic = false) {
  const fams = ids.map((id) => FORMATION_TEMPLATES[id]?.fonts).filter(Boolean).join("&");
  const ar = withArabic ? "&family=Noto+Naskh+Arabic:wght@400;700" : "";
  return `@import url('https://fonts.googleapis.com/css2?${fams}${ar}&display=swap');`;
}

export function formationThemeVars(id, brand = {}) {
  const t = FORMATION_TEMPLATES[id] || FORMATION_TEMPLATES.noir;
  const c = t.colors;
  const brandAccent = brand.accent_color && lum(brand.accent_color) < 0.85 ? brand.accent_color : "";
  const accent = brandAccent || c.accent;
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
    "--accent-soft": alpha(accent, 0.17),
    "--accent-head": alpha(accent, 0.32),
    "--on-accent": brandAccent ? (lum(accent) > 0.6 ? "#1B1B1F" : "#FFFFFF") : c.onAccent,
    "--cover-bg": cover,
    "--cover-ink": coverInk,
    "--cover-sub": coverSub,
    "--title-bg": titleBg,
    "--h-font": t.heading,
    "--b-font": t.body,
  };
      }
