// Server-side only. Runs an AI job (slow) and records the result in ai_jobs.
// On Netlify the job runs in a Background Function (up to 15 min) because
// normal functions stop after ~10 seconds. Locally it runs in-process.
import { timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiImage } from "./ai";
import { createDrafts, friendlyAiError, makeCover, sendDraftsToTelegram, telegramImage, tg, type DraftKind, type Origin } from "./drafts";

export type JobKind = DraftKind | "cover";
export type JobInput = {
  text?: string; topic?: string; images?: AiImage[]; notify?: boolean; tg_file_id?: string; tg_wait_id?: number; post_id?: string;
  /** Daily schedule: model override and how many drafts. */
  model?: string; count?: number; daily?: boolean;
};

const JOB_HEADER = "x-nexuskit-job";
const jobSecret = () => process.env.TELEGRAM_WEBHOOK_SECRET || "";

export function isJobRequest(request: Request): boolean {
  const secret = jobSecret();
  const given = request.headers.get(JOB_HEADER) || "";
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return !!secret && a.length === b.length && timingSafeEqual(a, b);
}

export async function createJob(db: SupabaseClient, kind: JobKind, origin: Origin, input: JobInput, by?: string): Promise<string> {
  const { data, error } = await db.from("ai_jobs").insert({ kind, origin, input, created_by: by || null }).select("id").single();
  if (error || !data) throw new Error(error?.message || "Could not create AI job");
  return data.id as string;
}

/** Ask Netlify to run the job in the background. Returns false when not on Netlify (e.g. localhost). */
export async function queueJob(siteOrigin: string, id: string): Promise<boolean> {
  if (!jobSecret()) return false;
  try {
    const res = await fetch(`${siteOrigin}/.netlify/functions/ai-job-background`, {
      method: "POST",
      headers: { "content-type": "application/json", [JOB_HEADER]: jobSecret() },
      body: JSON.stringify({ id }),
    });
    return res.status === 202;
  } catch {
    return false;
  }
}

/** Do the AI work for one queued job. Never throws. */
export async function runJob(db: SupabaseClient, id: string): Promise<void> {
  const { data: job } = await db.from("ai_jobs").select("*").eq("id", id).maybeSingle();
  if (!job || job.status !== "queued") return;
  await db.from("ai_jobs").update({ status: "running" }).eq("id", id);

  const input: JobInput = job.input || {};
  const owner = process.env.TELEGRAM_CHAT_ID;
  try {
    if (job.kind === "cover") {
      // Draw a cover for an existing Hub post and attach it.
      const { data: post } = await db.from("posts").select("id, title, excerpt, tag").eq("id", input.post_id || "").maybeSingle();
      if (!post) throw new Error("Post not found");
      const url = await makeCover(db, post);
      const { error } = await db.from("posts").update({ cover_url: url }).eq("id", post.id);
      if (error) throw new Error(error.message);
      await db.from("ai_jobs").update({ status: "done", draft_count: 1, finished_at: new Date().toISOString() }).eq("id", id);
      return;
    }
    const images: AiImage[] = Array.isArray(input.images) ? input.images : [];
    if (input.tg_file_id) {
      const img = await telegramImage(input.tg_file_id);
      if (img) images.push(img);
    }
    const drafts = await createDrafts(db, { kind: job.kind, text: input.text || "", topic: input.topic, images, model: input.model, count: input.count }, job.origin);
    await db.from("ai_jobs").update({
      status: "done",
      draft_count: drafts.length,
      finished_at: new Date().toISOString(),
      input: { text: (input.text || "").slice(0, 500), topic: input.topic || null, daily: input.daily || undefined }, // drop the images
    }).eq("id", id);

    if (drafts.length && input.notify !== false) {
      if (input.daily && owner) {
        const what = job.kind === "news" ? "📰 Hub news" : "💼 Job Board";
        await tg("sendMessage", { chat_id: owner, text: `☀️ ဒီနေ့အတွက် ${what} draft ${drafts.length} ခု — ✅ နှိပ်မှ website ပေါ် တက်ပါမယ်။` });
      }
      await sendDraftsToTelegram(db, drafts);
    }
    if (!drafts.length && (job.origin === "telegram" || input.daily) && owner) {
      await tg("sendMessage", { chat_id: owner, text: job.kind === "news" ? "အသစ် news မတွေ့ပါ။" : job.kind === "jobs_web" ? "အသစ် အလုပ်ခေါ်စာ မတွေ့ပါ။" : "ဒီထဲမှာ ထည့်စရာ မတွေ့ပါ။" });
    }
  } catch (error) {
    console.error("AI job failed", error);
    const message = friendlyAiError(error);
    await db.from("ai_jobs").update({ status: "error", error: message, finished_at: new Date().toISOString(), input: input.daily ? { daily: true } : {} }).eq("id", id);
    if ((job.origin === "telegram" || input.daily) && owner) await tg("sendMessage", { chat_id: owner, text: input.daily ? `☀️ Daily AI (${job.kind}): ${message}` : message });
  } finally {
    if (input.tg_wait_id && owner) await tg("deleteMessage", { chat_id: owner, message_id: input.tg_wait_id });
  }
}
