// Digitelio AI — preset Tailwind (additif).
// Usage dans frontend/tailwind.config.js :
//   import digitelio from './tailwind.digitelio.preset.js'
//   export default { presets: [digitelio], /* ...config existante inchangée... */ }
// Les tokens sont AJOUTÉS (extend) : aucune classe Tailwind existante ne change.

export default {
  theme: {
    extend: {
      colors: {
        dg: {
          blue: '#3B82F6',
          indigo: '#5B6CF6',
          violet: '#8B5CF6',
          gold: '#D4AF37',
          navy: { 950: '#070C26', 900: '#0B1233', 800: '#111A47', 700: '#1B2661' },
          bg: '#F6F7FE',
          border: '#E4E8F5',
          ink: '#0F1636',
          muted: '#56608A',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      borderRadius: { 'dg-md': '12px', 'dg-lg': '16px', 'dg-xl': '20px' },
      boxShadow: {
        'dg-md': '0 8px 24px -10px rgba(59,74,180,.16)',
        'dg-lg': '0 18px 40px -16px rgba(59,74,180,.28)',
        'dg-glow': '0 10px 28px -10px rgba(109,93,246,.6)',
      },
      backgroundImage: {
        'dg-brand': 'linear-gradient(135deg,#3B82F6 0%,#5B6CF6 45%,#8B5CF6 100%)',
        'dg-gold': 'linear-gradient(135deg,#F5D76E 0%,#D4AF37 100%)',
        'dg-navy': 'linear-gradient(135deg,#0B1233 0%,#17226B 100%)',
      },
    },
  },
};
