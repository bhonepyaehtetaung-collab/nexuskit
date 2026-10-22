"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useT } from "@/lib/i18n";
import { formatPrice, STATUS_TONE } from "@/lib/format";
import { ProductArt } from "../../components/ProductCard";
import { SearchIcon } from "../../components/icons";
import { type AdminData, hasSlip, isPayLater, orderStage, parseNote } from "../data";
import { CopyChip, Empty, PageHeader, Sheet, useAdminUi } from "../ui";

const STAGE_TONE: Record<string, string> = {
  verify: "bg-pass/15 text-pass",
  setup: "bg-mint/15 text-mint",
  awaiting: "bg-info/15 text-info",
  completed: STATUS_TONE.completed,
  cancelled: STATUS_TONE.cancelled,
};

/** Private payment slip: short-lived signed link (old slips were public URLs). */
function SlipPreview({ order }: { order: any }) {
  const { t } = useT();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const slip = hasSlip(order) ? String(order.slip_url) : null;

  useEffect(() => {
    let alive = true;
    setUrl(null);
    setFailed(false);
    if (!slip) return;
    if (/^https?:\/\//.test(slip)) {
      setUrl(slip);
      return;
    }
    createClient().storage.from("payment-slips").createSignedUrl(slip, 600).then(({ data, error }) => {
      if (!alive) return;
      if (error || !data) setFailed(true);
      else setUrl(data.signedUrl);
    });
    return () => { alive = false; };
  }, [slip]);

  if (!slip) return <p className="my rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">{t("ad.o.noSlip")}</p>;
  if (failed) return <p className="my rounded-xl border border-danger/40 p-4 text-center text-sm text-danger">{t("ad.o.slipFail")}</p>;
  if (!url) return <div className="h-64 animate-pulse rounded-xl bg-raised" />;
  return (
    <a href={url} target="_blank" rel="noreferrer noopener" className="block overflow-hidden rounded-xl border border-line bg-ink">
      <img src={url} alt={t("ad.o.slip")} className="mx-auto max-h-[420px] w-full object-contain" />
    </a>
  );
}

