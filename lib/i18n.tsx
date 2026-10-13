"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import { LANG_COOKIE, type Lang } from "./lang";
import { translate, type TextOverrides, type TKey } from "./dict";

export { translate };
export type { TKey };

export type { Lang };

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: TKey, vars?: Record<string, string | number>) => string };
const LangContext = createContext<Ctx | null>(null);

export function LangProvider({ initialLang, overrides, children }: { initialLang: Lang; overrides?: TextOverrides; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = l;
    } catch {
      /* ignore */
    }
  }, []);
  const t = useCallback((key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars, overrides), [lang, overrides]);
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useT() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useT must be used inside LangProvider");
  return ctx;
}

export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useT();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        setLang(lang === "my" ? "en" : "my");
        router.refresh(); // re-render server pages in the new language
      }}
      className={`rounded-xl bg-raised px-3 text-xs font-semibold text-text transition-colors hover:bg-line ${className}`}
      aria-label={lang === "my" ? "Switch to English" : "မြန်မာဘာသာသို့ ပြောင်းရန်"}
    >
      {t("lang.switch")}
    </button>
  );
}
