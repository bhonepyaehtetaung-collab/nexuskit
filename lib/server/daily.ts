// Server-side only. The morning AI run: 5 Hub news + 5 real job openings,
// written by the cheaper daily model and sent to Telegram for ✅ / ❌.
// Nothing is published until the owner approves it.
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiConfigured, dailyModel } from "./ai";
import { createJob, queueJob } from "./jobs";

export type DailySettings = { news: boolean; jobs: boolean; count: number };
export const DAILY_DEFAULTS: DailySettings = { news: true, jobs: true, count: 3 };
/** Web searches per daily run ($10 per 1,000 searches) — the main cost. */
export const DAILY_MAX_SEARCHES = 3;

export async function dailySettings(db: SupabaseClient): Promise<DailySettings> {
  const { data } = await db.from("site_settings").select("ai_daily").eq("id", 1).maybeSingle();
  const raw = (data as any)?.ai_daily || {};
  const count = Math.min(8, Math.max(1, Math.floor(Number(raw.count) || DAILY_DEFAULTS.count)));
  return { news: raw.news !== false, jobs: raw.jobs !== false, count };
}

export async function dailyCount(db: SupabaseClient) {
  return (await dailySettings(db).catch(() => DAILY_DEFAULTS)).count;
}

/**
 * Queue today's daily jobs (once per ~20 hours). Called by the Netlify
 * scheduled function with the service-role client.
 */
export async function startDaily(db: SupabaseClient, siteOrigin: string): Promise<string> {
  if (!aiConfigured()) return "skipped: ANTHROPIC_API_KEY not set";
  const settings = await dailySettings(db);
  const since = new Date(Date.now() - 20 * 3600_000).toISOString();
  const { count: already } = await db.from("ai_jobs").select("id", { count: "exact", head: true }).eq("created_by", "daily").gte("created_at", since);
  if ((already || 0) > 0) return "skipped: already ran today";

  const kinds = [settings.news && "news", settings.jobs && "jobs_web"].filter(Boolean) as ("news" | "jobs_web")[];
  const started: string[] = [];
  for (const kind of kinds) {
    const id = await createJob(db, kind, "dashboard", { daily: true, model: dailyModel(), count: settings.count, maxSearches: DAILY_MAX_SEARCHES }, "daily");
    const queued = await queueJob(siteOrigin, id);
    if (!queued) await db.from("ai_jobs").update({ status: "error", error: "Background function could not start", finished_at: new Date().toISOString() }).eq("id", id);
    started.push(`${kind}:${queued ? "queued" : "failed"}`);
  }
  return started.join(", ") || "skipped: both switched off";
}
