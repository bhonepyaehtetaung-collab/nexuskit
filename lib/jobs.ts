export type ContactLink = { label: string; href: string | null; kind: "telegram" | "phone" | "email" | "link" | "text" };

/**
 * Turn a free-text contact like "09953233153 (Viber) or nick@site.com, @handle"
 * into safe, tappable links. Only telegram, tel:, mailto: and https links are made.
 */
export function contactLinks(contact: string): ContactLink[] {
  const text = String(contact || "").trim();
  const out: ContactLink[] = [];
  const seen = new Set<string>();
  const push = (c: ContactLink) => {
    if (!seen.has(c.label)) {
      seen.add(c.label);
      out.push(c);
    }
  };

  for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) push({ label: m[0], href: `mailto:${m[0]}`, kind: "email" });
  for (const m of text.matchAll(/(?:https?:\/\/)?t\.me\/([A-Za-z0-9_]{4,32})|(?:^|[\s,(])@([A-Za-z0-9_]{4,32})\b/g)) {
    const handle = m[1] || m[2];
    if (handle) push({ label: `@${handle}`, href: `https://t.me/${handle}`, kind: "telegram" });
  }
  for (const m of text.matchAll(/(?:\+?95[\s-]?|0)9[\s-]?\d[\d\s-]{5,12}\d/g)) {
    const digits = m[0].replace(/[\s-]/g, "");
    push({ label: m[0].trim(), href: `tel:${digits}`, kind: "phone" });
  }
  for (const m of text.matchAll(/https:\/\/[^\s,)]+/g)) {
    if (!/t\.me\//.test(m[0])) push({ label: m[0].replace(/^https:\/\//, ""), href: m[0], kind: "link" });
  }
  if (!out.length && text) out.push({ label: text, href: null, kind: "text" });
  return out;
}
