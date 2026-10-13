/** Format a kyat price for display, e.g. 10000 → "10,000 Ks". */
export function formatPrice(value: unknown): string {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  const hasDecimals = Math.round(safe * 100) % 100 !== 0;
  return `${safe.toLocaleString("en-US", { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 })} Ks`;
}

/** Days from now until a date (negative when it has passed). */
export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

/** Render "*highlighted*" parts of admin-written titles. */
export function splitHighlight(text: string): { text: string; highlight: boolean }[] {
  return String(text ?? "")
    .split("*")
    .map((part, i) => ({ text: part, highlight: i % 2 === 1 }))
    .filter((p) => p.text.length > 0);
}

/** Colour classes for each order status (labels come from i18n). */
export const STATUS_TONE: Record<string, string> = {
  pending: "bg-pass/15 text-pass",
  awaiting_payment: "bg-info/15 text-info",
  completed: "bg-mint/15 text-mint",
  cancelled: "bg-danger/15 text-danger",
};

/** A stable hue (0–359) for a category name, used for its tile colour. */
export function categoryHue(name: string): number {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return (h + 250) % 360;
}

/** Normalise a category label so "subscription" and "Subscriptions" group together. */
export function categoryKey(name: unknown): string {
  return String(name ?? "").trim().toLowerCase().replace(/s$/, "");
}

/**
 * Products that are packages of the same game/app share the first word of
 * their name, e.g. "Mobile Legend 86 Diamonds" and "Mobile Legend 172 Diamonds".
 */
export function productFamily(p: { name?: unknown; product_type?: unknown }): string {
  const first = String(p?.name ?? "").trim().toLowerCase().split(/[\s\-–(]+/)[0] || "";
  return `${categoryKey(p?.product_type)}::${first}`;
}
