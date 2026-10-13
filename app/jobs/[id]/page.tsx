import Link from "next/link";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/server/public-db";
import { getT } from "@/lib/server-lang";
import type { TKey } from "@/lib/dict";
import { contactLinks } from "@/lib/jobs";
import { ArrowLeftIcon, MailIcon, PhoneIcon, ShieldIcon } from "../../components/icons";

async function getJob(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await createPublicClient(120)
    .from("jobs")
    .select("id, kind, title, description, category, budget, contact, created_at, expires_at")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();
  if (!data || new Date(data.expires_at).getTime() < Date.now()) return null;
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const job = await getJob((await params).id);
  return { title: job ? job.title : "Job Board", description: job ? String(job.description).slice(0, 150) : undefined };
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const job = await getJob((await params).id);
  if (!job) notFound();
  const { lang, t } = await getT();
  const links = contactLinks(job.contact);
  const posted = new Date(job.created_at).toLocaleDateString(lang === "my" ? "my-MM" : "en-US", { day: "numeric", month: "long", year: "numeric" });
  const daysLeft = Math.max(0, Math.ceil((new Date(job.expires_at).getTime() - Date.now()) / 86_400_000));

  return (
    <article className="container-page max-w-3xl space-y-6 py-6 sm:py-10">
      <Link href="/jobs" className="btn-quiet -ml-3 px-3 py-2 text-sm">
        <ArrowLeftIcon size={16} /> <span className="my">{t("jobs.title")}</span>
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`badge ${job.kind === "hiring" ? "bg-info/15 text-info" : "bg-mint/15 text-mint"}`}>{t(`jobs.${job.kind}` as TKey)}</span>
          {job.category && <span className="badge bg-raised text-muted">{job.category}</span>}
          <span className="my text-muted">{posted} · {t("jobs.daysLeft", { n: daysLeft })}</span>
        </div>
        <h1 className="my break-words font-display text-2xl font-bold leading-snug sm:text-3xl">{job.title}</h1>
        {job.budget && (
          <p className="text-sm">
            <span className="my text-muted">{t("jobs.budget")}: </span>
            <span className="price text-lg">{job.budget}</span>
          </p>
        )}
      </header>

      <section className="panel p-5 sm:p-6">
        <p className="my whitespace-pre-line break-words leading-relaxed">{job.description}</p>
      </section>

      <section className="panel space-y-3 p-5 sm:p-6">
        <h2 className="my font-semibold">{t("jobs.contact")}</h2>
        <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {links.map((c) => (
            <li key={c.label} className="min-w-0">
              {c.href ? (
                <a
                  href={c.href}
                  target={c.kind === "telegram" || c.kind === "link" ? "_blank" : undefined}
                  rel="noopener noreferrer nofollow"
                  className={`btn w-full justify-start gap-2 break-all px-4 py-3 text-left sm:w-auto ${c.kind === "telegram" ? "bg-[#2AABEE] text-white hover:bg-[#2AABEE]/90" : "btn-ghost"}`}
                >
                  {c.kind === "email" ? <MailIcon size={16} /> : c.kind === "phone" ? <PhoneIcon size={16} /> : null}
                  <span className="min-w-0 break-all">{c.label}</span>
                </a>
              ) : (
                <p className="my break-words text-sm">{c.label}</p>
              )}
            </li>
          ))}
        </ul>
        {links.some((c) => c.kind !== "text") && job.contact.trim() !== links.map((c) => c.label).join(" ") && (
          <p className="my break-words text-xs text-muted">{job.contact}</p>
        )}
      </section>

      <p className="my flex items-start gap-2 rounded-xl border border-pass/30 bg-pass/5 p-3 text-xs text-muted">
        <ShieldIcon size={16} className="mt-0.5 flex-shrink-0 text-pass" /> {t("jobs.safety")}
      </p>
    </article>
  );
}
