import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isSameOrigin } from "@/lib/server/guard";
import { tg } from "@/lib/server/drafts";
import { publicOrigin } from "@/lib/server/jobs";

/**
 * POST /api/telegram/setup — super admin only.
 * Points the bot's webhook at this site (must be a public https URL).
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: role } = auth.user ? await supabase.rpc("staff_role") : { data: null };
  if (role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const missing = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "TELEGRAM_WEBHOOK_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY"].filter((k) => !process.env[k]);
  if (missing.length) return NextResponse.json({ error: `.env ထဲမှာ မရှိသေးတာ: ${missing.join(", ")}` }, { status: 400 });

  // Always the live address — never a protected deploy-preview URL.
  const origin = publicOrigin(request);
  if (!origin.startsWith("https://") || /localhost|127\.0\.0\.1/.test(origin)) {
    return NextResponse.json({ error: "Telegram က localhost ကို မရောက်နိုင်ပါ။ Website ကို Netlify ပေါ် တင်ပြီးမှ ဒီခလုတ်ကို live site ကနေ နှိပ်ပါ။" }, { status: 400 });
  }

  const res = await tg("setWebhook", {
    url: `${origin}/api/telegram/webhook`,
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false, // keep ✅/❌ taps made while the hook was broken
  });
  if (!res?.ok) return NextResponse.json({ error: res?.description || "setWebhook failed" }, { status: 502 });
  await tg("setMyCommands", {
    commands: [
      { command: "news", description: "Hub news draft (web search)" },
      { command: "jobs", description: "Real job openings (web search)" },
      { command: "job", description: "Job post draft" },
      { command: "help", description: "How to use" },
    ],
  });
  return NextResponse.json({ ok: true, url: `${origin}/api/telegram/webhook` });
}
