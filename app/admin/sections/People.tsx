"use client";

import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { daysUntil, formatPrice } from "@/lib/format";
import { PlusIcon, SearchIcon } from "../../components/icons";
import { type AdminData, orderStage } from "../data";
import { downloadCsv, Empty, PageHeader, Sheet, useAdminUi } from "../ui";

/* ------------------------------------------------------------------ */
/* Promo codes                                                         */
/* ------------------------------------------------------------------ */

export function Promos({ data }: { data: AdminData }) {
  const { t } = useT();
  const { toast, confirm } = useAdminUi();
  const [code, setCode] = useState("");
  const [pct, setPct] = useState("10");

  const used = (c: string) => data.orders.filter((o) => String(o.promo_code || "").toUpperCase() === c.toUpperCase()).length;

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = code.trim().toUpperCase().replace(/\s+/g, "");
    const n = Number(pct);
    if (!/^[A-Z0-9_-]{3,40}$/.test(value) || !(n > 0 && n <= 100)) return toast(t("ad.error", { msg: "CODE (A–Z, 0–9) · 1–100%" }), "error");
    const { error } = await data.supabase.from("promo_codes").insert([{ code: value, discount_percent: n }]);
    if (error) return toast(t("ad.error", { msg: error.message }), "error");
    setCode("");
    toast(t("ad.saved"));
    data.reload.promos();
  };

  return (
    <div>
      <PageHeader title={t("ad.promos")} />
      <form onSubmit={create} className="panel mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_140px_auto] sm:items-end">
        <div>
          <label className="label" htmlFor="pcode">{t("ad.pr.code")}</label>
          <input id="pcode" className="field uppercase tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} placeholder="SAVE10" maxLength={40} />
        </div>
        <div>
          <label className="label" htmlFor="ppct">{t("ad.pr.percent")}</label>
          <input id="ppct" className="field" type="number" min={1} max={100} value={pct} onChange={(e) => setPct(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary"><PlusIcon size={16} /> {t("ad.pr.create")}</button>
      </form>
      {data.promos.length === 0 ? <Empty text={t("ad.empty")} /> : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {data.promos.map((p) => (
            <li key={p.id} className="panel flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-mono font-bold tracking-widest text-brand">{p.code}</p>
                <p className="text-xs text-muted"><span className="text-mint">{t("ad.pr.off", { n: p.discount_percent })}</span> · {t("ad.pr.used", { n: used(p.code) })}</p>
              </div>
              <button type="button" className="btn-quiet px-3 py-1.5 text-xs text-danger" onClick={async () => {
                if (!(await confirm(t("ad.confirmDelete")))) return;
                const { error } = await data.supabase.from("promo_codes").delete().eq("id", p.id);
                if (error) return toast(t("ad.error", { msg: error.message }), "error");
                data.reload.promos();
              }}>{t("ad.delete")}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Customers (grouped by email)                                        */
/* ------------------------------------------------------------------ */

type Customer = { email: string; name: string; orders: any[]; spent: number; subs: { name: string; left: number }[] };

export function Customers({ data, initialFilter }: { data: AdminData; initialFilter?: string }) {
  const { t } = useT();
  const [filter, setFilter] = useState(initialFilter === "expiring" ? "expiring" : "all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Customer | null>(null);

  const customers = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const o of data.orders) {
      const email = String(o.customer_email || "").toLowerCase();
      if (!email) continue;
      const c: Customer = map.get(email) ?? { email, name: o.customer_name || "", orders: [], spent: 0, subs: [] };
      c.orders.push(o);
      if (!c.name && o.customer_name) c.name = o.customer_name;
      if (o.status === "completed") {
        c.spent += Number(o.total_amount) || 0;
        for (const it of o.items || []) {
          const left = daysUntil(it?.end_date);
          if (left !== null) c.subs.push({ name: it.name, left });
        }
      }
      map.set(email, c);
    }
    return Array.from(map.values()).sort((a, b) => b.spent - a.spent);
  }, [data.orders]);

  const list = customers.filter((c) => {
    if (filter === "expiring" && !c.subs.some((s) => s.left <= 7 && s.left > -3)) return false;
    const words = q.trim().toLowerCase();
    return !words || `${c.email} ${c.name}`.toLowerCase().includes(words);
  });

  return (
    <div>
      <PageHeader
        title={t("ad.customers")}
        sub={String(customers.length)}
        action={<button type="button" className="btn-ghost" onClick={() => downloadCsv(customers.map((c) => ({ email: c.email, name: c.name, orders: c.orders.length, spent: c.spent })), "NexusKit_customers")}>{t("ad.export")}</button>}
      />
      <div className="mb-3 flex gap-2">
        <button type="button" className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{t("ad.c.all")}</button>
        <button type="button" className="chip" aria-pressed={filter === "expiring"} onClick={() => setFilter("expiring")}>{t("ad.c.expiring")}</button>
      </div>
      <label className="relative mb-4 block">
        <span className="sr-only">{t("ad.search")}</span>
        <SearchIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("ad.search")} className="field pl-10" />
      </label>
      {list.length === 0 ? <Empty text={t("ad.empty")} /> : (
        <ul className="space-y-2">
          {list.map((c) => {
            const soon = c.subs.filter((s) => s.left <= 7).sort((a, b) => a.left - b.left)[0];
            return (
              <li key={c.email}>
                <button type="button" onClick={() => setOpen(c)} className="panel flex w-full items-center gap-3 p-3.5 text-left hover:border-brand/50">
                  <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-brand-strong font-bold text-white">{c.email[0]?.toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.name || c.email}</span>
                    <span className="block truncate text-xs text-muted">{c.email} · {t("ad.c.orders", { n: c.orders.length })}</span>
                  </span>
                  <span className="flex flex-shrink-0 flex-col items-end gap-1">
                    <span className="price text-sm">{formatPrice(c.spent)}</span>
                    {soon && <span className={`badge text-[11px] ${soon.left <= 0 ? "bg-danger/15 text-danger" : "bg-pass/15 text-pass"}`}>{soon.left <= 0 ? t("ad.c.expired") : t("ad.c.left", { n: soon.left })}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open && (
        <Sheet open onClose={() => setOpen(null)} title={open.name || open.email}>
          <p className="text-sm text-muted">{open.email}</p>
          {open.subs.length > 0 && (
            <section className="space-y-2">
              <h3 className="my text-sm font-semibold text-muted">{t("ad.c.active")}</h3>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {open.subs.sort((a, b) => a.left - b.left).map((s, i) => (
                  <li key={i} className="flex justify-between p-3 text-sm">
                    <span>{s.name}</span>
                    <span className={s.left <= 0 ? "text-danger" : s.left <= 7 ? "text-pass" : "text-mint"}>{s.left <= 0 ? t("ad.c.expired") : t("ad.c.left", { n: s.left })}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="space-y-2">
            <h3 className="my text-sm font-semibold text-muted">{t("ad.c.history")}</h3>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {open.orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate">{(o.items || []).map((i: any) => i.name).join(", ")}</span>
                    <span className="text-xs text-muted">#{String(o.id).slice(0, 8)} · {new Date(o.created_at).toLocaleDateString()} · {orderStage(o)}</span>
                  </span>
                  <span className="price">{formatPrice(o.total_amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        </Sheet>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Team                                                                */
/* ------------------------------------------------------------------ */

export function Team({ data, me }: { data: AdminData; me: string }) {
  const { t } = useT();
  const { toast, confirm } = useAdminUi();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) return;
    const { error } = await data.supabase.from("team_members").insert([{ email: value, role }]);
    if (error) return toast(t("ad.error", { msg: error.message }), "error");
    setEmail("");
    toast(t("ad.saved"));
    data.reload.team();
  };

  return (
    <div>
      <PageHeader title={t("ad.team")} sub={t("ad.t.roles")} />
      <form onSubmit={add} className="panel mb-4 space-y-3 p-4">
        <p className="my font-semibold">{t("ad.t.add")}</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
          <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" />
          <select className="field" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="editor">{t("ad.role.editor")}</option>
            <option value="manager">{t("ad.role.manager")}</option>
            <option value="super_admin">{t("ad.role.super_admin")}</option>
          </select>
          <button type="submit" className="btn-primary"><PlusIcon size={16} /> {t("ad.add")}</button>
        </div>
        <p className="hint my">{t("ad.t.hint")}</p>
      </form>
      <ul className="panel divide-y divide-line">
        {data.team.map((m) => {
          const isMe = String(m.email).toLowerCase() === me.toLowerCase();
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="min-w-0 flex-1 truncate font-medium">{m.email} {isMe && <span className="badge ml-1 bg-raised text-muted">{t("ad.t.you")}</span>}</span>
              <select
                className="field w-auto py-1.5 text-sm"
                value={m.role}
                disabled={isMe}
                onChange={async (e) => {
                  const { error } = await data.supabase.from("team_members").update({ role: e.target.value }).eq("id", m.id);
                  if (error) return toast(t("ad.error", { msg: error.message }), "error");
                  toast(t("ad.saved"));
                  data.reload.team();
                }}
              >
                <option value="editor">{t("ad.role.editor")}</option>
                <option value="manager">{t("ad.role.manager")}</option>
                <option value="super_admin">{t("ad.role.super_admin")}</option>
              </select>
              {!isMe && (
                <button type="button" className="btn-quiet px-3 py-1.5 text-xs text-danger" onClick={async () => {
                  if (!(await confirm(t("ad.confirmDelete")))) return;
                  const { error } = await data.supabase.from("team_members").delete().eq("id", m.id);
                  if (error) return toast(t("ad.error", { msg: error.message }), "error");
                  data.reload.team();
                }}>{t("ad.t.remove")}</button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
