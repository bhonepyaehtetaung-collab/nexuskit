import Link from "next/link";
import { createPublicClient } from "@/lib/server/public-db";
import { getT } from "@/lib/server-lang";
import type { TKey } from "@/lib/dict";
import { PlusIcon, ShieldIcon } from "../components/icons";

export const metadata = { title: "Job Board" };

const KINDS = ["hiring", "offering"] as const;

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const active = KINDS.includes(kind as any) ? kind : null;
  const { lang, t } = await getT();

  const supabase = createPublicClient(120);
  let query = supabase
    .from("jobs")
    .select("id, kind, title, description, category, budget, contact, created_at")
    .eq("status", "approved")
    .gt("expires_at", new Date(Math.floor(Date.now() / 600_000) * 600_000).toISOString()) // 10-min steps so the result can be cached
    .order("created_at", { ascending: false })
    .limit(100);
  if (active) query = query.eq("kind", active);
  const { data } = await query;
  const jobs = data || [];

  const ago = (d: string) => {
    const n = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
    return n <= 0 ? t("jobs.today") : t("jobs.daysAgo", { n });
  };

  return (
    <div className="container-page space-y-5 pb-16 pt-6 sm:pt-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{t("jobs.title")}</h1>
          <p className="my mt-1 text-muted">{t("jobs.sub")}</p>
        </div>
        <Link href="/jobs/new" className="btn-primary"><PlusIcon size={18} /> {t("jobs.post")}</Link>
      </header>

      <nav className="flex gap-2" aria-label="Filter">
        <Link href="/jobs" className="chip" aria-pressed={!active}>{t("jobs.all")}</Link>
        {KINDS.map((k) => (
          <Link key={k} href={`/jobs?kind=${k}`} className="chip" aria-pressed={active === k}>{t(`jobs.${k}` as TKey)}</Link>
        ))}
      </nav>

      <p className="my flex items-start gap-2 rounded-xl border border-pass/30 bg-pass/10 p-3 text-xs text-text/90">
        <ShieldIcon size={16} className="mt-0.5 flex-shrink-0 text-pass" /> {t("jobs.safety")}
      </p>

      {jobs.length === 0 ? (
        <div className="panel flex flex-col items-center gap-4 p-10 text-center">
          <p className="my text-muted">{t("jobs.empty")}</p>
          <Link href="/jobs/new" className="btn-primary">{t("jobs.post")}</Link>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {jobs.map((j) => (
              <li key={j.id}>
                <Link href={`/jobs/${j.id}`} className="group flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-brand/50">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`badge ${j.kind === "hiring" ? "bg-info/15 text-info" : "bg-mint/15 text-mint"}`}>{t(`jobs.${j.kind}` as TKey)}</span>
                    {j.category && <span className="badge max-w-[60%] truncate bg-raised text-muted">{j.category}</span>}
                    <span className="ml-auto text-muted">{ago(j.created_at)}</span>
                  </div>
                  <h2 className="my break-words text-lg font-semibold leading-snug group-hover:text-brand">{j.title}</h2>
                  <p className="my line-clamp-3 whitespace-pre-line break-words text-sm text-muted">{j.description}</p>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
                    <span className="min-w-0 truncate text-sm">{j.budget ? <><span className="text-muted">{t("jobs.budget")}: </span><span className="price">{j.budget}</span></> : null}</span>
                    <span className="my flex-shrink-0 text-sm font-medium text-brand">{t("jobs.readMore")} →</span>
                  </div>
                </Link>
              </li>
          ))}
        </ul>
      )}
    </div>
  );
}
