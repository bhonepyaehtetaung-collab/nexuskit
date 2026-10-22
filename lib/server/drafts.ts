// Server-side only. Creates AI drafts and sends them to the owner's Telegram.
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { draftCoverSvg, draftJob, draftJobsFromWeb, draftNews, extractProducts, type AiImage, type PricingRules } from "./ai";
import { escapeHtml } from "./telegram";

export type DraftKind = "products" | "job" | "jobs_web" | "news";
/** `model`/`count` are set by the daily schedule (cheaper model, 5 each). */
export type DraftInput = { kind: DraftKind; text?: string; images?: AiImage[]; topic?: string; model?: string; count?: number };
export type Origin = "dashboard" | "telegram";

const DEFAULT_RULES: PricingRules = { markup_percent: 20, round_to: 100 };

/** Ask the AI, then save its suggestions as pending drafts. Returns the saved rows. */
export async function createDrafts(db: SupabaseClient, input: DraftInput, origin: Origin): Promise<any[]> {
  const text = (input.text || "").trim();
  let rows: any[] = [];

  if (input.kind === "products") {
    const [cats, fields, rules, products] = await Promise.all([
      db.from("product_categories").select("name, has_subscription"),
      db.from("customer_info_fields").select("label"),
      db.from("pricing_rules").select("*").eq("id", 1).maybeSingle(),
      db.from("products").select("name"),
    ]);
    const items = await extractProducts({
      text,
      images: input.images,
      categories: cats.data || [],
      fields: (fields.data || []).map((f: any) => f.label),
      existing: (products.data || []).map((p: any) => p.name),
      rules: (rules.data as PricingRules) || DEFAULT_RULES,
    });
    rows = items.map((p) => ({
      kind: "product",
      origin,
      cost: p.cost,
      note: p.note || null,
      source: text.slice(0, 8000) || null,
      data: {
        name: p.name,
        price: p.price,
        product_type: p.product_type,
        subscription_days: p.subscription_days,
        required_fields: p.required_fields,
        description: p.description,
        currency: p.currency,
      },
    }));
  } else if (input.kind === "job") {
    const j = await draftJob({ text, images: input.images });
    rows = [{
      kind: "job",
      origin,
      note: j.note || null,
      source: text.slice(0, 8000) || null,
      data: { kind: j.kind, title: j.title, description: j.description, category: j.category, budget: j.budget, contact: j.contact },
    }];
  } else if (input.kind === "jobs_web") {
    const [jobs, pending] = await Promise.all([
      db.from("jobs").select("title").order("created_at", { ascending: false }).limit(60),
      db.from("ai_drafts").select("data").eq("kind", "job").in("status", ["pending", "rejected"]).order("created_at", { ascending: false }).limit(60),
    ]);
    const found = await draftJobsFromWeb({
      count: input.count || 5,
      model: input.model,
      focus: input.topic || text || undefined,
      existingTitles: [...(jobs.data || []).map((j: any) => j.title), ...(pending.data || []).map((d: any) => d.data?.title)].filter(Boolean),
    });
    rows = found.map((j) => ({
      kind: "job",
      origin,
      note: "🌐 Web က တကယ့်အလုပ်ခေါ်စာ — Source link ကို ဖွင့်စစ်ပြီးမှ ✅ နှိပ်ပါ။",
      sources: [{ url: j.source_url, title: j.source_title }],
      source: input.topic || null,
      data: { kind: j.kind, title: j.title, description: j.description, category: j.category, budget: j.budget, contact: j.contact },
    }));
  } else {
    const [products, posts] = await Promise.all([
      db.from("products").select("name").limit(200),
      db.from("posts").select("title").order("created_at", { ascending: false }).limit(40),
    ]);
    const pending = await db.from("ai_drafts").select("data").eq("kind", "post").eq("status", "pending").limit(40);
    const news = await draftNews({
      topic: input.topic || text,
      count: input.count,
      model: input.model,
      products: Array.from(new Set((products.data || []).map((p: any) => String(p.name).split(/[ ,(—-]/)[0]))),
      existingTitles: [...(posts.data || []).map((p: any) => p.title), ...(pending.data || []).map((d: any) => d.data?.title)].filter(Boolean),
    });
    // Draw a cover for each post (in parallel). A failed picture never blocks the post.
    const covers = await Promise.all(news.map((p) => makeCover(db, p).catch(() => null)));
    rows = news.map((p, i) => ({
      kind: "post",
      origin,
      sources: p.sources,
      source: input.topic || null,
      data: { title: p.title, excerpt: p.excerpt, body: p.body, tag: p.tag, cover_url: covers[i] },
    }));
  }

  if (!rows.length) return [];
  const { data, error } = await db.from("ai_drafts").insert(rows).select("*");
  if (error) throw new Error(error.message);
  return data || [];
}

/** Ask the AI for a cover picture, store it in the public products bucket, return its URL. */
export async function makeCover(db: SupabaseClient, post: { title: string; excerpt?: string; tag?: string }): Promise<string> {
  const svg = await draftCoverSvg(post);
  const path = `covers/ai_${randomUUID()}.svg`;
  const { error } = await db.storage.from("products").upload(path, new Blob([svg], { type: "image/svg+xml" }), { contentType: "image/svg+xml", upsert: false });
  if (error) throw new Error(error.message);
  return db.storage.from("products").getPublicUrl(path).data.publicUrl;
}

/* ------------------------------------------------------------------ */
/* Telegram                                                            */
/* ------------------------------------------------------------------ */

export async function tg(method: string, body: Record<string, unknown>): Promise<any> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (error) {
    console.error(`Telegram ${method} failed`, error);
    return null;
  }
}

