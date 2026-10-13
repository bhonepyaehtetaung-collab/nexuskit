import { categoryKey } from "./format";

export type Category = { name: string; key: string; image: string | null; count: number };

/** Group products into categories (admin categories first, then any extra product types). */
export function buildCategories(products: any[], categoryRows: { name: string }[] = []) {
  const map = new Map<string, Category>();
  for (const row of categoryRows) {
    const key = categoryKey(row.name);
    if (key && !map.has(key)) map.set(key, { name: row.name, key, image: null, count: 0 });
  }
  for (const p of products) {
    const key = categoryKey(p.product_type);
    if (!key) continue;
    const entry = map.get(key) ?? { name: String(p.product_type), key, image: null, count: 0 };
    entry.count += 1;
    if (!entry.image && p.image) entry.image = p.image;
    map.set(key, entry);
  }
  return Array.from(map.values()).filter((c) => c.count > 0);
}
