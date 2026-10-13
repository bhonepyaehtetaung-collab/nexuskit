"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useCart } from "@/app/context/cartContext";
import { useT } from "@/lib/i18n";
import LoginPanel from "../components/LoginPanel";
import { daysUntil, formatPrice, STATUS_TONE } from "@/lib/format";
import { ProductArt } from "../components/ProductCard";
import { findRenewals } from "@/lib/renewals";
import { useCatalog } from "@/lib/catalog";
import { CheckIcon, CloseIcon, CopyIcon, KeyIcon, MailIcon, UploadIcon } from "../components/icons";

type Order = any;

const isPayLaterOrder = (o: Order) => o.payment_method === "pay_later" || String(o.slip_url || "").includes("placehold");

/** Placed → Checking → Delivered progress for one order. */
function OrderProgress({ order }: { order: Order }) {
  const { t } = useT();
  if (order.status === "cancelled") return null;
  const payLater = isPayLaterOrder(order);
  const steps = payLater ? [t("prog.requested"), t("prog.setup"), t("prog.paid")] : [t("prog.placed"), t("prog.checking"), t("prog.delivered")];
  const hasSlip = order.slip_url && !String(order.slip_url).includes("placehold");
  const current = order.status === "completed" ? 3 : order.status === "awaiting_payment" ? 2 : payLater && hasSlip ? 2 : 1;
  return (
    <ol className="flex items-center gap-2 text-xs" aria-label="Order progress">
      {steps.map((label, i) => {
        const done = i < current;
        return (
          <li key={label} className="flex flex-1 flex-col gap-1.5">
            <span className={`h-1.5 rounded-full ${done ? "bg-mint" : "bg-raised"}`} />
            <span className={done ? "text-text" : "text-muted"}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function SubscriptionMeter({ item }: { item: any }) {
  const { t } = useT();
  const total = Number(item.subscription_days) || 0;
  const left = daysUntil(item.end_date);
  if (!total || left === null) return null;
  const pct = Math.max(0, Math.min(100, (left / total) * 100));
  const expired = left <= 0;
  return (
    <div className="mt-2 space-y-1">
      <div className="h-1.5 overflow-hidden rounded-full bg-raised">
        <div className={`h-full rounded-full ${expired ? "bg-danger" : left <= 5 ? "bg-pass" : "bg-mint"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-xs ${expired ? "text-danger" : left <= 5 ? "text-pass" : "text-muted"}`}>
        {expired ? t("acc.expired") : t("acc.daysLeft", { n: left })}
      </p>
    </div>
  );
}

function CredentialsBox({ note }: { note: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border border-mint/30 bg-mint/5 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="my flex items-center gap-2 text-sm font-semibold text-mint"><KeyIcon size={16} /> {t("acc.access")}</p>
        <button
          type="button"
          className="btn-ghost px-3 py-1.5 text-xs"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(note);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch { /* clipboard blocked */ }
          }}
        >
          {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />} {copied ? t("co.copied") : t("co.copy")}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-words rounded-lg bg-ink p-3 font-sans text-sm">{note}</pre>
    </div>
  );
}

function SlipUpload({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const { t } = useT();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("orderId", orderId);
      form.append("slip", file);
      const res = await fetch("/api/orders/slip", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("co.errGeneric"));
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-info/30 bg-info/5 p-4">
      <p className="my text-sm">{t("acc.uploadNote")}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => input.current?.click()} className="btn-ghost flex-1 justify-start truncate">
          <UploadIcon size={16} /> {file ? file.name : t("acc.choose")}
        </button>
        <button type="button" onClick={submit} disabled={!file || busy} className="btn-primary">
          {busy ? t("acc.uploading") : t("acc.send")}
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => { setFile(e.target.files?.[0] || null); setError(""); e.target.value = ""; }}
      />
      {error && <p className="my text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}

function OrderPass({ order, onRefresh }: { order: Order; onRefresh: () => void }) {
  const { t } = useT();
  const router = useRouter();
  const { addItem } = useCart();
  const statusKey = `status.${order.status}` as Parameters<typeof t>[0];
  const statusLabel = ["pending", "awaiting_payment", "completed", "cancelled"].includes(order.status) ? t(statusKey) : order.status;

  const buyAgain = () => {
    (order.items || []).forEach((item: any) => addItem(item, item.quantity || 1));
    router.push("/cart");
  };

  return (
    <article className="pass">
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">
            #{String(order.id).slice(0, 8)}
            <span className="ml-2">{new Date(order.created_at).toLocaleDateString()}</span>
          </p>
          <span className={`badge ${STATUS_TONE[order.status] ?? "bg-raised text-muted"}`}>{statusLabel}</span>
        </div>

        <OrderProgress order={order} />

        <ul className="space-y-3">
          {(order.items || []).map((item: any, i: number) => (
            <li key={i} className="flex gap-3">
              <span className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-raised">
                <ProductArt product={item} className="text-sm" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-medium">{item.name}</p>
                <p className="text-xs text-muted">× {item.quantity || 1}{item.product_type ? ` · ${item.product_type}` : ""}</p>
                {order.status === "completed" && <SubscriptionMeter item={item} />}
              </div>
            </li>
          ))}
        </ul>

        {(order.status === "completed" || order.status === "awaiting_payment") && order.admin_note && <CredentialsBox note={order.admin_note} />}
        {order.status === "awaiting_payment" && <SlipUpload orderId={String(order.id)} onDone={onRefresh} />}
        {order.status === "pending" && (
          <p className="my text-sm text-muted">{isPayLaterOrder(order) && !order.admin_note ? t("acc.pendingSetup") : t("acc.pendingPay")}</p>
        )}
      </div>
      <div className="pass-tear" />
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <span className="price text-lg">{formatPrice(order.total_amount)}</span>
        {(order.status === "completed" || order.status === "cancelled") && (order.items || []).length > 0 && (
          <button type="button" onClick={buyAgain} className="btn-ghost px-4 py-2">{t("acc.buyAgain")}</button>
        )}
      </div>
    </article>
  );
}

/** Contact options and a short FAQ (replaces the old Contact/About pages). */
function HelpSection() {
  const { t } = useT();
  const { data } = useCatalog();
  const s = data?.settings || {};
  const telegram = typeof s.telegram_url === "string" && /^https?:\/\//i.test(s.telegram_url) ? s.telegram_url : null;
  const faqs = [["help.q1", "help.a1"], ["help.q2", "help.a2"], ["help.q3", "help.a3"]] as const;
  return (
    <section id="help" className="scroll-mt-20 space-y-4">
      <h2 className="my font-display text-xl font-bold">{t("help.title")}</h2>
      <div className="panel space-y-4 p-5">
        <p className="my text-sm text-muted">{t("help.sub")}</p>
        <div className="flex flex-wrap gap-2">
          {telegram && <a href={telegram} target="_blank" rel="noopener noreferrer" className="btn bg-[#2AABEE] text-white hover:bg-[#2AABEE]/90">{t("support.chat")}</a>}
          {s.contact_email && <a href={`mailto:${s.contact_email}`} className="btn-ghost">{s.contact_email}</a>}
        </div>
      </div>
      <div className="panel divide-y divide-line">
        {faqs.map(([q, a]) => (
          <details key={q} className="group p-5">
            <summary className="my flex cursor-pointer list-none items-center justify-between gap-3 font-medium">
              {t(q)}
              <span className="text-muted transition-transform group-open:rotate-45" aria-hidden="true">+</span>
            </summary>
            <p className="my mt-3 text-sm text-muted">{t(a)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function MyJobs() {
  const { t } = useT();
  const [jobs, setJobs] = useState<any[]>([]);
  const supabase = useMemo(() => createClient(), []);
  const load = useCallback(() => {
    supabase.from("jobs").select("*").order("created_at", { ascending: false }).then(({ data, error }) => {
      if (!error) setJobs(data || []);
    });
  }, [supabase]);
  useEffect(load, [load]);
  // Staff can read every job; only show the ones this person posted.
  const [email, setEmail] = useState("");
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setEmail((data.user?.email || "").toLowerCase())); }, [supabase]);
  const mine = jobs.filter((j) => String(j.poster_email).toLowerCase() === email);
  if (mine.length === 0) return null;
  const tone: Record<string, string> = { pending: "bg-pass/15 text-pass", approved: "bg-mint/15 text-mint", rejected: "bg-danger/15 text-danger", closed: "bg-raised text-muted" };
  return (
    <section className="space-y-4">
      <h2 className="my font-display text-xl font-bold">{t("jobs.mine")}</h2>
      <ul className="panel divide-y divide-line">
        {mine.map((j) => (
          <li key={j.id} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{j.title}</p>
              <span className={`badge mt-1 ${tone[j.status] || ""}`}>{t(`jobs.st.${j.status}` as any)}</span>
            </div>
            {(j.status === "approved" || j.status === "pending") && (
              <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={async () => { await supabase.rpc("close_job", { p_id: String(j.id) }); load(); }}>
                {t("jobs.close")}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function LoginCard() {
  const { t } = useT();
  return (
    <div className="container-page flex flex-1 items-center justify-center py-12">
      <div className="panel w-full max-w-md p-6 sm:p-8">
        <LoginPanel next="/my-account" title={t("acc.title")} sub={t("acc.loginSub")} />
      </div>
    </div>
  );
}

export default function MyAccountPage() {
  const { t } = useT();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");
  const [notice, setNotice] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    // RLS returns only orders placed with this account's confirmed email.
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders(data || []);
    setLoadingOrders(false);
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // Load orders and listen for status changes made by the store.
  useEffect(() => {
    if (!user?.email) return;
    fetchOrders();
    const channel = supabase
      .channel(`customer-orders-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload: any) => {
        const next = payload.new?.status;
        const prev = payload.old?.status;
        if (next === "completed" && prev !== "completed") setNotice(t("acc.notifyDone"));
        else if (next === "awaiting_payment" && prev !== "awaiting_payment") setNotice(t("acc.notifySetup"));
        fetchOrders();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.email, supabase, fetchOrders]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (checking) {
    return <div className="container-page py-16"><div className="mx-auto h-64 max-w-md animate-pulse rounded-2xl bg-surface" /></div>;
  }
  if (!user) {
    return (
      <>
        <LoginCard />
        <div className="container-page max-w-md pb-16"><HelpSection /></div>
      </>
    );
  }
  const renewals = findRenewals(orders);

  const visible = orders.filter((o) =>
    filter === "all" ? true : filter === "done" ? ["completed", "cancelled"].includes(o.status) : !["completed", "cancelled"].includes(o.status),
  );
  const needsAction = orders.filter((o) => o.status === "awaiting_payment").length;

  return (
    <div className="container-page pb-16 pt-6 sm:pt-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-strong font-display text-lg font-bold text-white">
            {String(user.email || "?").charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="my font-display text-2xl font-bold">{t("acc.title")}</h1>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
        </div>
        <button type="button" onClick={async () => { await supabase.auth.signOut(); setOrders([]); }} className="btn-ghost">
          {t("acc.logout")}
        </button>
      </header>

      {needsAction > 0 && (
        <p className="my mb-6 rounded-xl border border-info/30 bg-info/10 p-4 text-sm">{t("acc.needSlip", { n: needsAction })}</p>
      )}

      <div className="mb-5 flex gap-2" role="group" aria-label="Filter">
        {([["all", t("acc.all")], ["active", t("acc.active")], ["done", t("acc.done")]] as const).map(([key, label]) => (
          <button key={key} type="button" className="chip" aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      {loadingOrders && orders.length === 0 ? (
        <div className="grid gap-5 md:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-64 animate-pulse rounded-pass bg-surface" />)}</div>
      ) : orders.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 p-10 text-center">
          <p className="my font-semibold">{t("acc.noOrders")}</p>
          <p className="my max-w-sm text-sm text-muted">{t("acc.noOrdersSub")}</p>
          <Link href="/" className="btn-primary mt-2">{t("cart.browse")}</Link>
        </div>
      ) : visible.length === 0 ? (
        <p className="panel my p-8 text-center text-muted">{t("acc.noneHere")}</p>
      ) : (
        <div className="grid items-start gap-5 md:grid-cols-2">
          {visible.map((order) => <OrderPass key={order.id} order={order} onRefresh={fetchOrders} />)}
        </div>
      )}

      {renewals.length > 0 && (
        <section className="mt-10 space-y-4">
          <h2 className="my font-display text-xl font-bold">{t("renew.title")}</h2>
          <ul className="panel divide-y divide-line">
            {renewals.map((r) => (
              <li key={r.id} className="flex items-center gap-3 p-4">
                <span className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-raised"><ProductArt product={r} className="text-xs" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className={`text-xs ${r.daysLeft <= 0 ? "text-danger" : "text-pass"}`}>{r.daysLeft <= 0 ? t("acc.expired") : t("acc.daysLeft", { n: r.daysLeft })}</p>
                </div>
                <Link href={`/products/${r.id}`} className="btn-pass px-4 py-2">{t("renew.button")}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 space-y-10">
        <MyJobs />
        <HelpSection />
      </div>

      {notice && (
        <div role="status" className="fixed inset-x-4 top-[calc(4.75rem+env(safe-area-inset-top))] z-[60] mx-auto flex max-w-sm animate-slide-up items-start gap-3 rounded-2xl border border-mint/40 bg-raised p-4 shadow-2xl md:bottom-6 md:left-auto md:right-6 md:top-auto md:mx-0">
          <CheckIcon size={18} className="mt-0.5 text-mint" />
          <p className="my flex-1 text-sm">{notice}</p>
          <button type="button" onClick={() => setNotice(null)} className="text-muted hover:text-text" aria-label={t("acc.dismiss")}>
            <CloseIcon size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
