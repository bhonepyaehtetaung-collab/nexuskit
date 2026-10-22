"use client";

import { useEffect, useMemo, useState } from "react";
import { translate, useT, type TKey } from "@/lib/i18n";
import { EDITABLE_TEXT } from "@/lib/ui-text";
import { categoryHue, categoryKey } from "@/lib/format";
import { ChevronDownIcon, CloseIcon, UploadIcon } from "../../components/icons";
import type { AdminData } from "../data";
import { bustStoreCache, PageHeader, Toggle, useAdminUi } from "../ui";
import { upload } from "./Products";

type Overrides = Record<string, { my?: string; en?: string }>;

const clean = (o: Overrides): Overrides => {
  const out: Overrides = {};
  for (const [k, v] of Object.entries(o)) {
    const my = v?.my?.trim().slice(0, 300) || "";
    const en = v?.en?.trim().slice(0, 300) || "";
    if (my || en) out[k] = { ...(my ? { my } : {}), ...(en ? { en } : {}) };
  }
  return out;
};

/* ------------------------------------------------------------------ */
/* Store text                                                          */
/* ------------------------------------------------------------------ */

function TextEditor({ data }: { data: AdminData }) {
  const { lang } = useT();
  const L = (my: string, en: string) => (lang === "my" ? my : en);
  const { toast } = useAdminUi();
  const [draft, setDraft] = useState<Overrides>(() => ({ ...(data.settings?.ui_text || {}) }));
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string>(EDITABLE_TEXT[0].group.en);

  useEffect(() => setDraft({ ...(data.settings?.ui_text || {}) }), [data.settings?.ui_text]);

  const set = (key: string, l: "my" | "en", value: string) => setDraft((d) => ({ ...d, [key]: { ...d[key], [l]: value } }));
  const dirty = JSON.stringify(clean(draft)) !== JSON.stringify(clean(data.settings?.ui_text || {}));

  const save = async () => {
    setBusy(true);
    const ui_text = clean(draft);
    const { error } = await data.supabase.from("site_settings").upsert({ id: 1, ui_text });
    setBusy(false);
    if (error) {
      return toast(/ui_text/.test(error.message) ? L("supabase/storefront.sql ကို အရင် run ပါ", "Run supabase/storefront.sql first") : error.message, "error");
    }
    data.setSettings((prev: any) => ({ ...prev, ui_text }));
    bustStoreCache();
    toast(L("✓ သိမ်းပြီးပါပြီ — ဆိုင်ကို refresh လုပ်ရင် မြင်ရပါမယ်", "✓ Saved — refresh the store to see it"));
  };

  // Live preview of the banner in the admin's current language
  const tr = (key: TKey) => translate(lang, key, undefined, clean(draft));
  const [line1, line2] = tr("home.heroTitle").split("\n");

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-3xl bg-[linear-gradient(125deg,#6E5EF5_0%,#4B3BD1_45%,#1E1B5E_100%)] p-5 sm:p-7">
        <p className="mb-2 text-[11px] uppercase tracking-wider text-white/60">{L("Preview", "Preview")}</p>
        <h3 className="my font-display text-2xl font-bold leading-snug text-white sm:text-3xl">
          <span className="block">{line1}</span>
          {line2 && <span className="block text-[#FFC85A]">{line2}</span>}
        </h3>
        <p className="my mt-3 max-w-md text-sm text-white/80">{tr("home.heroSub")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="btn bg-white text-night">{tr("home.topUpNow")}</span>
          <span className="btn bg-white/15 text-white">{tr("home.track")}</span>
        </div>
        <div className="mt-5 flex gap-2 border-t border-white/15 pt-3 text-xs text-white/80">
          {(["nav.store", "nav.hub", "nav.jobs", "nav.account"] as TKey[]).map((k) => (
            <span key={k} className="rounded-full bg-white/10 px-3 py-1">{tr(k)}</span>
          ))}
        </div>
      </div>

      {EDITABLE_TEXT.map((g) => {
        const isOpen = open === g.group.en;
        return (
          <div key={g.group.en} className="panel overflow-hidden">
            <button type="button" onClick={() => setOpen(isOpen ? "" : g.group.en)} className="flex w-full items-center justify-between p-4 text-left">
              <span className="my font-semibold">{g.group[lang]}</span>
              <ChevronDownIcon size={18} className={`text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div className="space-y-4 border-t border-line p-4">
                {g.items.map((it) => (
                  <div key={it.key} className="space-y-2">
                    <p className="label my mb-0">{it.label[lang]}</p>
                    {it.hint && <p className="hint my -mt-1">{it.hint[lang]}</p>}
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(["my", "en"] as const).map((l) => {
                        const value = draft[it.key]?.[l] || "";
                        const ph = translate(l, it.key);
                        return (
                          <label key={l} className="relative block">
                            <span className="pointer-events-none absolute left-3 top-2 text-[10px] font-semibold uppercase text-muted">{l === "my" ? "မြန်မာ" : "English"}</span>
                            {it.long ? (
                              <textarea className="field my pt-6 text-sm" rows={3} value={value} placeholder={ph} maxLength={300} onChange={(e) => set(it.key, l, e.target.value)} />
                            ) : (
                              <input className="field my pt-6 text-sm" value={value} placeholder={ph} maxLength={80} onChange={(e) => set(it.key, l, e.target.value)} />
                            )}
                            {value && (
                              <button type="button" onClick={() => set(it.key, l, "")} className="absolute right-2 top-2 text-[11px] text-muted hover:text-text">
                                {L("မူလ", "Default")}
                              </button>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <p className="hint my">{L("အလွတ်ထားရင် မူလစာသား (မှိန်နေတဲ့စာ) ကို သုံးပါမယ်။", "Leave a box empty to keep the default (shown greyed out).")}</p>
      <div className={dirty ? "sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 animate-slide-up lg:bottom-4" : ""}>
        <button type="button" disabled={busy || !dirty} onClick={save} className={`btn-primary btn-lg w-full ${dirty ? "shadow-xl shadow-black/40" : ""}`}>
          {busy ? L("သိမ်းနေသည်…", "Saving…") : dirty ? L("စာသားများ သိမ်းမယ်", "Save text") : L("✓ သိမ်းပြီး", "✓ Saved")}
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

type Row = { id: any; name: string; label_my: string; label_en: string; image: string; hidden: boolean };

function CategoryEditor({ data }: { data: AdminData }) {
  const { lang } = useT();
  const L = (my: string, en: string) => (lang === "my" ? my : en);
  const { toast } = useAdminUi();
  const initial = useMemo<Row[]>(
    () =>
      [...data.categories]
        .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.created_at).localeCompare(String(b.created_at)))
        .map((c) => ({ id: c.id, name: c.name, label_my: c.label_my || "", label_en: c.label_en || "", image: c.image || "", hidden: !!c.hidden })),
    [data.categories],
  );
  const [rows, setRows] = useState<Row[]>(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<any>(null);
  useEffect(() => setRows(initial), [initial]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    data.products.forEach((p) => {
      const k = categoryKey(p.product_type);
      if (k) m.set(k, (m.get(k) || 0) + 1);
    });
    return m;
  }, [data.products]);

  // Product types used by products but not set up as categories yet
  const missing = useMemo(() => {
    const have = new Set(data.categories.map((c) => categoryKey(c.name)));
    const out = new Map<string, string>();
    data.products.forEach((p) => {
      const k = categoryKey(p.product_type);
      if (k && !have.has(k) && !out.has(k)) out.set(k, String(p.product_type).trim());
    });
    return Array.from(out.values());
  }, [data.categories, data.products]);

  const importMissing = async () => {
    const { error } = await data.supabase.from("product_categories").insert(missing.map((name) => ({ name, has_subscription: false })));
    if (error) return toast(error.message, "error");
    toast(L(`✓ အမျိုးအစား ${missing.length} ခု ထည့်ပြီးပါပြီ`, `✓ Added ${missing.length} categories`));
    data.reload.categories();
  };

  const patch = (i: number, p: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const j = i + d;
      if (j < 0 || j >= r.length) return r;
      const copy = [...r];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const dirty = JSON.stringify(rows) !== JSON.stringify(initial);

  const save = async () => {
    setBusy(true);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const { error } = await data.supabase
        .from("product_categories")
        .update({ label_my: r.label_my.trim() || null, label_en: r.label_en.trim() || null, image: r.image.trim() || null, hidden: r.hidden, sort_order: i })
        .eq("id", r.id);
      if (error) {
        setBusy(false);
        return toast(/label_my|sort_order|hidden|column/.test(error.message) ? L("supabase/storefront.sql ကို အရင် run ပါ", "Run supabase/storefront.sql first") : error.message, "error");
      }
    }
    setBusy(false);
    toast(L("✓ အမျိုးအစားများ သိမ်းပြီးပါပြီ", "✓ Categories saved"));
    data.reload.categories();
  };

  if (!rows.length) return <p className="panel my p-5 text-sm text-muted">{L("အမျိုးအစား မရှိသေးပါ — Settings မှာ ထည့်ပါ", "No categories yet — add them in Settings")}</p>;

  return (
    <section className="space-y-3">
      <p className="hint my">{L("နာမည်၊ ပုံ၊ အစီအစဉ် ပြောင်းလို့ရပါတယ်။ ဖျောက်ထားရင် Home မှာ မပေါ်တော့ပါ (product တွေကတော့ ကျန်ပါတယ်)။", "Change names, pictures and order. Hidden categories disappear from Home (their products stay).")}</p>
      {missing.length > 0 && (
        <div className="panel my flex flex-wrap items-center gap-3 border-pass/40 p-4 text-sm">
          <span className="flex-1">
            {L("Product တွေမှာ သုံးထားပြီး ဒီစာရင်းထဲ မပါသေးတာ:", "Used by products but not listed here yet:")} <b>{missing.join(", ")}</b>
          </span>
          <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={importMissing}>{L("ဒီစာရင်းထဲ ထည့်မယ်", "Add them")}</button>
        </div>
      )}
      <ul className="space-y-2">
        {rows.map((r, i) => {
          const hue = categoryHue(r.name);
          return (
            <li key={r.id} className={`panel flex gap-3 p-3 ${r.hidden ? "opacity-60" : ""}`}>
              <div className="flex flex-col items-center gap-1">
                <button type="button" aria-label="Up" disabled={i === 0} onClick={() => move(i, -1)} className="btn-quiet h-7 w-7 p-0 disabled:opacity-30"><ChevronDownIcon size={16} className="rotate-180" /></button>
                <span className="text-xs tabular-nums text-muted">{i + 1}</span>
                <button type="button" aria-label="Down" disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="btn-quiet h-7 w-7 p-0 disabled:opacity-30"><ChevronDownIcon size={16} /></button>
              </div>

              <label className="relative h-20 w-20 flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-line" style={r.image ? undefined : { background: `linear-gradient(135deg, hsl(${hue} 80% 55%), hsl(${(hue + 60) % 360} 75% 35%))` }}>
                {r.image ? <img src={r.image} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center text-white/90"><UploadIcon size={20} /></span>}
                {uploading === r.id && <span className="absolute inset-0 grid place-items-center bg-black/60 text-[10px] text-white">…</span>}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setUploading(r.id);
                  try { patch(i, { image: await upload(data, f) }); } catch (err: any) { toast(err.message, "error"); } finally { setUploading(null); }
                }} />
                {r.image && (
                  <button type="button" aria-label={L("ပုံဖယ်မယ်", "Remove picture")} onClick={(e) => { e.preventDefault(); patch(i, { image: "" }); }} className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white"><CloseIcon size={12} /></button>
                )}
              </label>

              <div className="min-w-0 flex-1 space-y-2">
                <p className="truncate text-xs text-muted">{r.name} · {L(`Product ${counts.get(categoryKey(r.name)) || 0} ခု`, `${counts.get(categoryKey(r.name)) || 0} products`)}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="field my py-2 text-sm" value={r.label_my} placeholder={`မြန်မာ — ${r.name}`} maxLength={60} onChange={(e) => patch(i, { label_my: e.target.value })} />
                  <input className="field py-2 text-sm" value={r.label_en} placeholder={`English — ${r.name}`} maxLength={60} onChange={(e) => patch(i, { label_en: e.target.value })} />
                </div>
                <Toggle checked={!r.hidden} onChange={(v) => patch(i, { hidden: !v })} label={L("Home မှာ ပြမယ်", "Show on Home")} />
              </div>
            </li>
          );
        })}
      </ul>
      <button type="button" disabled={busy || !dirty} onClick={save} className="btn-primary btn-lg w-full">
        {busy ? L("သိမ်းနေသည်…", "Saving…") : dirty ? L("အမျိုးအစားများ သိမ်းမယ်", "Save categories") : L("✓ သိမ်းပြီး", "✓ Saved")}
      </button>
    </section>
  );
}

export default function Storefront({ data }: { data: AdminData }) {
  const { lang } = useT();
  const L = (my: string, en: string) => (lang === "my" ? my : en);
  const [tab, setTab] = useState<"text" | "categories">("text");
  return (
    <div className="space-y-4 pb-24 lg:pb-0">
      <PageHeader
        title={L("ဆိုင်မျက်နှာစာ", "Storefront")}
        sub={L("Customer တွေ မြင်ရတဲ့ စာသားနဲ့ အမျိုးအစားတွေကို ပြင်ပါ", "Edit the text and categories customers see")}
        action={<a href="/" target="_blank" rel="noreferrer" className="btn-ghost">{L("ဆိုင်ကို ကြည့်မယ် ↗", "View store ↗")}</a>}
      />
      <div className="flex gap-2">
        <button type="button" className="chip" aria-pressed={tab === "text"} onClick={() => setTab("text")}>{L("စာသားများ", "Text")}</button>
        <button type="button" className="chip" aria-pressed={tab === "categories"} onClick={() => setTab("categories")}>{L("အမျိုးအစားများ", "Categories")}</button>
      </div>
      {tab === "text" ? <TextEditor data={data} /> : <CategoryEditor data={data} />}
    </div>
  );
}
