"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/app/context/cartContext";
import { bundleCartItem, rememberedFields, rememberFields, useCatalog } from "@/lib/catalog";
import { useT } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { ProductArt } from "@/app/components/ProductCard";
import { ArrowLeftIcon, BagIcon, CheckIcon, MinusIcon, PlusIcon } from "@/app/components/icons";

export default function BundlePage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const router = useRouter();
  const { t } = useT();
  const { addItem } = useCart();
  const { data, loading } = useCatalog();
  const bundle = data?.bundles.find((b) => String(b.id) === id);

  const [qty, setQty] = useState(1);
  const [values, setValues] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<string | null>(null);
  const fields: string[] = bundle?.required_fields || [];

  useEffect(() => {
    if (!fields.length) return;
    const saved = rememberedFields();
    setValues((v) => {
      const next = { ...v };
      for (const f of fields) if (!next[f] && saved[f]) next[f] = saved[f];
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.join("|")]);

  if (loading) {
    return <div className="container-page animate-pulse space-y-4 py-6"><div className="h-48 rounded-3xl bg-surface" /><div className="h-64 rounded-2xl bg-surface" /></div>;
  }
  if (!bundle) {
    return (
      <div className="container-page flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">{t("bundle.notFound")}</h1>
        <Link href="/" className="btn-primary">{t("product.backShop")}</Link>
      </div>
    );
  }

  const add = (go: boolean) => {
    const empty = fields.find((f) => !values[f]?.trim());
    if (empty) {
      setMissing(empty);
      document.getElementById(`bf-${fields.indexOf(empty)}`)?.focus();
      return;
    }
    const clean = Object.fromEntries(fields.map((f) => [f, values[f].trim()]));
    if (fields.length) rememberFields(clean);
    addItem(bundleCartItem(bundle), qty, fields.length ? clean : undefined);
    if (go) router.push("/checkout");
  };

  return (
    <div className="container-page pb-44 pt-4 sm:pt-8 lg:pb-16">
      <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-text">
        <ArrowLeftIcon size={16} /> {t("nav.store")}
      </Link>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <header className="relative overflow-hidden rounded-3xl border border-line bg-[linear-gradient(140deg,rgb(var(--raised)),rgb(var(--surface)))] p-5 sm:p-8">
            <span className="badge bg-pass text-night">{t("bundle.badge", { n: bundle.discount })}</span>
            <h1 className="my mt-3 font-display text-2xl font-bold leading-snug sm:text-4xl">{bundle.name}</h1>
            {bundle.description && <p className="my mt-2 max-w-xl whitespace-pre-wrap text-muted">{bundle.description}</p>}
            <div className="mt-5 flex -space-x-4">
              {bundle.items.slice(0, 5).map((p: any) => (
                <span key={p.id} className="h-14 w-14 overflow-hidden rounded-2xl border-2 border-surface"><ProductArt product={p} className="text-xs" /></span>
              ))}
            </div>
          </header>

          <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <h2 className="my mb-3 font-semibold">{t("bundle.includes", { n: bundle.items.length })}</h2>
            <ul className="divide-y divide-line">
              {bundle.items.map((p: any) => (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <span className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-raised"><ProductArt product={p} className="text-xs" /></span>
                  <Link href={`/products/${p.id}`} className="min-w-0 flex-1 truncate font-medium hover:text-brand">{p.name}</Link>
                  <span className="text-sm text-muted line-through">{formatPrice(p.price)}</span>
                  <CheckIcon size={16} className="text-mint" />
                </li>
              ))}
            </ul>
          </section>

          {fields.length > 0 && (
            <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
              <h2 className="my mb-4 font-semibold">{t("product.step1")}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map((f, i) => (
                  <div key={f}>
                    <label htmlFor={`bf-${i}`} className="label">{f}</label>
                    <input id={`bf-${i}`} value={values[f] || ""} maxLength={500} autoComplete="off"
                      onChange={(e) => { setValues({ ...values, [f]: e.target.value }); if (missing === f) setMissing(null); }}
                      className={`field ${missing === f ? "border-danger ring-2 ring-danger/25" : ""}`} aria-invalid={missing === f} />
                    {missing === f && <p className="mt-1 text-xs text-danger" role="alert">{t("product.fillFields", { field: f })}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <h2 className="my font-semibold">{t("product.step3")}</h2>
            <div className="inline-flex items-center rounded-xl border border-line bg-raised">
              <button type="button" className="grid h-11 w-11 place-items-center text-muted hover:text-text disabled:opacity-40" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="−"><MinusIcon size={16} /></button>
              <span className="min-w-10 text-center font-semibold tabular-nums">{qty}</span>
              <button type="button" className="grid h-11 w-11 place-items-center text-muted hover:text-text disabled:opacity-40" onClick={() => setQty((q) => Math.min(99, q + 1))} disabled={qty >= 99} aria-label="+"><PlusIcon size={16} /></button>
            </div>
          </section>
        </div>

        <aside className="pass hidden lg:sticky lg:top-24 lg:block">
          <div className="space-y-2 p-5 text-sm">
            <div className="flex justify-between text-muted"><span>{t("bundle.was")}</span><span className="line-through">{formatPrice(bundle.original * qty)}</span></div>
            <div className="flex items-baseline justify-between"><span className="font-semibold">{t("bundle.price")}</span><span className="price text-3xl">{formatPrice(bundle.price * qty)}</span></div>
            <p className="text-right text-mint">{t("bundle.save", { amount: formatPrice((bundle.original - bundle.price) * qty) })}</p>
          </div>
          <div className="pass-tear" />
          <div className="space-y-2 p-5">
            <button type="button" onClick={() => add(true)} className="btn-primary btn-lg w-full">{t("product.buyNow")}</button>
            <button type="button" onClick={() => add(false)} className="btn-ghost w-full"><BagIcon size={18} /> {t("product.addToCart")}</button>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4.4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-ink/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-mint">{t("bundle.save", { amount: formatPrice((bundle.original - bundle.price) * qty) })}</p>
            <p className="price text-xl leading-tight">{formatPrice(bundle.price * qty)}</p>
          </div>
          <button type="button" onClick={() => add(false)} className="btn-ghost h-12 w-12 p-0" aria-label={t("product.addToCart")}><BagIcon size={20} /></button>
          <button type="button" onClick={() => add(true)} className="btn-primary h-12 px-6">{t("product.buyNow")}</button>
        </div>
      </div>
    </div>
  );
}
