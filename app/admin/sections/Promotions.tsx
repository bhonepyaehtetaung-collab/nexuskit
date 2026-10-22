"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { categoryKey, formatPrice } from "@/lib/format";
import { CAMPAIGN_THEMES, type Campaign, type CampaignTheme } from "@/lib/promotions";
import { PlusIcon, SearchIcon } from "../../components/icons";
import ContentManager from "../ContentManager";
import type { AdminData } from "../data";
import { bustStoreCache, Empty, PageHeader, Sheet, Toggle, useAdminUi } from "../ui";
import { Promos } from "./People";

type Section = "campaigns" | "combos" | "codes";

/** Admin → Promotions: seasonal campaigns, combos (toolkits) and promo codes. */
export default function Promotions({ data }: { data: AdminData }) {
  const { t } = useT();
  const [section, setSection] = useState<Section>("campaigns");
  const tabs: { id: Section; label: string }[] = [
    { id: "campaigns", label: t("ad.cp.tab") },
    { id: "combos", label: t("ad.bundles") },
    { id: "codes", label: t("ad.cp.codes") },
  ];
  return (
    <div className="space-y-5">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist">
        {tabs.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={section === x.id} aria-pressed={section === x.id} className="chip" onClick={() => setSection(x.id)}>
            {x.label}
          </button>
        ))}
      </div>
      {section === "campaigns" && <Campaigns data={data} />}
      {section === "combos" && <ContentManager section="bundles" products={data.products} />}
      {section === "codes" && <Promos data={data} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Seasonal campaigns                                                  */
/* ------------------------------------------------------------------ */

type Form = {
  id?: string;
  name: string;
  name_en: string;
  tagline: string;
  tagline_en: string;
  emoji: string;
  theme: CampaignTheme;
  discount_percent: string;
  target: "all" | "categories" | "products";
  categories: string[];
  product_ids: string[];
  starts_at: string; // datetime-local (this device's time zone)
  ends_at: string;
  show_banner: boolean;
  active: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");
/** ISO → "YYYY-MM-DDTHH:mm" in local time for <input type="datetime-local">. */
const toLocal = (iso: string | Date) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const days = (n: number) => new Date(Date.now() + n * 86_400_000);

/** Ready-made Myanmar & global seasons — they only fill the form. */
const PRESETS: { emoji: string; theme: CampaignTheme; name: string; name_en: string; tagline: string; tagline_en: string; pct: number; days: number }[] = [
  { emoji: "🪔", theme: "gold", name: "သီတင်းကျွတ် ပရိုမိုးရှင်း", name_en: "Thadingyut Sale", tagline: "မီးထွန်းပွဲတော် အထူးလျှော့ဈေး", tagline_en: "Festival of lights deals", pct: 15, days: 5 },
  { emoji: "🏮", theme: "red", name: "တန်ဆောင်တိုင် ပရိုမိုးရှင်း", name_en: "Tazaungdaing Sale", tagline: "ပွဲတော်ရာသီ အထူးဈေး", tagline_en: "Festival season prices", pct: 15, days: 5 },
  { emoji: "🎄", theme: "green", name: "Christmas Sale", name_en: "Christmas Sale", tagline: "ခရစ္စမတ် လက်ဆောင် ဈေးနှုန်း", tagline_en: "Holiday gift prices", pct: 20, days: 7 },
  { emoji: "🎆", theme: "violet", name: "နှစ်သစ်ကူး ပရိုမိုးရှင်း", name_en: "New Year Sale", tagline: "နှစ်သစ်မှာ Premium နဲ့ စတင်ပါ", tagline_en: "Start the year with Premium", pct: 20, days: 5 },
  { emoji: "💦", theme: "blue", name: "သင်္ကြန် ပရိုမိုးရှင်း", name_en: "Thingyan Sale", tagline: "ရေကစားရင်း Game ဖြည့်ပါ", tagline_en: "Top up for the water festival", pct: 15, days: 7 },
  { emoji: "⚡", theme: "pink", name: "Flash Sale", name_en: "Flash Sale", tagline: "ဒီနေ့ တစ်ရက်တည်း", tagline_en: "Today only", pct: 10, days: 1 },
];

const blank = (): Form => ({
  name: "", name_en: "", tagline: "", tagline_en: "", emoji: "🔥", theme: "violet", discount_percent: "10",
  target: "all", categories: [], product_ids: [], starts_at: toLocal(new Date()), ends_at: toLocal(days(7)), show_banner: true, active: true,
});

const toForm = (c: Campaign): Form => ({
  id: c.id,
  name: c.name || "",
  name_en: c.name_en || "",
  tagline: c.tagline || "",
  tagline_en: c.tagline_en || "",
  emoji: c.emoji || "",
  theme: (c.theme as CampaignTheme) || "violet",
  discount_percent: String(c.discount_percent ?? ""),
  target: c.all_products ? "all" : (c.product_ids || []).length ? "products" : "categories",
  categories: c.categories || [],
  product_ids: c.product_ids || [],
  starts_at: toLocal(c.starts_at),
  ends_at: toLocal(c.ends_at),
  show_banner: c.show_banner !== false,
  active: c.active !== false,
});

function status(c: Campaign, now = Date.now()): "live" | "scheduled" | "ended" | "off" {
  if (c.active === false) return "off";
  if (now < new Date(c.starts_at).getTime()) return "scheduled";
  if (now >= new Date(c.ends_at).getTime()) return "ended";
  return "live";
}

function Campaigns({ data }: { data: AdminData }) {
  const { t, lang } = useT();
  const { toast, confirm } = useAdminUi();
  const [rows, setRows] = useState<Campaign[]>([]);
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState<Form | null>(null);

  const load = useCallback(async () => {
    const { data: list, error } = await data.supabase.from("campaigns").select("*").order("starts_at", { ascending: false });
    setMissing(!!error && /does not exist|schema cache/i.test(error.message));
    setRows((list as Campaign[]) || []);
  }, [data.supabase]);
  useEffect(() => { load(); }, [load]);

  const changed = async () => {
    bustStoreCache();
    await load();
  };

  const toggle = async (c: Campaign) => {
    const { error } = await data.supabase.from("campaigns").update({ active: c.active === false }).eq("id", c.id);
    if (error) return toast(t("ad.error", { msg: error.message }), "error");
    changed();
  };
  const remove = async (c: Campaign) => {
    if (!(await confirm(t("ad.confirmDelete")))) return;
    const { error } = await data.supabase.from("campaigns").delete().eq("id", c.id);
    if (error) return toast(t("ad.error", { msg: error.message }), "error");
    toast(t("ad.deleted"));
    changed();
  };

  if (missing) {
    return (
      <div className="panel my space-y-2 border-pass/40 p-5">
        <p className="font-semibold text-pass">⚠ {t("ad.cp.needSql")}</p>
      </div>
    );
  }

  const label = { live: t("ad.cp.live"), scheduled: t("ad.cp.scheduled"), ended: t("ad.cp.ended"), off: t("ad.cp.off") };
  const tone = { live: "bg-mint/15 text-mint", scheduled: "bg-info/15 text-info", ended: "bg-raised text-muted", off: "bg-raised text-muted" };
  const targetText = (c: Campaign) =>
    c.all_products ? t("ad.cp.allProducts")
      : (c.product_ids || []).length ? t("ad.cp.nProducts", { n: (c.product_ids || []).length })
      : (c.categories || []).map((k) => data.categories.find((x) => categoryKey(x.name) === k)?.name || k).join(", ");

  return (
    <div>
      <PageHeader
        title={t("ad.cp.title")}
        sub={t("ad.cp.sub")}
        action={<button type="button" className="btn-primary" onClick={() => setEditing(blank())}><PlusIcon size={18} /> {t("ad.cp.new")}</button>}
      />
      {rows.length === 0 ? <Empty text={t("ad.cp.empty")} /> : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {rows.map((c) => {
            const s = status(c);
            return (
              <li key={c.id} className="panel overflow-hidden">
                <button type="button" onClick={() => setEditing(toForm(c))} className="block w-full p-4 text-left text-white" style={{ background: CAMPAIGN_THEMES[(c.theme as CampaignTheme) || "violet"] }}>
                  <span className="flex items-center gap-3">
                    <span className="text-3xl" aria-hidden="true">{c.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="my block truncate font-semibold">{(lang === "en" && c.name_en) || c.name}</span>
                      <span className="block text-xs text-white/80">{targetText(c)}</span>
                    </span>
                    <span className="badge bg-white text-night">−{Number(c.discount_percent)}%</span>
                  </span>
                </button>
                <div className="flex flex-wrap items-center gap-2 p-3 text-xs">
                  <span className={`badge ${tone[s]}`}>{label[s]}</span>
                  <span className="text-muted">{new Date(c.starts_at).toLocaleString()} → {new Date(c.ends_at).toLocaleString()}</span>
                  <span className="ml-auto flex gap-1">
                    <button type="button" className="btn-quiet px-2.5 py-1 text-xs" onClick={() => toggle(c)}>{c.active === false ? t("ad.cp.turnOn") : t("ad.cp.turnOff")}</button>
                    <button type="button" className="btn-quiet px-2.5 py-1 text-xs text-danger" onClick={() => remove(c)}>{t("ad.delete")}</button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {editing && <CampaignSheet key={editing.id || "new"} data={data} form={editing} onClose={() => setEditing(null)} onSaved={changed} />}
    </div>
  );
}

function CampaignSheet({ data, form: initial, onClose, onSaved }: { data: AdminData; form: Form; onClose: () => void; onSaved: () => void }) {
  const { t, lang } = useT();
  const { toast } = useAdminUi();
  const [form, setForm] = useState<Form>(initial);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of data.categories) if (c.name) map.set(categoryKey(c.name), c.name);
    for (const p of data.products) if (p.product_type && !map.has(categoryKey(p.product_type))) map.set(categoryKey(p.product_type), p.product_type);
    return Array.from(map.entries());
  }, [data.categories, data.products]);

  const products = useMemo(() => {
    const w = q.trim().toLowerCase();
    return data.products.filter((p) => !w || `${p.name} ${p.product_type}`.toLowerCase().includes(w));
  }, [data.products, q]);

  const pct = Number(form.discount_percent);
  const preview = data.products.find((p) => form.target === "all" || form.product_ids.includes(String(p.id)) || form.categories.includes(categoryKey(p.product_type)));

  const applyPreset = (p: (typeof PRESETS)[number]) =>
    setForm((f) => ({ ...f, emoji: p.emoji, theme: p.theme, name: p.name, name_en: p.name_en, tagline: p.tagline, tagline_en: p.tagline_en, discount_percent: String(p.pct), ends_at: toLocal(new Date(new Date(f.starts_at).getTime() + p.days * 86_400_000)) }));

  const toggleIn = (key: "categories" | "product_ids", v: string) =>
    set(key, form[key].includes(v) ? form[key].filter((x) => x !== v) : [...form[key], v]);

  const save = async () => {
    const start = new Date(form.starts_at);
    const end = new Date(form.ends_at);
    if (form.name.trim().length < 2) return toast(t("ad.cp.errName"), "error");
    if (!(pct >= 1 && pct <= 90)) return toast(t("ad.cp.errPct"), "error");
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return toast(t("ad.cp.errDates"), "error");
    if (form.target === "categories" && !form.categories.length) return toast(t("ad.cp.errTarget"), "error");
    if (form.target === "products" && !form.product_ids.length) return toast(t("ad.cp.errTarget"), "error");
    setBusy(true);
    const payload = {
      name: form.name.trim().slice(0, 80),
      name_en: form.name_en.trim().slice(0, 80) || null,
      tagline: form.tagline.trim().slice(0, 200) || null,
      tagline_en: form.tagline_en.trim().slice(0, 200) || null,
      emoji: Array.from(form.emoji.trim()).slice(0, 2).join("") || null,
      theme: form.theme,
      discount_percent: Math.round(pct * 100) / 100,
      all_products: form.target === "all",
      categories: form.target === "categories" ? form.categories : [],
      product_ids: form.target === "products" ? form.product_ids : [],
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      show_banner: form.show_banner,
      active: form.active,
    };
    const { error } = form.id
      ? await data.supabase.from("campaigns").update(payload).eq("id", form.id)
      : await data.supabase.from("campaigns").insert([payload]);
    setBusy(false);
    if (error) return toast(t("ad.error", { msg: error.message }), "error");
    toast(t("ad.saved"));
    onSaved();
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={form.id ? t("ad.cp.edit") : t("ad.cp.new")}
      footer={<button type="button" disabled={busy} onClick={save} className="btn-primary btn-lg w-full">{busy ? t("ad.saving") : t("ad.save")}</button>}
    >
      {!form.id && (
        <div>
          <p className="label">{t("ad.cp.presets")}</p>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {PRESETS.map((p) => (
              <button key={p.name_en} type="button" className="chip flex-shrink-0 py-1.5" onClick={() => applyPreset(p)}>
                <span aria-hidden="true">{p.emoji}</span> <span className="my">{lang === "en" ? p.name_en : p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Live preview of the store banner */}
      <div className="rounded-2xl p-4 text-white" style={{ background: CAMPAIGN_THEMES[form.theme] }}>
        <div className="flex items-center gap-3">
          {form.emoji && <span className="text-3xl" aria-hidden="true">{form.emoji}</span>}
          <div className="min-w-0 flex-1">
            <span className="badge bg-white text-[11px] font-bold text-night">{t("sale.off", { n: pct > 0 ? pct : 0 })}</span>
            <p className="my mt-1 truncate font-display text-lg font-bold">{(lang === "en" && form.name_en) || form.name || t("ad.cp.namePh")}</p>
            {(form.tagline || form.tagline_en) && <p className="my truncate text-xs text-white/85">{(lang === "en" && form.tagline_en) || form.tagline}</p>}
          </div>
        </div>
        {preview && pct > 0 && (
          <p className="mt-2 text-xs text-white/85">
            {preview.name}: <s>{formatPrice(preview.price)}</s> → <b>{formatPrice(Math.round(Number(preview.price) * (100 - pct)) / 100)}</b>
          </p>
        )}
      </div>

      <div className="grid grid-cols-[72px_1fr] gap-3">
        <div>
          <label className="label" htmlFor="cpe">Emoji</label>
          <input id="cpe" className="field text-center text-xl" value={form.emoji} onChange={(e) => set("emoji", e.target.value)} maxLength={8} />
        </div>
        <div>
          <label className="label" htmlFor="cpn">{t("ad.cp.name")}</label>
          <input id="cpn" className="field my" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={t("ad.cp.namePh")} maxLength={80} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="cpne">{t("ad.cp.nameEn")}</label>
          <input id="cpne" className="field" value={form.name_en} onChange={(e) => set("name_en", e.target.value)} maxLength={80} />
        </div>
        <div>
          <label className="label" htmlFor="cpp">{t("ad.pr.percent")}</label>
          <input id="cpp" className="field" type="number" inputMode="decimal" min={1} max={90} value={form.discount_percent} onChange={(e) => set("discount_percent", e.target.value)} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="cpt">{t("ad.cp.tagline")}</label>
          <input id="cpt" className="field my" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={200} />
        </div>
        <div>
          <label className="label" htmlFor="cpte">{t("ad.cp.taglineEn")}</label>
          <input id="cpte" className="field" value={form.tagline_en} onChange={(e) => set("tagline_en", e.target.value)} maxLength={200} />
        </div>
      </div>

      <div>
        <p className="label">{t("ad.cp.color")}</p>
        <div className="flex gap-2">
          {(Object.keys(CAMPAIGN_THEMES) as CampaignTheme[]).map((k) => (
            <button key={k} type="button" aria-label={k} aria-pressed={form.theme === k} onClick={() => set("theme", k)}
              className={`h-9 w-9 rounded-full border-2 ${form.theme === k ? "border-text" : "border-transparent"}`} style={{ background: CAMPAIGN_THEMES[k] }} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="cps">{t("ad.cp.starts")}</label>
          <input id="cps" className="field px-3" type="datetime-local" value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="cpend">{t("ad.cp.ends")}</label>
          <input id="cpend" className="field px-3" type="datetime-local" value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <p className="label">{t("ad.cp.appliesTo")}</p>
        <div className="flex flex-wrap gap-2">
          {(["all", "categories", "products"] as const).map((k) => (
            <button key={k} type="button" className="chip py-1.5" aria-pressed={form.target === k} onClick={() => set("target", k)}>
              {k === "all" ? t("ad.cp.allProducts") : k === "categories" ? t("ad.p.category") : t("ad.products")}
            </button>
          ))}
        </div>
        {form.target === "categories" && (
          <div className="flex flex-wrap gap-2 rounded-xl border border-line p-3">
            {categories.map(([key, name]) => (
              <button key={key} type="button" className="chip py-1.5" aria-pressed={form.categories.includes(key)} onClick={() => toggleIn("categories", key)}>{name}</button>
            ))}
          </div>
        )}
        {form.target === "products" && (
          <div className="space-y-2 rounded-xl border border-line p-3">
            <label className="relative block">
              <span className="sr-only">{t("ad.search")}</span>
              <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input type="search" className="field py-2 pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("ad.search")} />
            </label>
            <ul className="max-h-60 space-y-1 overflow-y-auto">
              {products.map((p) => {
                const on = form.product_ids.includes(String(p.id));
                return (
                  <li key={p.id}>
                    <label className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm ${on ? "bg-brand/10" : "hover:bg-raised"}`}>
                      <input type="checkbox" checked={on} onChange={() => toggleIn("product_ids", String(p.id))} className="h-4 w-4 accent-[rgb(var(--brand))]" />
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <span className="text-xs text-muted">{formatPrice(p.price)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className="hint">{t("ad.cp.nProducts", { n: form.product_ids.length })}</p>
          </div>
        )}
        <p className="hint my">{t("ad.cp.stackHint")}</p>
      </div>

      <Toggle checked={form.show_banner} onChange={(v) => set("show_banner", v)} label={t("ad.cp.banner")} />
      <Toggle checked={form.active} onChange={(v) => set("active", v)} label={t("ad.cp.active")} />
    </Sheet>
  );
}
