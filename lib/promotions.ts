// Shared by server and client code: seasonal campaigns and product sorting.
// Prices shown here are for display only — create_order() applies the same
// campaign in the database, so the browser can never choose its own price.
import { categoryKey } from "./format";

export type Campaign = {
  id: string;
  name: string;
  name_en?: string | null;
  tagline?: string | null;
  tagline_en?: string | null;
  emoji?: string | null;
  theme?: CampaignTheme | null;
  discount_percent: number;
  all_products?: boolean;
  product_ids?: string[] | null;
  categories?: string[] | null;
  starts_at: string;
  ends_at: string;
  show_banner?: boolean;
  active?: boolean;
};

export type CampaignTheme = "violet" | "red" | "gold" | "green" | "blue" | "pink";

export const CAMPAIGN_THEMES: Record<CampaignTheme, string> = {
  violet: "linear-gradient(125deg,#7C5CFF 0%,#4B3BD1 55%,#1E1B5E 100%)",
  red: "linear-gradient(125deg,#FF5A5F 0%,#C81D4E 55%,#4A0D2B 100%)",
  gold: "linear-gradient(125deg,#F5B942 0%,#D9822B 55%,#5A2A0C 100%)",
  green: "linear-gradient(125deg,#34D399 0%,#0F9F6E 55%,#073B2C 100%)",
  blue: "linear-gradient(125deg,#4FA8FF 0%,#2563EB 55%,#0C1F5C 100%)",
  pink: "linear-gradient(125deg,#FF7AC6 0%,#C026D3 55%,#3B0A4A 100%)",
};

export type Sale = { name: string; percent: number; ends_at: string };

const time = (v: string) => new Date(v).getTime();

/** Campaigns running at `now` (the database already hides others from shoppers). */
export function liveCampaigns(campaigns: Campaign[] | null | undefined, now = Date.now()): Campaign[] {
  return (campaigns || []).filter((c) => c.active !== false && time(c.starts_at) <= now && now < time(c.ends_at));
}

/** Best running campaign for one product — the same rule as campaign_for() in SQL. */
export function campaignFor(product: any, campaigns: Campaign[]): Campaign | null {
  const id = String(product?.id ?? "");
  const key = categoryKey(product?.product_type);
  let best: Campaign | null = null;
  for (const c of campaigns) {
    const hit = c.all_products || (c.product_ids || []).includes(id) || (!!key && (c.categories || []).includes(key));
    if (hit && (!best || Number(c.discount_percent) > Number(best.discount_percent))) best = c;
  }
  return best;
}

/**
 * Products with their sale price: `price` becomes the campaign price, the
 * original is kept in `list_price`, and `sale` describes the campaign.
 */
export function withCampaignPrices<T extends Record<string, any>>(products: T[], campaigns: Campaign[] | null | undefined, now = Date.now()): T[] {
  const live = liveCampaigns(campaigns, now);
  if (!live.length) return products;
  return products.map((p) => {
    const c = campaignFor(p, live);
    if (!c || p.price === null || p.price === undefined) return p;
    const pct = Math.min(90, Math.max(0, Number(c.discount_percent) || 0));
    const list = Number(p.price) || 0;
    // Same rounding as the database: round(price * (100 - pct) / 100, 2)
    const price = Math.round(list * (100 - pct)) / 100;
    const sale: Sale = { name: c.name, percent: pct, ends_at: c.ends_at };
    return { ...p, price, list_price: list, sale };
  });
}

/* ------------------------------------------------------------------ */
/* Sorting                                                             */
/* ------------------------------------------------------------------ */

export type ProductSort = "recommended" | "popular" | "new" | "price-asc" | "price-desc";
export const PRODUCT_SORTS: ProductSort[] = ["recommended", "popular", "new", "price-asc", "price-desc"];

const created = (p: any) => (p?.created_at ? time(p.created_at) : 0);
const ordered = (p: any) => (typeof p?.sort_order === "number" ? p.sort_order : Number.POSITIVE_INFINITY);

/** Admin order first (Products → ↑↓), then newest. */
export function byRecommended(a: any, b: any) {
  const d = ordered(a) - ordered(b);
  if (d !== 0 && isFinite(d)) return d;
  if (isFinite(ordered(a)) !== isFinite(ordered(b))) return isFinite(ordered(a)) ? -1 : 1;
  return created(b) - created(a);
}

/** Sort a copy of `list`. `popular` is a list of product ids, best seller first. */
export function sortProducts<T>(list: T[], sort: ProductSort, popular: string[] = []): T[] {
  const out = [...list];
  if (sort === "price-asc") return out.sort((a: any, b: any) => Number(a.price) - Number(b.price) || byRecommended(a, b));
  if (sort === "price-desc") return out.sort((a: any, b: any) => Number(b.price) - Number(a.price) || byRecommended(a, b));
  if (sort === "new") return out.sort((a: any, b: any) => created(b) - created(a));
  if (sort === "popular") {
    const rank = new Map(popular.map((id, i) => [String(id), i]));
    const r = (p: any) => rank.get(String(p.id)) ?? Number.POSITIVE_INFINITY;
    return out.sort((a: any, b: any) => {
      const ra = r(a);
      const rb = r(b);
      if (ra !== rb) return ra < rb ? -1 : 1;
      return byRecommended(a, b);
    });
  }
  return out.sort(byRecommended);
}
