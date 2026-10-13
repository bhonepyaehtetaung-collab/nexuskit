// Shared by server and client code.

/** Add display prices to bundles (the database recalculates them at checkout). */
export function withBundlePrices(bundles: any[], products: any[]) {
  const byId = new Map(products.map((p) => [String(p.id), p]));
  return bundles
    .map((b) => {
      const items = (b.product_ids || []).map((id: string) => byId.get(String(id))).filter(Boolean);
      const original = items.reduce((n: number, p: any) => n + Number(p.price || 0), 0);
      const pct = Math.min(90, Math.max(0, Number(b.discount_percent) || 0));
      const price = items.reduce((n: number, p: any) => n + Math.round(Number(p.price || 0) * (100 - pct)) / 100, 0);
      const fields = Array.from(new Set(items.flatMap((p: any) => (Array.isArray(p.required_fields) ? p.required_fields : []))));
      return { ...b, items, original, price, discount: pct, required_fields: fields };
    })
    .filter((b) => b.items.length >= 2 && b.items.length === (b.product_ids || []).length);
}

/** Turn a priced bundle into a cart line. */
export function bundleCartItem(b: any) {
  return {
    id: `bundle:${b.id}`,
    kind: "bundle",
    bundle_id: b.id,
    name: b.name,
    price: b.price,
    image: b.image || b.items?.[0]?.image || null,
    product_type: "Toolkit",
    required_fields: b.required_fields || [],
  };
}
