"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import LoginPanel from "../components/LoginPanel";
import { createClient } from "@/utils/supabase/client";
import { useCart } from "@/app/context/cartContext";
import { formatPrice } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { rememberFields } from "@/lib/catalog";
import { ProductArt } from "@/app/components/ProductCard";
import { ArrowLeftIcon, CheckIcon, CloseIcon, CopyIcon, LockIcon, TagIcon, UploadIcon } from "@/app/components/icons";

const MAX_SLIP_MB = 5;

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5 sm:p-6" aria-labelledby={`step-${step}`}>
      <h2 id={`step-${step}`} className="my mb-5 flex items-center gap-3 font-semibold sm:text-lg">
        <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-brand-strong text-sm font-bold text-white">{step}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost flex-shrink-0 px-3 py-2 text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
      {copied ? t("co.copied") : label || t("co.copy")}
    </button>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { t } = useT();
  const { cart, dispatch, subtotal, hydrated } = useCart();

  const [methods, setMethods] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [info, setInfo] = useState<Record<string, string>>({});
  const [method, setMethod] = useState<string>("");
  const [slip, setSlip] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discountPercent: number } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [checkingPromo, setCheckingPromo] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const synced = useRef(false);

  // Load payment options, prefill email + IDs, refresh cart prices from the database.
  useEffect(() => {
    if (!hydrated) return;
    const supabase = createClient();
    const ids = cart.filter((i) => i.kind !== "bundle").map((i) => i.id);

    const prefill: Record<string, string> = {};
    cart.forEach((item) => Object.entries(item.fields || {}).forEach(([k, v]) => { if (!prefill[k]) prefill[k] = v; }));
    setInfo((cur) => ({ ...prefill, ...cur }));

    Promise.all([
      supabase.from("payment_methods").select("*"),
      supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.auth.getUser(),
      ids.length && !synced.current ? supabase.from("products").select("*").in("id", ids) : Promise.resolve({ data: null }),
    ]).then(([methodsRes, settingsRes, userRes, productsRes]) => {
      const list = methodsRes.data || [];
      setMethods(list);
      setSettings(settingsRes.data || { enable_pay_later: true });
      if (list.length === 1) setMethod((m) => m || String(list[0].id));
      const u = userRes.data.user;
      setUser(u ?? null);
      if (u?.email) setEmail(u.email);
      if (productsRes.data) {
        synced.current = true;
        dispatch({ type: "SYNC_PRODUCTS", payload: productsRes.data });
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Signing in on this page (Google / email link) updates the form at once.
  useEffect(() => {
    const { data } = createClient().auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.email) setEmail(session.user.email);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!slip) {
      setSlipPreview(null);
      return;
    }
    const url = URL.createObjectURL(slip);
    setSlipPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [slip]);

  const requiredFields = useMemo(() => {
    const set = new Set<string>();
    cart.forEach((item) => (item.required_fields || []).forEach((f) => set.add(f)));
    return Array.from(set);
  }, [cart]);

  const payLaterEnabled = settings.enable_pay_later !== false;
  const isPayLater = method === "pay-later";
  const selectedMethod = methods.find((m) => String(m.id) === method);
  const discount = promo ? Math.round(subtotal * promo.discountPercent) / 100 : 0;
  const total = Math.max(0, subtotal - discount);

  const pickSlip = (file: File | undefined | null) => {
    setError("");
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return setError(t("co.errType"));
    if (file.size > MAX_SLIP_MB * 1024 * 1024) return setError(t("co.errSize", { mb: MAX_SLIP_MB }));
    setSlip(file);
  };

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;
    setCheckingPromo(true);
    setPromoError("");
    try {
      const res = await fetch("/api/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("co.errPromo"));
      setPromo(data);
      setPromoInput("");
    } catch (e: any) {
      setPromo(null);
      setPromoError(e.message);
    } finally {
      setCheckingPromo(false);
    }
  };

  /** Order notes: shared fields once, plus per-item values when two items differ. */
  const buildInfo = () => {
    const out: Record<string, string> = { ...info };
    cart.forEach((item) =>
      Object.entries(item.fields || {}).forEach(([k, v]) => {
        if (out[k] !== undefined && out[k] !== v) out[`${k} (${item.name})`.slice(0, 100)] = v;
      }),
    );
    return out;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!method) return setError(t("co.errMethod"));
    if (!isPayLater && !slip) return setError(t("co.errSlip"));

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append(
        "payload",
        JSON.stringify({
          email,
          name,
          phone,
          info: buildInfo(),
          paymentMethod: method,
          promoCode: promo?.code ?? null,
          items: cart.map((i) => (i.kind === "bundle" ? { bundleId: i.bundle_id, quantity: i.quantity } : { id: i.id, quantity: i.quantity })),
        }),
      );
      if (!isPayLater && slip) form.append("slip", slip);

      const res = await fetch("/api/orders", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("co.errGeneric"));

      if (requiredFields.length) rememberFields(info);
      dispatch({ type: "CLEAR_CART" });
      const params = new URLSearchParams({ type: isPayLater ? "pay-later" : "standard", order: String(data.id).slice(0, 8) });
      router.push(`/success?${params}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (!hydrated || loading) {
    return (
      <div className="container-page grid gap-6 py-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-surface" />)}</div>
        <div className="h-64 animate-pulse rounded-2xl bg-surface" />
      </div>
    );
  }

  if (cart.length === 0 && !submitting) {
    return (
      <div className="container-page flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="my font-display text-2xl font-bold">{t("co.nothing")}</h1>
        <p className="my text-muted">{t("cart.emptySub")}</p>
        <Link href="/" className="btn-primary">{t("cart.browse")}</Link>
      </div>
    );
  }

  // Orders are tied to a signed-in, verified email (so access details can't get lost).
  if (!user) {
    return (
      <div className="container-page flex flex-1 flex-col items-center justify-center py-10">
        <div className="w-full max-w-md space-y-4">
          <Link href="/cart" className="inline-flex items-center gap-2 text-sm text-muted hover:text-text">
            <ArrowLeftIcon size={16} /> {t("cart.title")}
          </Link>
          <div className="panel p-6 sm:p-8">
            <LoginPanel next="/checkout" title={t("co.loginTitle")} sub={t("co.loginSub")} />
          </div>
          <p className="my text-center text-xs text-muted">{t("co.loginWhy")}</p>
        </div>
      </div>
    );
  }

  const submitLabel = submitting ? t("co.placing") : isPayLater ? t("co.requestSetup") : t("co.place");
  const submitClass = isPayLater ? "btn bg-mint text-ink hover:bg-mint/90" : "btn-primary";
  let step = 0;

  return (
    <form onSubmit={handleSubmit} className="container-page pb-36 pt-4 sm:pt-8 lg:pb-16">
      <Link href="/cart" className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-text">
        <ArrowLeftIcon size={16} /> {t("cart.title")}
      </Link>
      <h1 className="mb-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">{t("co.title")}</h1>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Section step={++step} title={t("co.details")}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="label">{t("co.email")}</label>
                <input id="email" type="email" value={email} readOnly className="field cursor-not-allowed opacity-80" />
                <p className="hint my">{t("co.emailHint")}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="label">{t("co.name")} <span className="font-normal text-muted">{t("co.optional")}</span></label>
                  <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="field" maxLength={100} />
                </div>
                <div>
                  <label htmlFor="phone" className="label">{t("co.phone")} <span className="font-normal text-muted">{t("co.optional")}</span></label>
                  <input id="phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="field" placeholder="09…" maxLength={40} />
                </div>
              </div>
              {requiredFields.length > 0 && (
                <div className="space-y-4 rounded-xl border border-brand/30 bg-brand/5 p-4">
                  <p className="my text-sm text-muted">{t("co.needed")}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {requiredFields.map((field, i) => (
                      <div key={field}>
                        <label htmlFor={`info-${i}`} className="label">{field}</label>
                        <input id={`info-${i}`} required maxLength={500} value={info[field] || ""} onChange={(e) => setInfo({ ...info, [field]: e.target.value })} className="field" autoComplete="off" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          <Section step={++step} title={t("co.payment")}>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t("co.payment")}>
              {methods.map((m) => {
                const active = method === String(m.id);
                return (
                  <label key={m.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 transition-colors ${active ? "border-brand bg-brand/10" : "border-line bg-raised hover:border-muted/50"}`}>
                    <input type="radio" name="method" value={m.id} checked={active} onChange={() => setMethod(String(m.id))} className="sr-only" />
                    <span className="grid h-11 w-11 flex-shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
                      {m.qr_url ? <img src={m.qr_url} alt="" className="h-full w-full object-contain" /> : <span className="text-xs font-bold text-ink">{String(m.provider_name).slice(0, 2)}</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{m.provider_name}</span>
                      <span className="block truncate text-xs text-muted">{m.account_details}</span>
                    </span>
                    {active && <CheckIcon size={18} className="text-brand" />}
                  </label>
                );
              })}
              {payLaterEnabled && (
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 transition-colors sm:col-span-2 ${isPayLater ? "border-mint bg-mint/10" : "border-line bg-raised hover:border-muted/50"}`}>
                  <input type="radio" name="method" value="pay-later" checked={isPayLater} onChange={() => { setMethod("pay-later"); setSlip(null); }} className="sr-only" />
                  <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-mint/20 text-xl" aria-hidden="true">🤝</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{settings.pay_later_label || t("co.payLater")}</span>
                    <span className="my block text-xs text-muted">{settings.pay_later_subtitle || t("co.payLaterSub")}</span>
                  </span>
                  {isPayLater && <CheckIcon size={18} className="text-mint" />}
                </label>
              )}
              {!payLaterEnabled && methods.length === 0 && <p className="my text-sm text-muted">{t("co.noMethods")}</p>}
            </div>

            {selectedMethod && (
              <div className="mt-5 grid animate-fade-in gap-5 rounded-xl border border-line bg-ink/50 p-4 sm:grid-cols-[180px_1fr] sm:items-center">
                {selectedMethod.qr_url && (
                  <img src={selectedMethod.qr_url} alt={`${selectedMethod.provider_name} QR`} className="mx-auto aspect-square w-44 rounded-xl bg-white object-contain p-2" />
                )}
                <div className="space-y-3">
                  <p className="my text-sm text-muted">{t("co.sendTo", { amount: formatPrice(total), provider: selectedMethod.provider_name })}</p>
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-raised px-3 py-2">
                    <span className="price">{formatPrice(total)}</span>
                    <CopyButton text={String(Math.round(total * 100) / 100)} label={t("co.copyAmount")} />
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-raised px-3 py-2">
                    <span className="break-all text-sm font-medium">{selectedMethod.account_details}</span>
                    <CopyButton text={String(selectedMethod.account_details ?? "")} />
                  </div>
                </div>
              </div>
            )}
          </Section>

          {!isPayLater && (
            <Section step={++step} title={t("co.slip")}>
              {slip && slipPreview ? (
                <div className="flex items-center gap-4 rounded-xl border border-line bg-raised p-3">
                  <img src={slipPreview} alt="" className="h-24 w-20 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{slip.name}</p>
                    <p className="text-xs text-muted">{(slip.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <button type="button" onClick={() => setSlip(null)} className="btn-quiet h-9 w-9 p-0" aria-label={t("co.removeSlip")}>
                    <CloseIcon size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); pickSlip(e.dataTransfer.files?.[0]); }}
                  className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? "border-brand bg-brand/10" : "border-line hover:border-muted/60"}`}
                >
                  <UploadIcon size={26} className="text-brand" />
                  <span className="my font-medium">{t("co.upload")}</span>
                  <span className="text-xs text-muted">{t("co.uploadHint", { mb: MAX_SLIP_MB })}</span>
                </button>
              )}
              <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { pickSlip(e.target.files?.[0]); e.target.value = ""; }} />
            </Section>
          )}
        </div>

        {/* Order summary as a receipt */}
        <aside className="pass lg:sticky lg:top-24">
          <div className="p-5">
            <h2 className="my mb-4 font-semibold sm:text-lg">{t("co.summary")}</h2>
            <ul className="space-y-3">
              {cart.map((item) => (
                <li key={item.id} className="flex items-center gap-3 text-sm">
                  <span className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-raised">
                    <ProductArt product={item} className="text-xs" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1">{item.name}</span>
                    <span className="text-xs text-muted">{t("co.qty", { n: item.quantity })}</span>
                  </span>
                  <span className="tabular-nums">{formatPrice(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5">
              {promo ? (
                <div className="flex items-center justify-between rounded-xl border border-mint/40 bg-mint/10 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-mint"><TagIcon size={16} /> {promo.code} ({t("co.off", { n: promo.discountPercent })})</span>
                  <button type="button" onClick={() => setPromo(null)} className="text-xs text-muted hover:text-text">{t("co.removePromo")}</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <label htmlFor="promo" className="sr-only">{t("co.promo")}</label>
                  <input
                    id="promo"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyPromo(); } }}
                    placeholder={t("co.promo")}
                    className="field py-2.5 uppercase"
                    maxLength={40}
                  />
                  <button type="button" onClick={applyPromo} disabled={checkingPromo || !promoInput.trim()} className="btn-ghost py-2.5">
                    {checkingPromo ? t("co.checking") : t("co.apply")}
                  </button>
                </div>
              )}
              {promoError && <p className="my mt-2 text-xs text-danger" role="alert">{promoError}</p>}
            </div>
          </div>

          <div className="pass-tear" />

          <div className="space-y-2 p-5 text-sm">
            <div className="flex justify-between text-muted"><span>{t("cart.subtotal")}</span><span className="tabular-nums">{formatPrice(subtotal)}</span></div>
            {promo && <div className="flex justify-between text-mint"><span>{t("co.discount")}</span><span className="tabular-nums">−{formatPrice(discount)}</span></div>}
            <div className="flex items-baseline justify-between pt-2">
              <span className="font-semibold">{t("co.total")}</span>
              <span className="price text-2xl">{formatPrice(total)}</span>
            </div>

            {error && <p className="my rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger" role="alert">{error}</p>}

            <button type="submit" disabled={submitting} className={`btn-lg mt-2 hidden w-full lg:inline-flex ${submitClass}`}>
              {submitLabel}
            </button>
            <p className="my flex items-center justify-center gap-1.5 pt-1 text-xs text-muted">
              <LockIcon size={14} /> {t("co.private")}
            </p>
          </div>
        </aside>
      </div>

      {/* Phone: fixed action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
        {error && <p className="my mb-2 text-xs text-danger" role="alert">{error}</p>}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">{t("co.total")}</p>
            <p className="price text-xl leading-tight">{formatPrice(total)}</p>
          </div>
          <button type="submit" disabled={submitting} className={`h-12 px-6 ${submitClass}`}>{submitLabel}</button>
        </div>
      </div>
    </form>
  );
}
