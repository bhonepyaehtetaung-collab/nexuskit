"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { recentSearches, rememberSearch, useCatalog } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { ProductArt } from "./ProductCard";
import { ClockIcon, CloseIcon, SearchIcon } from "./icons";

/** Full-screen instant search across every product. */
export default function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const { data } = useCatalog();
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setRecent(recentSearches());
    const id = setTimeout(() => input.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(id);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!data) return [];
    if (!term) return data.products.slice(0, 6);
    const words = term.split(/\s+/);
    return data.products
      .filter((p) => {
        const hay = `${p.name ?? ""} ${p.product_type ?? ""} ${p.description ?? ""}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 20);
  }, [q, data]);

  if (!open) return null;

  const pick = () => {
    rememberSearch(q);
    onClose();
    setQ("");
  };

  return (
    <div className="fixed inset-0 z-[70] flex animate-fade-in flex-col bg-ink/95 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={t("nav.search")}>
      <div className="container-page flex items-center gap-2 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3">
        <label className="relative flex-1">
          <span className="sr-only">{t("nav.search")}</span>
          <SearchIcon size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            ref={input}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && rememberSearch(q)}
            placeholder={t("search.placeholder")}
            className="field h-12 rounded-2xl pl-12 text-base"
          />
        </label>
        <button type="button" onClick={onClose} className="btn-quiet h-12 w-12 p-0" aria-label={t("search.close")}>
          <CloseIcon size={22} />
        </button>
      </div>

      <div className="container-page flex-1 overflow-y-auto pb-10">
        {!q && recent.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-sm text-muted">{t("search.recent")}</p>
            <div className="flex flex-wrap gap-2">
              {recent.map((r) => (
                <button key={r} type="button" className="chip" onClick={() => setQ(r)}>
                  <ClockIcon size={14} /> {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {!q && <p className="mb-2 text-sm text-muted">{t("search.popular")}</p>}

        {q && results.length === 0 ? (
          <p className="py-12 text-center text-muted">{t("search.none", { q })}</p>
        ) : (
          <ul className="divide-y divide-line">
            {results.map((p) => (
              <li key={p.id}>
                <Link href={`/products/${p.id}`} onClick={pick} className="flex items-center gap-3 rounded-xl py-3 transition-colors hover:bg-surface">
                  <span className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-raised">
                    <ProductArt product={p} className="text-base" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 font-medium">{p.name}</span>
                    <span className="text-xs text-muted">{p.product_type}</span>
                  </span>
                  <span className="price text-sm">{formatPrice(p.price)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
