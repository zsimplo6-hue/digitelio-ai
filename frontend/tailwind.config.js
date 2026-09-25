/** @type {import('tailwindcss').Config} */
import digitelio from "./tailwind.digitelio.preset.js";

export default {
  presets: [digitelio],
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "digi-navy": "#0B0F2E",
        "digi-blue": "#3B82F6",
        "digi-purple": "#8B5CF6",
        "digi-white": "#FFFFFF",
      },
      fontFamily: {
        sans: ["Poppins", "sans-serif"],
      },
      backgroundImage: {
        "digi-gradient": "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
        "digi-gradient-radial":
          "radial-gradient(circle at top left, rgba(59,130,246,0.25), transparent 55%), radial-gradient(circle at bottom right, rgba(139,92,246,0.25), transparent 55%)",
      },
      boxShadow: {
        "digi-glow": "0 0 40px rgba(139, 92, 246, 0.25)",
      },
    },
  },
  plugins: [],
};
