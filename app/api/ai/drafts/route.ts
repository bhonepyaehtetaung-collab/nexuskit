import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isSameOrigin, rateLimit } from "@/lib/server/guard";
import { aiConfigured, type AiImage } from "@/lib/server/ai";
import { friendlyAiError, type DraftKind } from "@/lib/server/drafts";
import { createJob, queueJob, runJob } from "@/lib/server/jobs";
import { createServiceClient } from "@/lib/server/supabase-admin";

export const maxDuration = 120;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

/** "data:image/png;base64,..." → AiImage (max 4 MB each). */
function parseImage(v: unknown): AiImage | null {
  if (typeof v !== "string") return null;
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(v);
  if (!m || m[2].length > 5_600_000) return null;
  return { media_type: m[1] as (typeof IMAGE_TYPES)[number], data: m[2] };
}

/**
 * POST /api/ai/drafts — staff only.
 * Body: { kind: "products" | "job" | "news", text?, topic?, images?: dataURL[] }
 * Starts an AI job; the browser polls ai_jobs for the result.
 * The AI writes drafts; nothing is published until someone approves it.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: role } = auth.user ? await supabase.rpc("staff_role") : { data: null };
  if (!auth.user || typeof role !== "string") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!aiConfigured()) return NextResponse.json({ error: friendlyAiError(new Error("ANTHROPIC_API_KEY")) }, { status: 503 });
  if (!rateLimit(`ai:${auth.user.id}`, 15, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "AI ကို အကြိမ်များလွန်းနေပါပြီ။ ၁၀ မိနစ်လောက် နေမှ ပြန်စမ်းပါ။" }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const kind = body?.kind as DraftKind;
  if (!["products", "job", "news"].includes(kind)) return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  const text = typeof body?.text === "string" ? body.text.slice(0, 12000) : "";
  const topic = typeof body?.topic === "string" ? body.topic.slice(0, 200) : "";
  const images = (Array.isArray(body?.images) ? body.images : []).slice(0, 4).map(parseImage).filter(Boolean) as AiImage[];
  if (kind !== "news" && !text.trim() && images.length === 0) {
    return NextResponse.json({ error: "စာ ဒါမှမဟုတ် screenshot ထည့်ပါ။" }, { status: 400 });
  }

  try {
    const jobId = await createJob(supabase as any, kind, "dashboard", { text, topic, images, notify: body?.notify !== false }, auth.user.email || undefined);
    // On Netlify: background function (no 10 s limit). Locally: run now.
    const queued = await queueJob(new URL(request.url).origin, jobId);
    if (!queued) await runJob(createServiceClient() ?? (supabase as any), jobId);
    return NextResponse.json({ job_id: jobId, queued });
  } catch (error) {
    console.error("AI draft failed", error);
    return NextResponse.json({ error: friendlyAiError(error) }, { status: 502 });
  }
}
