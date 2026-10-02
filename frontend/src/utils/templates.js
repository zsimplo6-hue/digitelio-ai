const hexToRgb = (hex) => [0, 2, 4].map((i) => parseInt(hex.replace("#", "").slice(i, i + 2), 16));
const lum = (hex) => {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
const alpha = (hex, a) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

export const TEMPLATE_ORDER = ["business", "finance", "wellness", "growth", "spirit", "cuisine"];

export const LANGUAGES = [
  { id: "fr", label: "Français" },
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "pt", label: "Português" },
  { id: "de", label: "Deutsch" },
  { id: "it", label: "Italiano" },
  { id: "ar", label: "العربية (arabe)" },
];

export const TEMPLATES = {
  business: {
    id: "business",
    name: "Business",
    tagline: "Sobre, net, professionnel",
    ideal: "Entrepreneuriat, marketing, vente, carrière",
    fonts: "family=Montserrat:wght@500;700;800&family=Inter:wght@400;500;600",
    heading: "'Montserrat', sans-serif",
    body: "'Inter', sans-serif",
    colors: {
      paper: "#FFFFFF", ink: "#0B1F3A", text: "#1F2A3D",
      accent: "#2F6FED", accentSoft: "rgba(47,111,237,0.10)", onAccent: "#FFFFFF",
      cover: "linear-gradient(160deg,#0B1F3A,#12305C)", coverInk: "#FFFFFF", coverSub: "#B9CCF5",
      titleBg: "linear-gradient(#FFFFFF,#FFFFFF)",
    },
    layout: { cover: "left", ribbons: false, upper: true, align: "left", chapter: "badge" },
  },
  finance: {
    id: "finance",
    name: "Finance",
    tagline: "Noir et or, prestige",
    ideal: "Argent, investissement, épargne, crypto",
    fonts: "family=Cinzel:wght@400;600;700&family=Inter:wght@400;500&family=Manrope:wght@300;600;700",
    heading: "'Cinzel', serif",
    body: "'Inter', sans-serif",
    colors: {
      paper: "#F5F5F2", ink: "#0B0B0B", text: "#222222",
      accent: "#D4AF37", accentSoft: "rgba(212,175,55,0.12)", onAccent: "#0B0B0B",
      cover: "#0B0B0B", coverInk: "#F5F0E1", coverSub: "#FFFFFF",
      titleBg: "linear-gradient(180deg,#F6E27A 0%,#D4AF37 50%,#8C6D1F 100%)",
    },
    layout: { cover: "center", ribbons: true, upper: true, align: "justify", chapter: "big" },
  },
  wellness: {
    id: "wellness",
    name: "Bien-être",
    tagline: "Doux, naturel, apaisant",
    ideal: "Santé, yoga, nutrition, sommeil, équilibre",
    fonts: "family=Cormorant+Garamond:wght@500;600;700&family=Lato:wght@400;700",
    heading: "'Cormorant Garamond', serif",
    body: "'Lato', sans-serif",
    colors: {
      paper: "#FBF8F3", ink: "#2F3E34", text: "#3A4A3F",
      accent: "#7FA38A", accentSoft: "rgba(127,163,138,0.16)", onAccent: "#1F2D24",
      cover: "linear-gradient(170deg,#E8F0E6,#CFE0D3)", coverInk: "#2F3E34", coverSub: "#5C7A66",
      titleBg: "linear-gradient(#2F3E34,#2F3E34)",
    },
    layout: { cover: "frame", ribbons: false, upper: false, align: "left", chapter: "badge" },
  },
  growth: {
    id: "growth",
    name: "Développement personnel",
    tagline: "Énergique, motivant",
    ideal: "Confiance en soi, habitudes, productivité, mindset",
    fonts: "family=Poppins:wght@500;600;700&family=Open+Sans:wght@400;600",
    heading: "'Poppins', sans-serif",
    body: "'Open Sans', sans-serif",
    colors: {
      paper: "#FFFFFF", ink: "#1B1B1F", text: "#2A2A2F",
      accent: "#FF6B35", accentSoft: "rgba(255,107,53,0.10)", onAccent: "#FFFFFF",
      cover: "linear-gradient(145deg,#FF6B35,#F7931E)", coverInk: "#FFFFFF", coverSub: "#FFF1E6",
      titleBg: "linear-gradient(#FFFFFF,#FFFFFF)",
    },
    layout: { cover: "left", ribbons: false, upper: true, align: "left", chapter: "big" },
  },
  spirit: {
    id: "spirit",
    name: "Spiritualité",
    tagline: "Profond, serein, élégant",
    ideal: "Méditation, foi, sagesse, introspection",
    fonts: "family=Marcellus&family=Lora:wght@400;500;600",
    heading: "'Marcellus', serif",
    body: "'Lora', serif",
    colors: {
      paper: "#FAF8FF", ink: "#231A4A", text: "#2E2557",
      accent: "#C6A55C", accentSoft: "rgba(198,165,92,0.14)", onAccent: "#231A4A",
      cover: "linear-gradient(160deg,#1E1450,#3B2A7A)", coverInk: "#F3EEFF", coverSub: "#CFC3F5",
      titleBg: "linear-gradient(180deg,#F3E2A9,#C6A55C)",
    },
    layout: { cover: "frame", ribbons: false, upper: false, align: "justify", chapter: "small" },
  },
  cuisine: {
    id: "cuisine",
    name: "Cuisine",
    tagline: "Chaleureux, gourmand",
    ideal: "Recettes, pâtisserie, cuisine du monde, nutrition",
    fonts: "family=Playfair+Display:wght@500;700&family=Nunito:wght@400;600;700",
    heading: "'Playfair Display', serif",
    body: "'Nunito', sans-serif",
    colors: {
      paper: "#FFFBF5", ink: "#3B2417", text: "#4A3225",
      accent: "#C65D3B", accentSoft: "rgba(198,93,59,0.10)", onAccent: "#FFFFFF",
      cover: "linear-gradient(160deg,#F3E3CE,#E9CDAA)", coverInk: "#3B2417", coverSub: "#8A5A3C",
      titleBg: "linear-gradient(#7A2E17,#7A2E17)",
    },
    layout: { cover: "center", ribbons: false, upper: false, align: "left", chapter: "small" },
  },
};

export function fontsImport(ids) {
  const fams = ids.map((id) => TEMPLATES[id]?.fonts).filter(Boolean).join("&");
  return `@import url('https://fonts.googleapis.com/css2?${fams}&display=swap');`;
}

/* Variables CSS d'un modèle, avec le kit de marque par-dessus */
export function themeVars(id, brand = {}) {
  const t = TEMPLATES[id] || TEMPLATES.finance;
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
    "--p-align": t.layout.align === "justify" ? "justify" : "left",
  };
      }
