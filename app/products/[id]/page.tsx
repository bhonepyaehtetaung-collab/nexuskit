"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/app/context/cartContext";
import { rememberedFields, rememberFields, useCatalog } from "@/lib/catalog";
import { useT } from "@/lib/i18n";
import { categoryKey, formatPrice, productFamily } from "@/lib/format";
import { ProductArt } from "@/app/components/ProductCard";
import { ArrowLeftIcon, BagIcon, CheckIcon, ClockIcon, KeyIcon, MinusIcon, PlusIcon, ShieldIcon } from "@/app/components/icons";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <h2 className="my mb-4 flex items-center gap-3 font-semibold">
        <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-brand-strong text-sm font-bold text-white">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const { t } = useT();
  const { addItem } = useCart();
  const { data, loading } = useCatalog();

  const [selectedId, setSelectedId] = useState(String(params?.id ?? ""));
  const [quantity, setQuantity] = useState(1);
  const [values, setValues] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState(false);
  const [missing, setMissing] = useState<string | null>(null);

  const product = data?.products.find((p) => String(p.id) === selectedId);
  const packages = useMemo(() => {
    if (!data || !product) return [];
    const family = productFamily(product);
    return data.products
      .filter((p) => productFamily(p) === family)
      .sort((a, b) => Number(a.price) - Number(b.price));
  }, [data, product]);

  const fields: string[] = Array.isArray(product?.required_fields) ? product.required_fields : [];

  // Fill Player ID etc. from the last order on this device.
  useEffect(() => {
    if (fields.length === 0) return;
    const saved = rememberedFields();
    const fill: Record<string, string> = {};
    for (const f of fields) if (saved[f] && !values[f]) fill[f] = saved[f];
    if (Object.keys(fill).length) {
      setValues((v) => ({ ...fill, ...v }));
      setPrefilled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.join("|")]);

  if (loading) {
    return (
      <div className="container-page animate-pulse space-y-4 py-6">
        <div className="h-24 rounded-2xl bg-surface" />
        <div className="h-40 rounded-2xl bg-surface" />
        <div className="h-56 rounded-2xl bg-surface" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-page flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">{t("product.notFound")}</h1>
        <Link href="/" className="btn-primary">{t("product.backShop")}</Link>
      </div>
    );
  }

  const days = Number(product.subscription_days) || 0;
  const total = Number(product.price) * quantity;

  const choose = (id: string) => {
    setSelectedId(id);
    setQuantity(1);
    router.replace(`/products/${id}`, { scroll: false });
  };

  const validate = () => {
    for (const f of fields) {
      if (!values[f]?.trim()) {
        setMissing(f);
        document.getElementById(`field-${fields.indexOf(f)}`)?.focus();
        return false;
      }
    }
    setMissing(null);
    return true;
  };

  const add = (goCheckout: boolean) => {
    if (!validate()) return;
    const clean: Record<string, string> = {};
    for (const f of fields) clean[f] = values[f].trim();
    if (fields.length) rememberFields(clean);
    addItem(product, quantity, fields.length ? clean : undefined);
    if (goCheckout) router.push("/checkout");
  };

  let step = 0;

  return (
    <div className="container-page pb-44 pt-4 sm:pt-8 lg:pb-16">
      <Link href={`/?cat=${encodeURIComponent(categoryKey(product.product_type))}`} className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-text">
        <ArrowLeftIcon size={16} /> {product.product_type || t("nav.shop")}
      </Link>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* Product header */}
          <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-raised sm:h-24 sm:w-24">
              <ProductArt product={product} />
            </div>
            <div className="min-w-0 space-y-1">
              <h1 className="font-display text-xl font-bold leading-tight sm:text-2xl">{product.name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                {product.product_type && <span className="badge bg-brand/15 text-brand">{product.product_type}</span>}
                {days > 0 && <span className="inline-flex items-center gap-1"><ClockIcon size={14} /> {t("product.access", { n: days })}</span>}
              </div>
            </div>
          </div>

          {/* 1. Account details (Player ID, etc.) */}
          <Step n={++step} title={t("product.step1")}>
            {fields.length === 0 ? (
              <p className="my text-sm text-muted">{t("product.noFields")}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map((f, i) => (
                  <div key={f}>
                    <label htmlFor={`field-${i}`} className="label">{f}</label>
                    <input
                      id={`field-${i}`}
                      value={values[f] || ""}
                      onChange={(e) => { setValues({ ...values, [f]: e.target.value }); if (missing === f) setMissing(null); }}
                      className={`field ${missing === f ? "border-danger ring-2 ring-danger/25" : ""}`}
                      maxLength={500}
                      autoComplete="off"
                      aria-invalid={missing === f}
                    />
                    {missing === f && <p className="mt-1 text-xs text-danger" role="alert">{t("product.fillFields", { field: f })}</p>}
                  </div>
                ))}
                {prefilled && <p className="my text-xs text-mint sm:col-span-2">✓ {t("product.remembered")}</p>}
              </div>
            )}
          </Step>

          {/* 2. Package */}
          {packages.length > 1 && (
            <Step n={++step} title={t("product.step2")}>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label={t("product.step2")}>
                {packages.map((p) => {
                  const on = String(p.id) === selectedId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => choose(String(p.id))}
                      className={`relative flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-colors ${
                        on ? "border-brand bg-brand/10" : "border-line bg-raised hover:border-muted/50"
                      }`}
                    >
                      {on && (
                        <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-brand text-white">
                          <CheckIcon size={12} />
                        </span>
                      )}
                      <span className="line-clamp-2 pr-5 text-sm font-medium leading-snug">{p.name}</span>
                      <span className="flex flex-wrap items-baseline gap-x-1.5">
                        <span className={`price text-sm ${p.sale ? "text-danger" : ""}`}>{formatPrice(p.price)}</span>
                        {p.sale && <s className="text-[11px] text-muted">{formatPrice(p.list_price)}</s>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {/* 3. Quantity */}
          <Step n={++step} title={t("product.step3")}>
            <div className="inline-flex items-center rounded-xl border border-line bg-raised">
              <button type="button" className="grid h-11 w-11 place-items-center text-muted hover:text-text disabled:opacity-40" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="−">
                <MinusIcon size={16} />
              </button>
              <span className="min-w-10 text-center font-semibold tabular-nums" aria-live="polite">{quantity}</span>
              <button type="button" className="grid h-11 w-11 place-items-center text-muted hover:text-text disabled:opacity-40" onClick={() => setQuantity((q) => Math.min(99, q + 1))} disabled={quantity >= 99} aria-label="+">
                <PlusIcon size={16} />
              </button>
            </div>
          </Step>

          {(
            <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
              <h2 className="mb-3 font-semibold">{t("product.about")}</h2>
              {product.description && <p className="my mb-4 whitespace-pre-wrap text-sm leading-relaxed text-muted">{product.description}</p>}
              <ul className="space-y-2 text-sm">
                <li className="my flex items-center gap-2"><KeyIcon size={16} className="text-brand" /> {t("product.delivery")}</li>
                <li className="my flex items-center gap-2"><ShieldIcon size={16} className="text-brand" /> {t("product.checked")}</li>
              </ul>
            </section>
          )}
        </div>

        {/* Desktop summary */}
        <aside className="hidden space-y-4 rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-24 lg:block">
          <p className="text-sm text-muted">{product.name} × {quantity}</p>
          {product.sale && (
            <p className="my flex items-center gap-2 text-sm">
              <span className="badge bg-danger text-[11px] font-bold text-white">{t("sale.off", { n: product.sale.percent })}</span>
              <span className="text-muted">{product.sale.name}</span>
            </p>
          )}
          <div className="flex items-baseline justify-between">
            <span className="font-semibold">{t("product.total")}</span>
            <span className="price text-3xl">{formatPrice(total)}</span>
          </div>
          <button type="button" onClick={() => add(true)} className="btn-primary btn-lg w-full">{t("product.buyNow")}</button>
          <button type="button" onClick={() => add(false)} className="btn-ghost w-full">
            <BagIcon size={18} /> {t("product.addToCart")}
          </button>
        </aside>
      </div>

      {/* Phone: action bar above the tab bar */}
      <div className="fixed inset-x-0 bottom-[calc(4.4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-ink/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">
              {t("product.total")}
              {product.sale && <span className="ml-1.5 font-bold text-danger">{t("sale.off", { n: product.sale.percent })}</span>}
            </p>
            <p className="price text-xl leading-tight">{formatPrice(total)}</p>
          </div>
          <button type="button" onClick={() => add(false)} className="btn-ghost h-12 w-12 p-0" aria-label={t("product.addToCart")}>
            <BagIcon size={20} />
          </button>
          <button type="button" onClick={() => add(true)} className="btn-primary h-12 px-6">{t("product.buyNow")}</button>
        </div>
      </div>
    </div>
  );
}
