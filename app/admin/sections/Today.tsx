"use client";

import { useT } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { type AdminData, expiringItems, orderStage, startOfDay } from "../data";
import { downloadCsv, PageHeader } from "../ui";
import { ClockIcon, ShieldIcon, UploadIcon, BriefcaseIcon, KeyIcon, SparkIcon } from "../../components/icons";

type Go = (tab: string, filter?: string) => void;

export default function Today({ data, go }: { data: AdminData; go: Go }) {
  const { t, lang } = useT();
  const { orders, pendingJobs } = data;

  const verify = orders.filter((o) => orderStage(o) === "verify").length;
  const setup = orders.filter((o) => orderStage(o) === "setup").length;
  const awaiting = orders.filter((o) => orderStage(o) === "awaiting").length;
  const expiring = expiringItems(orders).length;

  const todo = [
    { n: verify, label: t("ad.todo.verify"), Icon: ShieldIcon, tone: "text-pass bg-pass/15", onClick: () => go("orders", "action") },
    { n: setup, label: t("ad.todo.setup"), Icon: KeyIcon, tone: "text-mint bg-mint/15", onClick: () => go("orders", "action") },
    { n: awaiting, label: t("ad.todo.awaiting"), Icon: UploadIcon, tone: "text-info bg-info/15", onClick: () => go("orders", "awaiting") },
    { n: data.aiPending, label: t("ad.todo.ai"), Icon: SparkIcon, tone: "text-brand bg-brand/15", onClick: () => go("ai") },
    { n: pendingJobs, label: t("ad.todo.jobs"), Icon: BriefcaseIcon, tone: "text-brand bg-brand/15", onClick: () => go("jobs") },
    { n: expiring, label: t("ad.todo.expiring"), Icon: ClockIcon, tone: "text-danger bg-danger/15", onClick: () => go("customers", "expiring") },
  ].filter((x) => x.n > 0);

  // Sales (completed orders)
  const done = orders.filter((o) => o.status === "completed");
  const today0 = startOfDay();
  const now = new Date();
  const month0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const sum = (list: any[]) => list.reduce((n, o) => n + (Number(o.total_amount) || 0), 0);
  const todayList = done.filter((o) => new Date(o.created_at).getTime() >= today0);
  const monthList = done.filter((o) => new Date(o.created_at).getTime() >= month0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today0 - (6 - i) * 86_400_000);
    const start = d.getTime();
    const amount = sum(done.filter((o) => { const ts = new Date(o.created_at).getTime(); return ts >= start && ts < start + 86_400_000; }));
    return { label: d.toLocaleDateString(lang === "my" ? "my-MM" : "en-US", { weekday: "short" }), amount };
  });
  const max = Math.max(...days.map((d) => d.amount), 1);

  const counts = new Map<string, number>();
  monthList.forEach((o) => (o.items || []).forEach((it: any) => counts.set(it.name, (counts.get(it.name) || 0) + (Number(it.quantity) || 1))));
  const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader title={t("ad.hello")} sub={new Date().toLocaleDateString(lang === "my" ? "my-MM" : "en-US", { weekday: "long", day: "numeric", month: "long" })} />

      <section>
        <h2 className="my mb-3 font-semibold">{t("ad.todo")}</h2>
        {todo.length === 0 ? (
          <p className="panel my p-5 text-sm text-mint">✓ {t("ad.allDone")}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {todo.map(({ n, label, Icon, tone, onClick }) => (
              <li key={label}>
                <button type="button" onClick={onClick} className="panel flex h-full w-full flex-col items-start gap-3 p-4 text-left transition-colors hover:border-brand/50">
                  <span className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}><Icon size={18} /></span>
                  <span className="font-display text-3xl font-bold tabular-nums">{n}</span>
                  <span className="my text-sm text-muted">{label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: t("ad.salesToday"), list: todayList },
          { label: t("ad.salesMonth"), list: monthList },
          { label: t("ad.salesTotal"), list: done },
        ].map(({ label, list }) => (
          <div key={label} className="panel p-4">
            <p className="my text-sm text-muted">{label}</p>
            <p className="price mt-1 text-2xl">{formatPrice(sum(list))}</p>
            <p className="my text-xs text-muted">{t("ad.ordersCount", { n: list.length })}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="panel p-5">
          <h2 className="my mb-4 font-semibold">{t("ad.last7")}</h2>
          <div className="flex h-44 items-end gap-2">
            {days.map((d, i) => (
              <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-[10px] tabular-nums text-muted opacity-0 transition-opacity group-hover:opacity-100">{d.amount ? d.amount.toLocaleString() : ""}</span>
                <div className={`w-full max-w-10 rounded-t-lg ${i === 6 ? "bg-brand" : "bg-brand/35"}`} style={{ height: `${Math.max((d.amount / max) * 100, 3)}%` }} title={formatPrice(d.amount)} />
                <span className="text-[11px] text-muted">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="my mb-3 font-semibold">{t("ad.topProducts")}</h2>
          {top.length === 0 ? (
            <p className="my text-sm text-muted">{t("ad.noSales")}</p>
          ) : (
            <ol className="space-y-2">
              {top.map(([name, qty], i) => (
                <li key={name} className="flex items-center gap-3 text-sm">
                  <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-raised text-xs font-bold">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  <span className="tabular-nums text-muted">× {qty}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" onClick={() => downloadCsv(orders.map(({ id, created_at, customer_name, customer_email, total_amount, status, payment_method, promo_code, order_note }) => ({ id, created_at, customer_name, customer_email, total_amount, status, payment_method, promo_code, order_note })), "NexusKit_orders")}>
          {t("ad.export")} — {t("ad.orders")}
        </button>
      </div>
    </div>
  );
}
