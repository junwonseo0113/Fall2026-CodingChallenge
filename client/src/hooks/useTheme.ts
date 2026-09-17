import * as React from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "pinboard_theme";

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

/** Manual light/dark override that beats the OS preference, persisted in localStorage. */
export function useTheme() {
  const [theme, setTheme] = React.useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored ?? (systemPrefersDark() ? "dark" : "light");
  });

  React.useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggle() {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }

  return { theme, toggle };
}
