"use client";

const THEME_STORAGE_KEY = "elps-j:theme";

export default function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement;
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";

    root.dataset.theme = nextTheme;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (error) {
      console.error("表示テーマを保存できませんでした。", error);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="白背景と黒背景を切り替える"
      className="theme-toggle min-h-11 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-500"
    >
      <span className="theme-light-only" aria-hidden="true">
        ◐ 黒背景
      </span>
      <span className="theme-dark-only" aria-hidden="true">
        ☀ 白背景
      </span>
    </button>
  );
}
