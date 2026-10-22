import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { storeExtras } from "@/lib/server/storefront";
import { withCampaignPrices } from "@/lib/promotions";
import { createPublicClient } from "@/lib/server/public-db";
import { getT } from "@/lib/server-lang";
import type { TKey } from "@/lib/dict";
import PostCover from "@/app/components/PostCover";
import ProductCard from "@/app/components/ProductCard";
import { ArrowLeftIcon } from "@/app/components/icons";

type Props = { params: Promise<{ slug: string }> };

async function getPost(slug: string) {
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return null;
  const { data } = await createPublicClient().from("posts").select("*").eq("slug", slug).eq("published", true).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return { title: "Hub" };
  return {
    title: post.title,
    description: post.excerpt || undefined,
    openGraph: { title: post.title, description: post.excerpt || undefined, images: post.cover_url ? [post.cover_url] : undefined },
  };
}

/** Very small, safe text formatter: "## " headings, "- " lists, blank-line paragraphs. */
function Body({ text }: { text: string }) {
  const blocks = String(text || "").replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className="space-y-4 text-[15px] leading-8 text-text/90">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter(Boolean);
        if (lines.length === 0) return null;
        if (lines[0].startsWith("## ")) {
          return <h2 key={i} className="pt-2 font-display text-xl font-bold leading-snug">{lines[0].slice(3)}</h2>;
        }
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}
            </ul>
          );
        }
        return <p key={i} className="whitespace-pre-line">{block}</p>;
      })}
    </div>
  );
}

export default async function PostPage({ params }: Props) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const { lang, t } = await getT();

  const ids: string[] = Array.isArray(post.product_ids) ? post.product_ids.slice(0, 12) : [];
  const db = createPublicClient();
  const [{ data: rawProducts }, extras] = ids.length
    ? await Promise.all([db.from("products").select("*").in("id", ids), storeExtras(db)])
    : [{ data: [] as any[] }, { campaigns: [] }];
  const products = withCampaignPrices(rawProducts || [], extras.campaigns);

  return (
    <article className="container-page max-w-3xl pb-16 pt-4 sm:pt-8">
      <Link href="/hub" className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-text">
        <ArrowLeftIcon size={16} /> {t("hub.back")}
      </Link>
      <header className="space-y-3">
        <span className="badge bg-brand/15 text-brand">{t(`hub.${post.tag}` as TKey)}</span>
        <h1 className="my font-display text-3xl font-bold leading-snug sm:text-4xl">{post.title}</h1>
        <p className="text-sm text-muted">{new Date(post.created_at).toLocaleDateString()}</p>
      </header>
      <div className="my-6 aspect-[16/9] overflow-hidden rounded-3xl border border-line">
        <PostCover post={post} />
      </div>
      {post.excerpt && <p className="my mb-6 text-lg text-muted">{post.excerpt}</p>}
      <div className="my"><Body text={post.body || ""} /></div>

      {products && products.length > 0 && (
        <section className="mt-12 border-t border-line pt-8">
          <h2 className="my mb-4 font-display text-xl font-bold">{t("hub.related")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </article>
  );
}
