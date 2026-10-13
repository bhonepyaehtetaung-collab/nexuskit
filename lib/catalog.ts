"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { buildCategories, type Category } from "./categories";
import { withBundlePrices, bundleCartItem } from "./bundles";

export { buildCategories };
export { withBundlePrices, bundleCartItem };

export type Catalog = {
  products: any[];
  categories: Category[];
  settings: any;
  paymentMethods: any[];
  bundles: any[];
};

let cache: Promise<Catalog> | null = null;

/** Load products, categories and settings once per page load (shared by search, shop, etc.). */
export function loadCatalog(): Promise<Catalog> {
  if (!cache) {
    const supabase = createClient();
    cache = Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("product_categories").select("name").order("created_at", { ascending: true }),
      supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("payment_methods").select("id, provider_name"),
      supabase.from("bundles").select("*").eq("active", true).order("created_at", { ascending: false }),
    ]).then(([p, c, s, m, b]) => {
      if (p.error) {
        cache = null;
        throw p.error;
      }
      const products = p.data || [];
      return {
        products,
        categories: buildCategories(products, c.data || []),
        settings: s.data || {},
        paymentMethods: m.data || [],
        bundles: b.error ? [] : withBundlePrices(b.data || [], products),
      };
    });
  }
  return cache;
}

export function useCatalog() {
  const [data, setData] = useState<Catalog | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    loadCatalog()
      .then((d) => alive && setData(d))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);
  return { data, error, loading: !data && !error };
}

/* ------------------------------------------------------------------ */
/* Remember what the customer typed (Player ID etc.) on this device    */
/* ------------------------------------------------------------------ */
const FIELDS_KEY = "nk_fields";
const SEARCH_KEY = "nk_recent_search";

export function rememberedFields(): Record<string, string> {
  try {
    const v = JSON.parse(localStorage.getItem(FIELDS_KEY) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function rememberFields(fields: Record<string, string>) {
  try {
    localStorage.setItem(FIELDS_KEY, JSON.stringify({ ...rememberedFields(), ...fields }));
  } catch {
    /* storage blocked */
  }
}

export function recentSearches(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SEARCH_KEY) || "[]");
    return Array.isArray(v) ? v.slice(0, 6) : [];
  } catch {
    return [];
  }
}

export function rememberSearch(q: string) {
  const term = q.trim();
  if (!term) return;
  try {
    const next = [term, ...recentSearches().filter((s) => s.toLowerCase() !== term.toLowerCase())].slice(0, 6);
    localStorage.setItem(SEARCH_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked */
  }
}
