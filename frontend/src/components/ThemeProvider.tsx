"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem("theme") as Theme) || "system";
}

function applyTheme(theme: Theme) {
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    setThemeState(getStoredTheme());
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("theme", t);
    applyTheme(t);
  };

  return { theme, setTheme };
}

export default function ThemeProvider() {
  useEffect(() => {
    const stored = getStoredTheme();
    applyTheme(stored);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function onChange() {
      if (getStoredTheme() === "system") {
        applyTheme("system");
      }
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return null;
}
