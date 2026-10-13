import { NextResponse, after } from "next/server";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/server/public-db";
import { timingSafeEqual } from "crypto";
import { aiConfigured } from "@/lib/server/ai";
import { friendlyAiError, tg, type DraftKind } from "@/lib/server/drafts";
import { createJob, queueJob, runJob } from "@/lib/server/jobs";
import { createServiceClient } from "@/lib/server/supabase-admin";

export const maxDuration = 120;

const HELP = [
  "🤖 <b>NexusKit AI</b>",
  "",
  "• Supplier ဈေးစာရင်း (စာ / screenshot) ကို ဒီကို <b>forward</b> လုပ်ပါ → Product draft တွေ ရေးပေးမယ်",
  "• <code>/job</code> + အလုပ်အကြောင်း (ဒါမှမဟုတ် screenshot caption) → Job post draft",
  "• <code>/news</code> (ဒါမှမဟုတ် <code>/news PUBG</code>) → Web ရှာပြီး Hub news draft",
  "",
  "Draft တိုင်းမှာ ✅ တင်မယ် / ❌ မတင်ဘူး ခလုတ် ပါပါမယ်။ ✅ နှိပ်မှသာ website ပေါ် တက်ပါမယ်။",
].join("\n");

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const ok = () => NextResponse.json({ ok: true });

/**
 * Telegram bot webhook. Only the owner's chat (TELEGRAM_CHAT_ID) is served,
 * and Telegram must send the secret header set by /api/telegram/setup.
 */
export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
  const given = request.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!secret || !sameSecret(secret, given)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let update: any;
  try {
    update = await request.json();
  } catch {
    return ok();
  }

  const owner = String(process.env.TELEGRAM_CHAT_ID || "");
  const db = createServiceClient();

  // --- Button taps: approve / reject -------------------------------------
  const cb = update?.callback_query;
  if (cb) {
    const chatId = String(cb.message?.chat?.id ?? "");
    const match = /^([ar]):([0-9a-f-]{36})$/.exec(String(cb.data || ""));
    if (chatId !== owner || !match) {
      await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "Not allowed" });
      return ok();
    }
    if (!db) {
      await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "SUPABASE_SERVICE_ROLE_KEY မထည့်ရသေးပါ", show_alert: true });
      return ok();
    }
    const approve = match[1] === "a";
    const by = `telegram:${cb.from?.username || cb.from?.id || "owner"}`;
    const { data, error } = await db.rpc("publish_draft", { p_id: match[2], p_approve: approve, p_by: by });
    let text: string;
    if (error) {
      text = /PRICE_REQUIRED/.test(error.message) ? "ရောင်းဈေး မရှိသေးလို့ Admin dashboard မှာ ဈေးထည့်ပြီး approve လုပ်ပါ" : `Error: ${error.message.slice(0, 150)}`;
    } else if ((data as any)?.already) {
      text = `ဒီ draft က ${(data as any).status === "approved" ? "တင်ပြီးသား" : "ပယ်ပြီးသား"} ပါ`;
    } else {
      text = approve ? "✅ Website ပေါ် တင်ပြီးပါပြီ" : "❌ မတင်ပါ — ပယ်လိုက်ပါပြီ";
      if (approve) revalidateTag(CATALOG_TAG, { expire: 0 });
    }
    await tg("answerCallbackQuery", { callback_query_id: cb.id, text, show_alert: !!error });
    if (!error && cb.message?.message_id) {
      await tg("editMessageReplyMarkup", {
        chat_id: chatId,
        message_id: cb.message.message_id,
        reply_markup: { inline_keyboard: [[{ text: text.slice(0, 60), callback_data: "noop" }]] },
      });
    }
    return ok();
  }

  // --- Messages ------------------------------------------------------------
  const msg = update?.message;
  if (!msg || String(msg.chat?.id ?? "") !== owner) return ok(); // ignore everyone else silently

  const raw: string = String(msg.text || msg.caption || "").trim();
  const command = /^\/(\w+)(?:@\w+)?\s*([\s\S]*)$/.exec(raw);
  const cmd = command?.[1]?.toLowerCase();
  const rest = command ? command[2].trim() : raw;

  if (cmd === "start" || cmd === "help") {
    await tg("sendMessage", { chat_id: owner, text: HELP, parse_mode: "HTML" });
    return ok();
  }
  if (!aiConfigured() || !db) {
    await tg("sendMessage", { chat_id: owner, text: !db ? "SUPABASE_SERVICE_ROLE_KEY မထည့်ရသေးပါ။" : friendlyAiError(new Error("ANTHROPIC_API_KEY")) });
    return ok();
  }

  const kind: DraftKind = cmd === "job" ? "job" : cmd === "news" ? "news" : "products";
  const photo = Array.isArray(msg.photo) && msg.photo.length ? msg.photo[msg.photo.length - 1] : null;
  const doc = msg.document && /^image\//.test(msg.document.mime_type || "") ? msg.document : null;
  if (kind !== "news" && !rest && !photo && !doc) {
    await tg("sendMessage", { chat_id: owner, text: HELP, parse_mode: "HTML" });
    return ok();
  }

  // Queue the slow AI work and answer Telegram at once.
  const waiting = await tg("sendMessage", {
    chat_id: owner,
    text: kind === "news" ? "🔎 Web မှာ news ရှာနေပါတယ်… (၁ မိနစ်လောက်)" : "⏳ AI ဖတ်နေပါတယ်…",
    reply_to_message_id: msg.message_id,
  });
  try {
    const jobId = await createJob(db, kind, "telegram", {
      text: rest,
      topic: kind === "news" ? rest : undefined,
      tg_file_id: photo?.file_id || doc?.file_id,
      tg_wait_id: waiting?.result?.message_id,
    }, "telegram");
    const queued = await queueJob(new URL(request.url).origin, jobId);
    if (!queued) after(() => runJob(db, jobId));
  } catch (error) {
    await tg("sendMessage", { chat_id: owner, text: friendlyAiError(error) });
  }
  return ok();
}
