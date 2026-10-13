"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { PlusIcon } from "../../components/icons";
import type { AdminData } from "../data";
import { PageHeader, Toggle, useAdminUi } from "../ui";

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="panel space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="my font-semibold">{title}</h2>
        {sub && <p className="hint my mt-0.5">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

export default function Settings({ data }: { data: AdminData }) {
  const { t, lang } = useT();
  const { toast, confirm } = useAdminUi();
  const s = data.settings || {};
  const set = (k: string, v: any) => data.setSettings((prev: any) => ({ ...prev, [k]: v }));
  const [busy, setBusy] = useState(false);

  const [cat, setCat] = useState("");
  const [catSub, setCatSub] = useState(false);
  const [field, setField] = useState("");
  const [pm, setPm] = useState({ provider_name: "", account_details: "" });
  const [qr, setQr] = useState<File | null>(null);
  const [pmBusy, setPmBusy] = useState(false);

  const fail = (msg: string) => toast(t("ad.error", { msg }), "error");

  const remove = async (table: string, id: any, reload: () => Promise<void>) => {
    if (!(await confirm(t("ad.confirmDelete")))) return;
    const { error } = await data.supabase.from(table).delete().eq("id", id);
    if (error) return fail(error.message);
    toast(t("ad.deleted"));
    reload();
  };

  const saveSettings = async () => {
    setBusy(true);
    const allowed = [
      "enable_pay_later", "pay_later_label", "pay_later_subtitle",
      "contact_email", "contact_phone", "location", "telegram_url", "facebook_url", "instagram_url", "footer_description",
    ];
    const payload: Record<string, any> = { id: 1 };
    for (const k of allowed) if (k in s) payload[k] = typeof s[k] === "string" ? s[k].trim() : s[k];
    for (const k of ["telegram_url", "facebook_url", "instagram_url"]) {
      if (payload[k] && !/^https:\/\//i.test(payload[k])) {
        setBusy(false);
        return fail(`${k}: https://…`);
      }
    }
    const { error } = await data.supabase.from("site_settings").upsert(payload);
    setBusy(false);
    if (error) return fail(error.message);
    toast(t("ad.saved"));
    data.reload.settings();
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = cat.trim();
    if (!name) return;
    if (data.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) return fail(name);
    const { error } = await data.supabase.from("product_categories").insert([{ name, has_subscription: catSub }]);
    if (error) return fail(error.message);
    setCat("");
    setCatSub(false);
    data.reload.categories();
  };

  const addField = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = field.trim();
    if (!label || data.fields.some((f) => f.label.toLowerCase() === label.toLowerCase())) return;
    const { error } = await data.supabase.from("customer_info_fields").insert([{ label }]);
    if (error) return fail(error.message);
    setField("");
    data.reload.fields();
  };

  const addMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pm.provider_name.trim() || !pm.account_details.trim()) return;
    setPmBusy(true);
    try {
      let qr_url: string | null = null;
      if (qr) {
        if (!/^image\/(png|jpe?g|webp)$/.test(qr.type)) throw new Error("PNG / JPG / WEBP");
        if (qr.size > 5 * 1024 * 1024) throw new Error("< 5 MB");
        const ext = qr.type === "image/png" ? "png" : qr.type === "image/webp" ? "webp" : "jpg";
        const name = `qr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const up = await data.supabase.storage.from("products").upload(name, qr, { contentType: qr.type });
        if (up.error) throw up.error;
        qr_url = data.supabase.storage.from("products").getPublicUrl(name).data.publicUrl;
      }
      const { error } = await data.supabase.from("payment_methods").insert([{ provider_name: pm.provider_name.trim(), account_details: pm.account_details.trim(), qr_url }]);
      if (error) throw error;
      setPm({ provider_name: "", account_details: "" });
      setQr(null);
      toast(t("ad.saved"));
      data.reload.methods();
    } catch (err: any) {
      fail(err.message);
    } finally {
      setPmBusy(false);
    }
  };

  const L = (my: string, en: string) => (lang === "my" ? my : en);
  const text = (k: string, label: string, type = "text", ph = "") => (
    <div>
      <label className="label" htmlFor={`s-${k}`}>{label}</label>
      <input id={`s-${k}`} className="field" type={type} value={s[k] || ""} placeholder={ph} onChange={(e) => set(k, e.target.value)} />
    </div>
  );

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      <PageHeader title={t("ad.settings")} />

      <Card title={L("Telegram AI bot", "Telegram AI bot")} sub={L("Supplier ဈေးစာရင်း forward လုပ်ရင် draft ရေးပေးပြီး ✅/❌ နဲ့ approve လုပ်လို့ရအောင် bot ကို ဒီ website နဲ့ ချိတ်ပါ။ (Live site ပေါ်ကမှ နှိပ်ပါ)", "Connect the bot to this site so forwarded price lists become drafts you approve with ✅/❌. (Use on the live site.)")}>
        <button type="button" className="btn-ghost" onClick={async () => {
          const res = await fetch("/api/telegram/setup", { method: "POST" });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) return fail(json.error || `Error ${res.status}`);
          toast(L("✓ Bot ချိတ်ပြီးပါပြီ — bot ဆီ /help ပို့ကြည့်ပါ", "✓ Bot connected — send /help to it"));
        }}>{L("Bot ကို ချိတ်မယ်", "Connect bot")}</button>
      </Card>

      {/* Things that save instantly */}
      <Card title={t("ad.s.methods")}>
        {data.methods.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.methods.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-xl border border-line bg-raised p-3">
                {m.qr_url ? <img src={m.qr_url} alt="" className="h-12 w-12 flex-shrink-0 rounded-lg bg-white object-contain p-1" /> : <span className="h-12 w-12 flex-shrink-0 rounded-lg bg-line" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{m.provider_name}</span>
                  <span className="block truncate text-xs text-muted">{m.account_details}</span>
                </span>
                <button type="button" className="btn-quiet px-2.5 py-1 text-xs text-danger" onClick={() => remove("payment_methods", m.id, data.reload.methods)}>{t("ad.delete")}</button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addMethod} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="pm-name">{t("ad.s.provider")}</label>
            <input id="pm-name" className="field" value={pm.provider_name} onChange={(e) => setPm({ ...pm, provider_name: e.target.value })} placeholder="KBZPay" maxLength={80} />
          </div>
          <div>
            <label className="label" htmlFor="pm-acc">{t("ad.s.account")}</label>
            <input id="pm-acc" className="field" value={pm.account_details} onChange={(e) => setPm({ ...pm, account_details: e.target.value })} placeholder="09xxxxxxxxx · Name" maxLength={200} />
          </div>
          <label className="btn-ghost cursor-pointer justify-start text-sm">
            {qr ? `✓ ${qr.name}` : t("ad.s.qr")}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => setQr(e.target.files?.[0] || null)} />
          </label>
          <button type="submit" className="btn-primary" disabled={pmBusy}><PlusIcon size={16} /> {pmBusy ? t("ad.saving") : t("ad.add")}</button>
        </form>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("ad.s.categories")}>
          <ul className="flex flex-wrap gap-2">
            {data.categories.map((c) => (
              <li key={c.id} className="flex items-center gap-1.5 rounded-full border border-line bg-raised py-1 pl-3 pr-1 text-sm">
                {c.name}
                {c.has_subscription && <span className="badge bg-brand/15 text-[10px] text-brand">⏱</span>}
                <button type="button" aria-label={t("ad.delete")} className="grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-danger/15 hover:text-danger" onClick={() => remove("product_categories", c.id, data.reload.categories)}>×</button>
              </li>
            ))}
          </ul>
          <form onSubmit={addCategory} className="space-y-3">
            <div className="flex gap-2">
              <input className="field" value={cat} onChange={(e) => setCat(e.target.value)} placeholder={t("ad.s.catPh")} maxLength={80} />
              <button type="submit" className="btn-ghost" aria-label={t("ad.add")}><PlusIcon size={16} /></button>
            </div>
            <Toggle checked={catSub} onChange={setCatSub} label={t("ad.s.catSub")} />
          </form>
        </Card>

        <Card title={t("ad.s.fields")}>
          <ul className="flex flex-wrap gap-2">
            {data.fields.map((f) => (
              <li key={f.id} className="flex items-center gap-1.5 rounded-full border border-line bg-raised py-1 pl-3 pr-1 text-sm">
                {f.label}
                <button type="button" aria-label={t("ad.delete")} className="grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-danger/15 hover:text-danger" onClick={() => remove("customer_info_fields", f.id, data.reload.fields)}>×</button>
              </li>
            ))}
          </ul>
          <form onSubmit={addField} className="flex gap-2">
            <input className="field" value={field} onChange={(e) => setField(e.target.value)} placeholder="Player ID, Server ID, Canva email…" maxLength={100} />
            <button type="submit" className="btn-ghost" aria-label={t("ad.add")}><PlusIcon size={16} /></button>
          </form>
        </Card>
      </div>

      {/* Things saved with the Save button */}
      <Card title={t("ad.s.checkout")}>
        <Toggle checked={s.enable_pay_later !== false} onChange={(v) => set("enable_pay_later", v)} label={t("ad.s.payLater")} />
        {s.enable_pay_later !== false && (
          <div className="grid gap-3 sm:grid-cols-2">
            {text("pay_later_label", t("ad.s.payLaterLabel"))}
            {text("pay_later_subtitle", t("ad.s.payLaterSub"))}
          </div>
        )}
      </Card>

      <Card title={t("ad.s.contact")} sub={L("Footer နဲ့ Help မှာ ဒီ ၂ ခုပဲ ပြပါမယ်။ Footer စာသားကို ဆိုင်မျက်နှာစာ → စာသားများ မှာ ပြင်ပါ။", "Only these two are shown in the footer and Help. Edit footer text in Storefront → Text.")}>
        <div className="grid gap-3 sm:grid-cols-2">
          {text("telegram_url", "Telegram", "url", "https://t.me/…")}
          {text("contact_email", L("အီးမေးလ်", "Email"), "email")}
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-ink/95 p-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
        <button type="button" disabled={busy} onClick={saveSettings} className="btn-primary btn-lg w-full lg:w-auto">{busy ? t("ad.saving") : t("ad.save")}</button>
      </div>
    </div>
  );
}
