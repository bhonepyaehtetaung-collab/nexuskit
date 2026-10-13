import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { translate, type TKey } from "@/lib/dict";
import { getLang } from "@/lib/server-lang";
import PostCover from "../components/PostCover";

export const metadata = { title: "Hub" };

const TAGS = ["news", "guide", "promo"] as const;
const TAG_TONE: Record<string, string> = { news: "bg-info/15 text-info", guide: "bg-mint/15 text-mint", promo: "bg-pass/15 text-pass" };

export default async function HubPage({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const { tag } = await searchParams;
  const active = TAGS.includes(tag as any) ? tag : null;
  const lang = await getLang();
  const t = (k: TKey) => translate(lang, k);

  const supabase = createClient();
  let query = supabase.from("posts").select("id, slug, title, excerpt, cover_url, tag, created_at").eq("published", true).order("created_at", { ascending: false }).limit(60);
  if (active) query = query.eq("tag", active);
  const { data } = await query;
  const posts = data || [];
  const [featured, ...rest] = posts;

  return (
    <div className="container-page space-y-6 pb-16 pt-6 sm:pt-10">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{t("hub.title")}</h1>
        <p className="my mt-1 text-muted">{t("hub.sub")}</p>
      </header>

      <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Filter">
        <Link href="/hub" className="chip" aria-pressed={!active}>{t("hub.all")}</Link>
        {TAGS.map((tg) => (
          <Link key={tg} href={`/hub?tag=${tg}`} className="chip" aria-pressed={active === tg}>{t(`hub.${tg}` as TKey)}</Link>
        ))}
      </nav>

      {posts.length === 0 ? (
        <p className="panel my p-10 text-center text-muted">{t("hub.empty")}</p>
      ) : (
        <>
          <Link href={`/hub/${featured.slug}`} className="group grid overflow-hidden rounded-3xl border border-line bg-surface transition-colors hover:border-brand/50 md:grid-cols-2">
            <div className="aspect-[16/9] overflow-hidden md:aspect-auto md:min-h-[280px]"><PostCover post={featured} className="transition-transform duration-500 group-hover:scale-[1.03]" /></div>
            <div className="flex flex-col justify-center gap-3 p-5 sm:p-8">
              <span className={`badge w-fit ${TAG_TONE[featured.tag] || ""}`}>{t(`hub.${featured.tag}` as TKey)}</span>
              <h2 className="my font-display text-2xl font-bold leading-snug sm:text-3xl">{featured.title}</h2>
              {featured.excerpt && <p className="my line-clamp-3 text-muted">{featured.excerpt}</p>}
              <p className="text-xs text-muted">{new Date(featured.created_at).toLocaleDateString()}</p>
            </div>
          </Link>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => (
              <li key={p.id}>
                <Link href={`/hub/${p.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-brand/50">
                  <div className="aspect-[16/9] overflow-hidden"><PostCover post={p} className="transition-transform duration-500 group-hover:scale-[1.03]" /></div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <span className={`badge w-fit ${TAG_TONE[p.tag] || ""}`}>{t(`hub.${p.tag}` as TKey)}</span>
                    <h3 className="my line-clamp-2 font-semibold leading-snug">{p.title}</h3>
                    {p.excerpt && <p className="my line-clamp-2 text-sm text-muted">{p.excerpt}</p>}
                    <p className="mt-auto pt-1 text-xs text-muted">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
