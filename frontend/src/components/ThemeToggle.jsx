import { useTheme } from "../context/ThemeContext.jsx";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label="Changer de thème"
      className="relative flex h-9 w-16 items-center rounded-full border border-digi-navy/10 bg-digi-navy/5 px-1 transition-colors dark:border-white/15 dark:bg-white/10"
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full bg-digi-gradient text-xs text-white shadow-digi-glow transition-transform duration-300 ${
          isDark ? "translate-x-7" : "translate-x-0"
        }`}
      >
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}

