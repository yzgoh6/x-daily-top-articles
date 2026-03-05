"use client";

import { useEffect } from "react";

export default function ThemeProvider() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function apply() {
      document.documentElement.classList.toggle("dark", mq.matches);
    }
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return null;
}