const ks = (n: unknown) => (typeof n === "number" && isFinite(n) ? `${Math.round(n).toLocaleString("en-US")} Ks` : "—");

/** Short HTML summary of a draft for Telegram. */
export function draftCard(d: any): string {
  const x = d.data || {};
  if (d.kind === "product") {
    const margin = typeof x.price === "number" && typeof d.cost === "number" ? ` (+${ks(x.price - d.cost)})` : "";
    return [
      `🛒 <b>Product draft</b>`,
      `<b>${escapeHtml(x.name)}</b>`,
      `ရောင်းဈေး: <b>${ks(x.price)}</b>${margin} · ဝယ်ဈေး: ${typeof d.cost === "number" ? ks(d.cost) : escapeHtml(x.currency || "—")}`,
      `${escapeHtml(x.product_type || "—")}${x.subscription_days ? ` · ${x.subscription_days} ရက်` : ""}${x.required_fields?.length ? ` · ${escapeHtml(x.required_fields.join(", "))}` : ""}`,
      d.note ? `⚠️ ${escapeHtml(d.note)}` : "",
    ].filter(Boolean).join("\n");
  }
  if (d.kind === "job") {
    return [
      `💼 <b>Job draft</b> (${x.kind === "offering" ? "offering" : "hiring"})`,
      `<b>${escapeHtml(x.title)}</b>`,
      escapeHtml(String(x.description || "").slice(0, 600)),
      `Budget: ${escapeHtml(x.budget || "—")} · Contact: ${escapeHtml(x.contact || "—")}`,
      ...(Array.isArray(d.sources) ? d.sources : []).slice(0, 1).map((s: any) => `🔗 <a href="${escapeHtml(s.url)}">Source</a>`),
      d.note ? `⚠️ ${escapeHtml(d.note)}` : "",
    ].filter(Boolean).join("\n");
  }
  const sources = (Array.isArray(d.sources) ? d.sources : []).slice(0, 3).map((s: any) => `• <a href="${escapeHtml(s.url)}">${escapeHtml(String(s.title).slice(0, 60))}</a>`);
  return [
    `📰 <b>Hub post draft</b>`,
    `<b>${escapeHtml(x.title)}</b>`,
    escapeHtml(x.excerpt || ""),
    escapeHtml(String(x.body || "").slice(0, 700)) + (String(x.body || "").length > 700 ? "…" : ""),
    sources.length ? `Sources:\n${sources.join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
}

export const decisionKeyboard = (id: string) => ({
  inline_keyboard: [[{ text: "✅ တင်မယ်", callback_data: `a:${id}` }, { text: "❌ မတင်ဘူး", callback_data: `r:${id}` }]],
});

/** Post each draft to the owner's chat with Approve / Reject buttons. */
export async function sendDraftsToTelegram(db: SupabaseClient, drafts: any[], chatId = process.env.TELEGRAM_CHAT_ID) {
  if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) return;
  for (const d of drafts.slice(0, 20)) {
    const res = await tg("sendMessage", {
      chat_id: chatId,
      text: draftCard(d).slice(0, 4000),
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: decisionKeyboard(d.id),
    });
    const messageId = res?.result?.message_id;
    if (messageId) await db.from("ai_drafts").update({ tg_message_id: messageId }).eq("id", d.id);
  }
}

/** Download a Telegram photo/document as base64 for the AI (max ~4 MB). */
export async function telegramImage(fileId: string): Promise<AiImage | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const info = await tg("getFile", { file_id: fileId });
  const path = info?.result?.file_path;
  if (!path || (info?.result?.file_size || 0) > 4_000_000) return null;
  const res = await fetch(`https://api.telegram.org/file/bot${token}/${path}`);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = String(path).split(".").pop()?.toLowerCase();
  const media_type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return { media_type, data: buf.toString("base64") };
}

/** Readable Burmese message for errors. */
export function friendlyAiError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (/ANTHROPIC_API_KEY/.test(msg)) return "AI key မထည့်ရသေးပါ (.env.local ထဲက ANTHROPIC_API_KEY)။";
  if (/401|authentication/i.test(msg)) return "AI key မှားနေပါတယ်။ ANTHROPIC_API_KEY ကို ပြန်စစ်ပါ။";
  if (/credit|billing|402/i.test(msg)) return "Anthropic account မှာ credit မလုံလောက်ပါ။";
  if (/429|rate/i.test(msg)) return "AI အသုံးများနေလို့ ခဏနေမှ ပြန်စမ်းပါ။";
  if (/abort/i.test(msg)) return "AI အချိန်ကြာလွန်းသွားပါတယ်။ ပြန်စမ်းပါ။";
  return `AI error: ${msg.slice(0, 200)}`;
}
