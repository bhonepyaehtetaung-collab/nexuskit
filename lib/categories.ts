import { categoryKey } from "./format";

export type Category = {
  name: string;
  key: string;
  image: string | null;
  count: number;
  /** Customer-facing names set in Admin → Storefront (fallback: name). */
  labels?: { my?: string | null; en?: string | null };
};

type CategoryRow = { name: string; label_my?: string | null; label_en?: string | null; image?: string | null; sort_order?: number | null; hidden?: boolean | null };

/** Category name to show for the current language. */
export const categoryLabel = (c: Category, lang: "my" | "en") => c.labels?.[lang]?.trim() || c.name;

/** Group products into categories (admin categories first, in their order; hidden ones left out). */
export function buildCategories(products: any[], categoryRows: CategoryRow[] = []) {
  const rows = [...categoryRows].sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
  const hidden = new Set<string>();
  const map = new Map<string, Category>();
  for (const row of rows) {
    const key = categoryKey(row.name);
    if (!key || map.has(key)) continue;
    if (row.hidden) {
      hidden.add(key);
      continue;
    }
    map.set(key, { name: row.name, key, image: row.image || null, count: 0, labels: { my: row.label_my, en: row.label_en } });
  }
  for (const p of products) {
    const key = categoryKey(p.product_type);
    if (!key || hidden.has(key)) continue;
    const entry = map.get(key) ?? { name: String(p.product_type), key, image: null, count: 0 };
    entry.count += 1;
    if (!entry.image && p.image) entry.image = p.image;
    map.set(key, entry);
  }
  return Array.from(map.values()).filter((c) => c.count > 0);
}
