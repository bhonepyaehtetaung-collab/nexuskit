"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { categoryLabel, type Category } from "@/lib/categories";
import { categoryHue, categoryKey } from "@/lib/format";
import { useRenewals } from "@/lib/renewals";
import { CAMPAIGN_THEMES, PRODUCT_SORTS, sortProducts, type Campaign, type ProductSort } from "@/lib/promotions";
import ProductCard, { ProductArt } from "./components/ProductCard";
import BundleCard from "./components/BundleCard";
import { ClockIcon, SearchIcon, ShieldIcon } from "./components/icons";

function TelegramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.5 4.3 18.4 19c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.2.2-.5.4-.9.4l.3-4.7 8.6-7.8c.4-.3-.1-.5-.6-.2L6.7 12.9 2.2 11.5c-1-.3-1-1 .2-1.5L20.2 3.2c.8-.3 1.6.2 1.3 1.1Z" />
    </svg>
  );
}

/** Big banner: headline on the left, a fan of real product art on the right. */
function HeroBanner({ products, onShop }: { products: any[]; onShop: () => void }) {
  const { t } = useT();
  const art = products.filter((p) => p.image).slice(0, 3);
  const [line1, line2] = t("home.heroTitle").split("\n");
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(125deg,#6E5EF5_0%,#4B3BD1_45%,#1E1B5E_100%)] p-6 sm:p-10">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-pass/20 blur-3xl" aria-hidden="true" />
      <div className="relative grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <h1 className="my font-display text-[1.75rem] font-bold leading-[1.3] text-white sm:text-5xl sm:leading-[1.15]">
            <span className="block">{line1}</span>
            {line2 && <span className="block text-[#FFC85A]">{line2}</span>}
          </h1>
          <p className="my max-w-md text-sm text-white/80 sm:text-base">{t("home.heroSub")}</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onShop} className="btn btn-lg bg-white text-night hover:bg-white/90">
              {t("home.topUpNow")}
            </button>
            <Link href="/my-account" className="btn btn-lg bg-white/15 text-white hover:bg-white/25">
              {t("home.track")}
            </Link>
          </div>
        </div>
        {art.length > 0 && (
          <div className="relative mx-auto hidden h-56 w-full max-w-xs sm:block" aria-hidden="true">
            {art.map((p, i) => (
              <div
                key={p.id}
                className="absolute top-1/2 h-40 w-32 overflow-hidden rounded-2xl border-2 border-white/30 shadow-2xl shadow-black/40"
                style={{
                  left: `${10 + i * 26}%`,
                  transform: `translateY(-50%) rotate(${(i - 1) * 9}deg) translateY(${i === 1 ? -14 : 0}px)`,
                  zIndex: i === 1 ? 3 : 1,
                }}
              >
                <ProductArt product={p} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RenewalBanner() {
  const { t } = useT();
  const renewals = useRenewals();
  if (renewals.length === 0) return null;
  const first = renewals[0];
  return (
    <Link
      href={`/products/${first.id}`}
      className="flex items-center gap-3 rounded-2xl border border-pass/40 bg-pass/10 p-3 pr-4 transition-colors hover:bg-pass/15"
    >
      <span className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-raised">
        <ProductArt product={first} className="text-sm" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="my block text-sm font-semibold">
          {first.daysLeft > 0 ? t("renew.banner", { name: first.name, n: first.daysLeft }) : t("renew.bannerExpired", { name: first.name })}
        </span>
        {renewals.length > 1 && <span className="text-xs text-muted">{t("renew.more", { n: renewals.length - 1 })}</span>}
      </span>
      <span className="btn-pass px-4 py-2">{t("renew.button")}</span>
    </Link>
  );
}

function TrustRow() {
  const { t } = useT();
  const items = [
    { Icon: ClockIcon, title: t("trust.fast"), sub: t("trust.fastSub"), tone: "text-pass" },
    { Icon: ShieldIcon, title: t("trust.safe"), sub: t("trust.safeSub"), tone: "text-mint" },
    { Icon: TelegramIcon, title: t("trust.support"), sub: t("trust.supportSub"), tone: "text-info" },
  ];
  return (
    <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
      {items.map(({ Icon, title, sub, tone }) => (
        <li key={title} className="flex min-w-[230px] items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 sm:min-w-0">
          <span className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-raised ${tone}`}>
            <Icon size={20} />
          </span>
          <span>
            <span className="block text-sm font-semibold">{title}</span>
            <span className="my block text-xs text-muted">{sub}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** "2 ရက် 5 နာရီ" — updates every 30 s; empty until mounted so server and browser HTML match. */
function Countdown({ until }: { until: string }) {
  const { t } = useT();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return null;
  const left = Math.max(0, new Date(until).getTime() - now);
  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const text = left <= 0 ? t("sale.ended") : d > 0 ? t("sale.dh", { d, h }) : t("sale.hm", { h, m });
  return <span className="my">{left <= 0 ? text : t("sale.endsIn", { time: text })}</span>;
}

/** Seasonal campaign banner (Admin → Promotions). */
function CampaignBanner({ campaign, onShop }: { campaign: Campaign; onShop: () => void }) {
  const { t, lang } = useT();
  const name = (lang === "en" && campaign.name_en?.trim()) || campaign.name;
  const tagline = (lang === "en" && campaign.tagline_en?.trim()) || campaign.tagline || "";
  return (
    <section
      className="relative overflow-hidden rounded-3xl p-5 text-white sm:p-7"
      style={{ background: CAMPAIGN_THEMES[campaign.theme || "violet"] || CAMPAIGN_THEMES.violet }}
    >
      <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/15 blur-2xl" aria-hidden="true" />
      <div className="relative flex flex-wrap items-center gap-4">
        {campaign.emoji && <span className="text-4xl sm:text-5xl" aria-hidden="true">{campaign.emoji}</span>}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="badge bg-white text-[12px] font-bold text-night">{t("sale.off", { n: Number(campaign.discount_percent) })}</span>
            <span className="text-xs text-white/80"><Countdown until={campaign.ends_at} /></span>
          </p>
          <h2 className="my font-display text-xl font-bold leading-snug sm:text-2xl">{name}</h2>
          {tagline && <p className="my text-sm text-white/85">{tagline}</p>}
        </div>
        <button type="button" onClick={onShop} className="btn bg-white text-night hover:bg-white/90">{t("sale.shop")}</button>
      </div>
    </section>
  );
}

const SORT_KEY = "nk_sort";
const SORT_LABEL = {
  recommended: "shop.sortRecommended",
  popular: "shop.sortPopular",
  new: "shop.sortNew",
  "price-asc": "shop.sortLow",
  "price-desc": "shop.sortHigh",
} as const;

export default function HomeView({
  products,
  categories,
  bundles,
  paymentMethods,
  campaigns = [],
  popular = [],
}: {
  products: any[];
  categories: Category[];
  bundles: any[];
  paymentMethods: { id: string | number; provider_name: string }[];
  campaigns?: Campaign[];
  popular?: string[];
}) {
  const { t, lang } = useT();
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("cat") || "all";
  const [query, setQuery] = useState("");
  const [sort, setSortState] = useState<ProductSort>("recommended");
  const hasSale = useMemo(() => products.some((p) => p.sale), [products]);
  const banners = campaigns.filter((c) => c.show_banner !== false).slice(0, 2);

  // Remember the shopper's sort choice on this device.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SORT_KEY) as ProductSort | null;
      if (saved && PRODUCT_SORTS.includes(saved)) setSortState(saved);
    } catch {
      /* storage blocked */
    }
  }, []);
  const setSort = (next: ProductSort) => {
    setSortState(next);
    try {
      localStorage.setItem(SORT_KEY, next);
    } catch {
      /* storage blocked */
    }
  };
  const gridRef = useRef<HTMLDivElement>(null);

  const scrollToGrid = () => gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const setCategory = (key: string) => {
    router.replace(key === "all" ? "/" : `/?cat=${encodeURIComponent(key)}`, { scroll: false });
    setTimeout(scrollToGrid, 50);
  };

  const visible = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = products.filter((p) => {
      const inCategory = active === "all" || (active === "sale" ? !!p.sale : categoryKey(p.product_type) === active);
      const hay = `${p.name ?? ""} ${p.description ?? ""} ${p.product_type ?? ""}`.toLowerCase();
      return inCategory && words.every((w) => hay.includes(w));
    });
    return sortProducts(list, sort, popular);
  }, [products, active, query, sort, popular]);

  const steps = [t("home.step1"), t("home.step2"), t("home.step3")];

  return (
    <div className="container-page space-y-8 pb-16 pt-4 sm:space-y-12 sm:pt-8">
      <RenewalBanner />
      {banners.map((c) => (
        <CampaignBanner key={c.id} campaign={c} onShop={() => setCategory(hasSale ? "sale" : "all")} />
      ))}
      <HeroBanner products={products} onShop={scrollToGrid} />
      <TrustRow />

      {bundles.length > 0 && (
        <section>
          <h2 className="my mb-4 font-display text-xl font-bold sm:text-2xl">{t("store.bundles")}</h2>
          <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0 lg:grid-cols-4">
            {bundles.map((b) => (
              <li key={b.id} className="w-[68%] flex-shrink-0 snap-start sm:w-auto">
                <BundleCard bundle={b} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Categories double as filters for the product grid below */}
      {categories.length > 0 && (
        <section aria-labelledby="cat-title">
          <h2 id="cat-title" className="my mb-4 font-display text-xl font-bold sm:text-2xl">{t("home.categories")}</h2>
          <ul className="grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-6 lg:grid-cols-8">
            {categories.map((c) => {
              const hue = categoryHue(c.name);
              const on = active === c.key;
              return (
                <li key={c.key}>
                  <button type="button" onClick={() => setCategory(on ? "all" : c.key)} aria-pressed={on} className="group flex w-full flex-col items-center gap-2 text-center">
                    <span
                      className={`relative grid aspect-square w-full max-w-[84px] place-items-center overflow-hidden rounded-[22px] p-[3px] transition-transform group-hover:-translate-y-0.5 group-active:scale-95 ${on ? "ring-2 ring-white ring-offset-2 ring-offset-ink" : ""}`}
                      style={{ background: `linear-gradient(140deg, hsl(${hue} 90% 62%), hsl(${(hue + 50) % 360} 85% 45%))` }}
                    >
                      <span className="block h-full w-full overflow-hidden rounded-[19px] bg-raised">
                        <ProductArt product={{ image: c.image, name: c.name, product_type: c.name }} className="text-xl" />
                      </span>
                    </span>
                    <span className={`line-clamp-2 text-xs font-medium leading-tight ${on ? "text-text" : ""}`}>{categoryLabel(c, lang)}</span>
                    <span className="-mt-1.5 text-[11px] text-muted">{t("home.items", { n: c.count })}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* All products */}
      <section ref={gridRef} className="scroll-mt-20" aria-labelledby="grid-title">
        <h2 id="grid-title" className="my mb-3 font-display text-xl font-bold sm:text-2xl">
          {active === "sale" ? t("sale.chip") : (() => { const c = categories.find((x) => x.key === active); return c ? categoryLabel(c, lang) : t("store.products"); })()}
        </h2>
        <div className="sticky top-16 z-30 -mx-4 mb-4 space-y-3 border-b border-line bg-ink/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
          <div className="flex gap-2">
            <label className="relative flex-1">
              <span className="sr-only">{t("nav.search")}</span>
              <SearchIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search.placeholder")} className="field pl-10" />
            </label>
            <label>
              <span className="sr-only">{t("shop.sort")}</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as ProductSort)} className="field w-auto max-w-[44vw] pr-8 sm:max-w-none">
                {PRODUCT_SORTS.map((s) => <option key={s} value={s}>{t(SORT_LABEL[s])}</option>)}
              </select>
            </label>
          </div>
          {categories.length > 0 && (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label={t("home.categories")}>
              <button type="button" className="chip py-1.5" aria-pressed={active === "all"} onClick={() => setCategory("all")}>{t("store.all")}</button>
              {hasSale && (
                <button type="button" className="chip py-1.5" aria-pressed={active === "sale"} onClick={() => setCategory("sale")}>{t("sale.chip")}</button>
              )}
              {categories.map((c) => (
                <button key={c.key} type="button" className="chip py-1.5" aria-pressed={active === c.key} onClick={() => setCategory(c.key)}>{categoryLabel(c, lang)}</button>
              ))}
            </div>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="panel p-10 text-center">
            <p className="my font-semibold">{t("shop.empty")}</p>
            <button type="button" className="btn-ghost mt-4" onClick={() => { setQuery(""); setCategory("all"); }}>{t("shop.clear")}</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {visible.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      <section aria-labelledby="how-title" className="rounded-3xl border border-line bg-surface p-5 sm:p-8">
        <h2 id="how-title" className="my mb-5 font-display text-xl font-bold sm:text-2xl">{t("home.howTitle")}</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {steps.map((text, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-brand-strong font-display font-bold text-white">{i + 1}</span>
              <p className="my pt-1.5 text-sm">{text}</p>
            </li>
          ))}
        </ol>
        {paymentMethods.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-5">
            <span className="my mr-1 text-sm text-muted">{t("home.weAccept")}</span>
            {paymentMethods.map((m) => (
              <span key={m.id} className="badge border border-line bg-raised px-3 py-1.5 text-sm text-text">{m.provider_name}</span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