function OrderSheet({ order, data, onClose }: { order: any; data: AdminData; onClose: () => void }) {
  const { t } = useT();
  const { toast, confirm } = useAdminUi();
  const [note, setNote] = useState(order.admin_note || "");
  const [busy, setBusy] = useState(false);
  const stage = orderStage(order);
  const info = parseNote(order.order_note);

  const update = async (patch: any, message: string) => {
    setBusy(true);
    const { error } = await data.supabase.from("orders").update(patch).eq("id", order.id);
    setBusy(false);
    if (error) return toast(t("ad.error", { msg: error.message }), "error");
    toast(message);
    await data.reload.orders();
    onClose();
  };

  const deliver = async () => {
    if (!note.trim() && !(await confirm(t("ad.o.needAccess"), false))) return;
    const now = new Date();
    const items = (order.items || []).map((item: any) => {
      const days = Number(item.subscription_days) || 0;
      if (days <= 0) return item;
      const end = new Date(now);
      end.setDate(end.getDate() + days);
      return { ...item, start_date: now.toISOString(), end_date: end.toISOString() };
    });
    await update({ status: "completed", admin_note: note, start_date: now.toISOString(), items }, t("ad.o.done"));
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={<>#{String(order.id).slice(0, 8)} <span className={`badge ml-2 align-middle ${STAGE_TONE[stage]}`}>{stageLabel(t, stage)}</span></>}
      footer={
        <div className="space-y-2">
          {stage !== "completed" && stage !== "cancelled" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" disabled={busy} onClick={deliver} className="btn btn-lg bg-mint text-night hover:bg-mint/90">{t("ad.o.deliver")}</button>
              {stage === "setup" ? (
                <button type="button" disabled={busy} onClick={() => update({ status: "awaiting_payment", admin_note: note }, t("ad.o.asked"))} className="btn-primary btn-lg">{t("ad.o.askPay")}</button>
              ) : (
                <button type="button" disabled={busy} onClick={() => update({ admin_note: note }, t("ad.saved"))} className="btn-ghost btn-lg">{t("ad.o.saveNote")}</button>
              )}
            </div>
          )}
          {stage === "completed" && (
            <button type="button" disabled={busy} onClick={() => update({ admin_note: note }, t("ad.saved"))} className="btn-primary btn-lg w-full">{t("ad.o.saveNote")}</button>
          )}
          <div className="flex justify-between">
            {stage !== "cancelled" ? (
              <button type="button" disabled={busy} className="btn-quiet px-3 py-2 text-sm text-danger" onClick={async () => { if (await confirm(t("ad.o.confirmCancel"))) update({ status: "cancelled" }, t("ad.o.cancelled")); }}>{t("ad.o.cancel")}</button>
            ) : (
              <button type="button" disabled={busy} className="btn-quiet px-3 py-2 text-sm" onClick={() => update({ status: "pending" }, t("ad.saved"))}>{t("ad.o.reopen")}</button>
            )}
            {stage === "completed" && (
              <button type="button" disabled={busy} className="btn-quiet px-3 py-2 text-sm" onClick={() => update({ status: "pending" }, t("ad.saved"))}>{t("ad.o.reopen")}</button>
            )}
          </div>
        </div>
      }
    >
      <section className="space-y-2">
        <h3 className="my text-sm font-semibold text-muted">{t("ad.o.customer")}</h3>
        <CopyChip label={order.customer_name || "Customer"} value={order.customer_email || "—"} />
      </section>

      {info.length > 0 && (
        <section className="space-y-2">
          <h3 className="my text-sm font-semibold text-muted">{t("ad.o.info")}</h3>
          {info.map((x, i) => <CopyChip key={i} label={x.label} value={x.value} />)}
        </section>
      )}

      <section className="space-y-2">
        <h3 className="my text-sm font-semibold text-muted">{t("ad.o.items")}</h3>
        <ul className="divide-y divide-line rounded-xl border border-line">
          {(order.items || []).map((it: any, i: number) => (
            <li key={i} className="flex items-center gap-3 p-3 text-sm">
              <span className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-raised"><ProductArt product={it} className="text-xs" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{it.name} × {it.quantity || 1}</span>
                {it.bundle && <span className="text-xs text-muted">{it.bundle}</span>}
              </span>
              <span className="tabular-nums">{formatPrice(Number(it.price) * (it.quantity || 1))}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between rounded-xl bg-raised px-3 py-2.5 text-sm">
          <span className="text-muted">
            {t("ad.o.method")}: <span className="text-text">{isPayLater(order) ? t("ad.o.payLater") : order.payment_method || "—"}</span>
            {order.promo_code && <span className="ml-2 text-mint">{order.promo_code} −{order.discount_percent}%</span>}
          </span>
          <span className="price">{formatPrice(order.total_amount)}</span>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="my text-sm font-semibold text-muted">{t("ad.o.slip")}</h3>
        <SlipPreview order={order} />
      </section>

      <section className="space-y-2">
        <label htmlFor="access" className="my block text-sm font-semibold text-muted">{t("ad.o.access")}</label>
        <textarea id="access" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("ad.o.accessPh")} className="field font-mono text-sm" />
      </section>
    </Sheet>
  );
}

function stageLabel(t: ReturnType<typeof useT>["t"], stage: string) {
  return stage === "verify" ? t("ad.o.verify") : stage === "setup" ? t("ad.o.setup") : stage === "awaiting" ? t("ad.f.awaiting") : stage === "completed" ? t("ad.f.completed") : t("ad.f.cancelled");
}

export default function Orders({ data, initialFilter }: { data: AdminData; initialFilter?: string }) {
  const { t } = useT();
  const [filter, setFilter] = useState(initialFilter || "action");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => { if (initialFilter) setFilter(initialFilter); }, [initialFilter]);

  const filters = [
    { key: "action", label: t("ad.f.action"), test: (o: any) => ["verify", "setup"].includes(orderStage(o)) },
    { key: "awaiting", label: t("ad.f.awaiting"), test: (o: any) => orderStage(o) === "awaiting" },
    { key: "completed", label: t("ad.f.completed"), test: (o: any) => o.status === "completed" },
    { key: "cancelled", label: t("ad.f.cancelled"), test: (o: any) => o.status === "cancelled" },
    { key: "all", label: t("ad.f.all"), test: () => true },
  ];

  const list = useMemo(() => {
    const f = filters.find((x) => x.key === filter) ?? filters[0];
    const words = q.trim().toLowerCase();
    return data.orders.filter((o) => f.test(o) && (!words || `${o.id} ${o.customer_email} ${o.customer_name} ${o.order_note}`.toLowerCase().includes(words)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.orders, filter, q]);

  const open = data.orders.find((o) => String(o.id) === openId);

  return (
    <div>
      <PageHeader title={t("ad.orders")} />
      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {filters.map((f) => {
          const n = data.orders.filter(f.test).length;
          return (
            <button key={f.key} type="button" className="chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
              {f.key !== "all" && n > 0 && <span className={`rounded-full px-1.5 text-xs ${f.key === "action" ? "bg-pass text-night" : "bg-raised"}`}>{n}</span>}
            </button>
          );
        })}
      </div>
      <label className="relative mb-4 block">
        <span className="sr-only">{t("ad.search")}</span>
        <SearchIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("ad.o.searchPh")} className="field pl-10" />
      </label>

      {list.length === 0 ? (
        <Empty text={filter === "action" ? `✓ ${t("ad.allDone")}` : t("ad.empty")} />
      ) : (
        <ul className="space-y-2">
          {list.map((o) => {
            const stage = orderStage(o);
            const info = parseNote(o.order_note).filter((x) => x.label !== "Name" && x.label !== "Contact").slice(0, 2);
            return (
              <li key={o.id}>
                <button type="button" onClick={() => setOpenId(String(o.id))} className="panel flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:border-brand/50">
                  <span className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-raised"><ProductArt product={(o.items || [])[0] || { name: "?" }} className="text-xs" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{(o.items || []).map((i: any) => i.name).join(", ") || "—"}</span>
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {o.customer_email} · {new Date(o.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {info.length > 0 && <span className="block truncate text-xs text-text/80">{info.map((x) => `${x.label}: ${x.value}`).join(" · ")}</span>}
                  </span>
                  <span className="flex flex-shrink-0 flex-col items-end gap-1">
                    <span className="price text-sm">{formatPrice(o.total_amount)}</span>
                    <span className={`badge text-[11px] ${STAGE_TONE[stage]}`}>{stageLabel(t, stage)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open && <OrderSheet key={open.id} order={open} data={data} onClose={() => setOpenId(null)} />}
    </div>
  );
}
