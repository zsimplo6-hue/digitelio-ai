export const MAX_PRICE = 100000000;

/* Doit rester identique à la liste du Worker (routes/publish.js) */
export const CURRENCIES = [
  { code: "EUR", symbol: "€", label: "Euro (€)", presets: [19, 49, 99] },
  { code: "USD", symbol: "$", label: "Dollar américain ($)", presets: [19, 49, 99] },
  { code: "XOF", symbol: "FCFA", label: "Franc CFA – Afrique de l'Ouest (FCFA)", presets: [10000, 25000, 50000] },
  { code: "XAF", symbol: "FCFA", label: "Franc CFA – Afrique centrale (FCFA)", presets: [10000, 25000, 50000] },
  { code: "GBP", symbol: "£", label: "Livre sterling (£)", presets: [19, 49, 99] },
  { code: "CAD", symbol: "CA$", label: "Dollar canadien (CA$)", presets: [25, 65, 129] },
  { code: "CHF", symbol: "CHF", label: "Franc suisse (CHF)", presets: [19, 49, 99] },
  { code: "MAD", symbol: "DH", label: "Dirham marocain (DH)", presets: [199, 499, 990] },
  { code: "DZD", symbol: "DA", label: "Dinar algérien (DA)", presets: [2500, 6000, 12000] },
  { code: "TND", symbol: "DT", label: "Dinar tunisien (DT)", presets: [59, 149, 299] },
  { code: "NGN", symbol: "₦", label: "Naira nigérian (₦)", presets: [15000, 35000, 75000] },
  { code: "GHS", symbol: "GH₵", label: "Cedi ghanéen (GH₵)", presets: [250, 600, 1200] },
  { code: "KES", symbol: "KSh", label: "Shilling kenyan (KSh)", presets: [2500, 6500, 13000] },
  { code: "ZAR", symbol: "R", label: "Rand sud-africain (R)", presets: [350, 900, 1800] },
  { code: "GNF", symbol: "GNF", label: "Franc guinéen (GNF)", presets: [200000, 500000, 1000000] },
  { code: "CDF", symbol: "FC", label: "Franc congolais (FC)", presets: [50000, 125000, 250000] },
];

export function currencyOf(code) {
  return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
}

/* 49 → "49 €"   25000 → "25 000 FCFA"   0 → "Gratuit" */
export function formatPrice(price, code) {
  if (price === null || price === undefined || price === "") return "";
  const n = Number(price);
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "Gratuit";
  return `${n.toLocaleString("fr-FR")} ${currencyOf(code).symbol}`;
}

/* Dernière monnaie utilisée : proposée par défaut aux nouvelles formations */
const KEY = "digitelio_currency";

export function getDefaultCurrency() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && CURRENCIES.some((c) => c.code === saved)) return saved;
  } catch {
    /* ignoré */
  }
  return "EUR";
}

export function saveDefaultCurrency(code) {
  try {
    localStorage.setItem(KEY, code);
  } catch {
    /* ignoré */
  }
  }
