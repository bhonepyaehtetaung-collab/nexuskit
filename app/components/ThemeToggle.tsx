"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { THEME_KEY } from "@/lib/theme";

type Theme = "light" | "dark";
const KEY = THEME_KEY;
const BAR = { dark: "#0D1120", light: "#F4F5FA" };


function current(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function paintBar(theme: Theme) {
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", BAR[theme]));
}

/** ☀ / ☾ switch. Follows the phone's setting until the shopper picks one. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { t } = useT();
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const now = current();
    setTheme(now);
    paintBar(now);
  }, []);

  const flip = () => {
    const next: Theme = (theme ?? current()) === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* storage blocked: still switches for this visit */
    }
    paintBar(next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={flip}
      className={`grid w-10 place-items-center rounded-xl bg-raised text-text transition-colors hover:bg-line ${className}`}
      aria-label={theme === "light" ? t("theme.toDark") : t("theme.toLight")}
      title={theme === "light" ? t("theme.toDark") : t("theme.toLight")}
    >
      {theme === "light" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}
