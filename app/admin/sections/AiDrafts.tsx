"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { BagIcon, BriefcaseIcon, CloseIcon, NewsIcon, PlusIcon, UploadIcon } from "../../components/icons";
import type { AdminData, Role } from "../data";
import { bustStoreCache, Empty, PageHeader, useAdminUi } from "../ui";

type Mode = "products" | "job" | "news";
type Draft = { id: string; kind: "product" | "bundle" | "post" | "job"; status: string; data: any; cost: number | null; note: string | null; sources: any[]; origin: string; decided_by: string | null; decided_at: string | null; created_at: string };

/** Shrink phone screenshots before upload (max 1600px, JPEG). */
async function toDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function AiDrafts({ data, role, onChange }: { data: AdminData; role: Role; onChange: () => void }) {
  const { lang } = useT();
  const L = (my: string, en: string) => (lang === "my" ? my : en);
  const { toast } = useAdminUi();

  const [mode, setMode] = useState<Mode>("products");
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    const { data: rows, error } = await data.supabase.from("ai_drafts").select("*").order("created_at", { ascending: false }).limit(200);
    setMissing(!!error && /does not exist|schema cache/i.test(error.message));
    setDrafts((rows as Draft[]) || []);
  }, [data.supabase]);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => ({
    pending: drafts.filter((d) => d.status === "pending").length,
    approved: drafts.filter((d) => d.status === "approved").length,
    rejected: drafts.filter((d) => d.status === "rejected").length,
  }), [drafts]);
  const list = drafts.filter((d) => d.status === filter);

  const generate = async () => {
    if (mode !== "news" && !text.trim() && images.length === 0) return toast(L("စာ ဒါမှမဟုတ် screenshot ထည့်ပါ", "Add text or a screenshot"), "error");
    setBusy(true);
    try {
      const res = await fetch("/api/ai/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: mode, text, topic: mode === "news" ? text : undefined, images }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      // The AI runs in the background; wait for its job to finish (max ~5 min).
      let job: any = null;
      for (let i = 0; i < 100; i++) {
        const { data: row } = await data.supabase.from("ai_jobs").select("status, error, draft_count").eq("id", json.job_id).maybeSingle();
        job = row;
        if (row && (row.status === "done" || row.status === "error")) break;
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (!job || (job.status !== "done" && job.status !== "error")) throw new Error(L("AI အချိန်ကြာနေပါတယ် — ခဏနေ ဒီစာမျက်နှာကို refresh လုပ်ကြည့်ပါ", "Still working — refresh in a moment"));
      if (job.status === "error") throw new Error(job.error || "AI error");
      const n = Number(job.draft_count) || 0;
      toast(n ? L(`Draft ${n} ခု ရပါပြီ — စစ်ပြီး ဆုံးဖြတ်ပါ`, `${n} drafts ready — review below`) : L("ထည့်စရာ မတွေ့ပါ", "Nothing found"), n ? "ok" : "info");
      setText("");
      setImages([]);
      setFilter("pending");
      await load();
      onChange();
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const decide = async (d: Draft, approve: boolean, edited?: any) => {
    const { error } = await data.supabase.rpc("publish_draft", { p_id: d.id, p_approve: approve, p_data: approve ? edited ?? d.data : null });
    if (error) {
      const msg = /PRICE_REQUIRED/.test(error.message) ? L("ရောင်းဈေး ထည့်ပါ", "Enter a selling price") : error.message;
      return toast(msg, "error");
    }
    toast(approve ? L("✓ Website ပေါ် တင်ပြီးပါပြီ", "✓ Published") : L("ပယ်လိုက်ပါပြီ", "Rejected"), approve ? "ok" : "info");
    if (approve) bustStoreCache();
    await load();
    onChange();
    if (approve && d.kind === "product") data.reload.products();
  };

  if (missing) {
    return (
      <div>
        <PageHeader title="AI Drafts" />
        <div className="panel my space-y-2 border-pass/40 p-5">
          <p className="font-semibold text-pass">⚠ Database setup မပြီးသေးပါ</p>
          <p className="text-sm text-muted">Supabase → SQL Editor → New query မှာ <code className="rounded bg-raised px-1.5 text-text">supabase/ai.sql</code> ထဲက စာအားလုံးကို paste လုပ်ပြီး Run ပါ။ ပြီးရင် refresh လုပ်ပါ။</p>
        </div>
      </div>
    );
  }

  const modes: { id: Mode; label: string; Icon: any; ph: string }[] = [
    { id: "products", label: L("Supplier ဈေးစာရင်း", "Supplier price list"), Icon: BagIcon, ph: L("Supplier ဆီက ဈေးစာရင်းကို ဒီမှာ paste လုပ်ပါ (သို့) screenshot တင်ပါ…\nဥပမာ: PUBG 660 UC - 14,500 Ks", "Paste the supplier's price list or attach screenshots…") },
    { id: "job", label: L("Job post", "Job post"), Icon: BriefcaseIcon, ph: L("အလုပ်ရှင်ပို့တဲ့ စာ (သို့) အချက်အလက်တွေကို ရေးပါ…\nဥပမာ: Canva နဲ့ FB post ၁၀ ခု ဆွဲပေးမယ့်သူ လိုတယ်၊ 100,000 Ks, @contact", "Paste the job request…") },
    { id: "news", label: L("Hub news", "Hub news"), Icon: NewsIcon, ph: L("ဘာအကြောင်း ရှာစေချင်လဲ (မထည့်လည်းရ) — ဥပမာ: PUBG update, Canva AI", "Topic (optional) — e.g. PUBG update, Canva AI") },
  ];
  const current = modes.find((m) => m.id === mode)!;

  return (
    <div className="space-y-5">
      <PageHeader title="AI Drafts" sub={L("AI က ရေးပေးမယ် — သင် approve လုပ်မှ website ပေါ် တက်မယ်", "AI writes drafts — nothing goes live until you approve")} />

      {/* Composer */}
      <section className="panel space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-2">
          {modes.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => setMode(id)} aria-pressed={mode === id}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs transition-colors sm:flex-row sm:justify-center sm:text-sm ${mode === id ? "border-brand bg-brand/10 text-brand" : "border-line bg-raised text-muted hover:text-text"}`}>
              <Icon size={18} /> <span className="my text-center">{label}</span>
            </button>
          ))}
        </div>

        {mode === "news" ? (
          <input className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder={current.ph} maxLength={200} />
        ) : (
          <textarea className="field my min-h-32" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={current.ph} maxLength={12000} />
        )}

        {mode !== "news" && (
          <div className="flex flex-wrap items-center gap-2">
            {images.map((src, i) => (
              <span key={i} className="relative h-16 w-16 overflow-hidden rounded-xl border border-line">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button type="button" aria-label="Remove" onClick={() => setImages(images.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white"><CloseIcon size={12} /></button>
              </span>
            ))}
            {images.length < 4 && (
              <label className="btn-ghost cursor-pointer px-3 py-2 text-sm">
                <UploadIcon size={16} /> Screenshot
                <input type="file" accept="image/*" multiple className="sr-only" onChange={async (e) => {
                  const files = Array.from(e.target.files || []).slice(0, 4 - images.length);
                  e.target.value = "";
                  try {
                    const urls = await Promise.all(files.map(toDataUrl));
                    setImages((prev) => [...prev, ...urls].slice(0, 4));
                  } catch {
                    toast(L("ပုံ ဖတ်မရပါ", "Could not read image"), "error");
                  }
                }} />
              </label>
            )}
          </div>
        )}

        <button type="button" onClick={generate} disabled={busy} className="btn-primary btn-lg w-full">
          {busy ? (
            <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> {mode === "news" ? L("News ရှာပြီး ပုံဆွဲနေပါတယ်… (၁–၂ မိနစ်)", "Finding news & drawing covers… (1–2 min)") : L("AI ရေးနေပါတယ်…", "AI is drafting…")}</>
          ) : (
            <><PlusIcon size={18} /> {mode === "news" ? L("News ရှာပြီး draft ရေးမယ်", "Find news & draft") : L("AI နဲ့ draft ရေးမယ်", "Draft with AI")}</>
          )}
        </button>
        <p className="hint my">{L("Telegram bot ဆီ forward လုပ်ရင်လည်း draft တွေ ဒီမှာ ပေါ်ပါမယ်။", "Forwarding to your Telegram bot also creates drafts here.")}</p>
      </section>

      {(role === "super_admin" || role === "manager") && <PricingCard data={data} L={L} />}

      {/* Review */}
      <section className="space-y-3">
        <div className="flex gap-2">
          {(["pending", "approved", "rejected"] as const).map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === "pending" ? L("စစ်ရန်", "To review") : f === "approved" ? L("တင်ပြီး", "Approved") : L("ပယ်ပြီး", "Rejected")}
              {counts[f] > 0 && <span className={`rounded-full px-1.5 text-xs ${f === "pending" ? "bg-pass text-ink" : "bg-raised"}`}>{counts[f]}</span>}
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <Empty text={filter === "pending" ? L("စစ်စရာ draft မရှိပါ", "No drafts to review") : L("မရှိသေးပါ", "Nothing yet")} />
        ) : (
          <ul className="grid gap-3 xl:grid-cols-2">
            {list.map((d) => (
              <li key={d.id}>
                {d.status === "pending" ? <DraftCard draft={d} data={data} L={L} onDecide={decide} /> : <DoneRow draft={d} L={L} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PricingCard({ data, L }: { data: AdminData; L: (my: string, en: string) => string }) {
  const { toast } = useAdminUi();
  const [rules, setRules] = useState<{ markup_percent: number; round_to: number } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    data.supabase.from("pricing_rules").select("markup_percent, round_to").eq("id", 1).maybeSingle().then(({ data: r }) => r && setRules(r as any));
  }, [data.supabase]);
  if (!rules) return null;

  const example = Math.ceil((10000 * (1 + Number(rules.markup_percent) / 100)) / rules.round_to) * rules.round_to;
  const save = async () => {
    const { error } = await data.supabase.from("pricing_rules").update({ markup_percent: Number(rules.markup_percent), round_to: Number(rules.round_to), updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return toast(error.message, "error");
    toast(L("သိမ်းပြီးပါပြီ", "Saved"));
    setOpen(false);
  };

  return (
    <section className="panel p-4">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 text-left">
        <span>
          <span className="my block font-semibold">{L("အမြတ် စည်းမျဉ်း", "Pricing rule")}</span>
          <span className="my text-xs text-muted">{L(`ဝယ်ဈေး + ${rules.markup_percent}% · ${rules.round_to} Ks ပြည့်အောင်`, `Cost + ${rules.markup_percent}% · round up to ${rules.round_to} Ks`)} — 10,000 → {formatPrice(example)}</span>
        </span>
        <span className="text-xs text-brand">{open ? L("ပိတ်", "Close") : L("ပြင်မယ်", "Edit")}</span>
      </button>
      {open && (
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="mk">{L("အမြတ် %", "Markup %")}</label>
            <input id="mk" className="field" type="number" min={0} max={500} value={rules.markup_percent} onChange={(e) => setRules({ ...rules, markup_percent: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label" htmlFor="rt">{L("ပြည့်အောင် ပိုင်းမယ်", "Round up to")}</label>
            <select id="rt" className="field" value={rules.round_to} onChange={(e) => setRules({ ...rules, round_to: Number(e.target.value) })}>
              {[1, 10, 50, 100, 500, 1000].map((n) => <option key={n} value={n}>{n.toLocaleString()} Ks</option>)}
            </select>
          </div>
          <button type="button" className="btn-primary" onClick={save}>{L("သိမ်းမယ်", "Save")}</button>
          <p className="hint my sm:col-span-3">{L("ဝယ်ဈေးကို customer တွေ မမြင်ရပါ — staff သာ မြင်ရပါတယ်။", "Customers never see your cost price — only staff can.")}</p>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */

const KIND_BADGE: Record<string, { label: string; tone: string }> = {
  product: { label: "Product", tone: "bg-mint/15 text-mint" },
  bundle: { label: "Toolkit", tone: "bg-mint/15 text-mint" },
  post: { label: "Hub", tone: "bg-info/15 text-info" },
  job: { label: "Job", tone: "bg-brand/15 text-brand" },
};

function DraftCard({ draft, data, L, onDecide }: { draft: Draft; data: AdminData; L: (my: string, en: string) => string; onDecide: (d: Draft, approve: boolean, edited?: any) => Promise<void> }) {
  const [d, setD] = useState<any>(() => ({ ...draft.data }));
  const [busy, setBusy] = useState(false);
  const [showBody, setShowBody] = useState(false);
  const set = (k: string, v: any) => setD((prev: any) => ({ ...prev, [k]: v }));
  const badge = KIND_BADGE[draft.kind];

  const act = async (approve: boolean) => {
    setBusy(true);
    const payload = { ...d };
    if (draft.kind === "product") {
      payload.price = payload.price === "" || payload.price === null ? null : Number(payload.price);
      payload.subscription_days = Number(payload.subscription_days) || 0;
      if (typeof payload.required_fields === "string") payload.required_fields = payload.required_fields.split(",").map((s: string) => s.trim()).filter(Boolean);
      delete payload.currency;
    }
    await onDecide(draft, approve, payload);
    setBusy(false);
  };

  const margin = draft.kind === "product" && draft.cost !== null && d.price !== "" && d.price !== null ? Number(d.price) - Number(draft.cost) : null;

  return (
    <article className="panel flex h-full flex-col gap-3 p-4">
      <header className="flex items-center gap-2 text-xs">
        <span className={`badge ${badge.tone}`}>{badge.label}</span>
        <span className="text-muted">{draft.origin === "telegram" ? "Telegram" : "Dashboard"} · {new Date(draft.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
      </header>

      {draft.kind === "product" && (
        <>
          <input className="field font-medium" value={d.name || ""} onChange={(e) => set("name", e.target.value)} aria-label="Name" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">{L("ရောင်းဈေး (Ks)", "Price (Ks)")}</label>
              <input className={`field ${d.price === null || d.price === "" ? "border-pass" : ""}`} type="number" inputMode="numeric" min={0} value={d.price ?? ""} onChange={(e) => set("price", e.target.value)} />
            </div>
            <div>
              <label className="label">{L("ဝယ်ဈေး", "Cost")}</label>
              <p className="field flex items-center justify-between bg-transparent text-sm">
                <span>{draft.cost !== null ? formatPrice(draft.cost) : d.currency && d.currency !== "MMK" ? d.currency : "—"}</span>
                {margin !== null && <span className={margin >= 0 ? "text-mint" : "text-danger"}>{margin >= 0 ? "+" : ""}{margin.toLocaleString()}</span>}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select className="field text-sm" value={d.product_type || ""} onChange={(e) => set("product_type", e.target.value)} aria-label="Category">
              <option value="">—</option>
              {data.categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <input className="field text-sm" type="number" min={0} value={d.subscription_days ?? 0} onChange={(e) => set("subscription_days", e.target.value)} aria-label="Days" title={L("သက်တမ်း (ရက်)", "Days")} />
          </div>
          <input className="field text-sm" value={Array.isArray(d.required_fields) ? d.required_fields.join(", ") : d.required_fields || ""} onChange={(e) => set("required_fields", e.target.value)} placeholder="Player ID, Email Address" aria-label="Required fields" />
          <textarea className="field my text-sm" rows={2} value={d.description || ""} onChange={(e) => set("description", e.target.value)} aria-label="Description" />
        </>
      )}

      {draft.kind === "job" && (
        <>
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <select className="field text-sm" value={d.kind || "hiring"} onChange={(e) => set("kind", e.target.value)} aria-label="Type">
              <option value="hiring">Hiring</option>
              <option value="offering">Offering</option>
            </select>
            <input className="field font-medium" value={d.title || ""} onChange={(e) => set("title", e.target.value)} aria-label="Title" />
          </div>
          <textarea className="field my text-sm" rows={5} value={d.description || ""} onChange={(e) => set("description", e.target.value)} aria-label="Description" />
          <div className="grid grid-cols-2 gap-2">
            <input className="field text-sm" value={d.budget || ""} onChange={(e) => set("budget", e.target.value)} placeholder="Budget" />
            <input className={`field text-sm ${!d.contact ? "border-pass" : ""}`} value={d.contact || ""} onChange={(e) => set("contact", e.target.value)} placeholder="Contact (@telegram)" />
          </div>
        </>
      )}

      {draft.kind === "post" && (
        <>
          {d.cover_url ? (
            <div className="relative overflow-hidden rounded-xl border border-line">
              <img src={d.cover_url} alt="" className="aspect-[1200/630] w-full object-cover" />
              <button type="button" onClick={() => set("cover_url", "")} className="absolute right-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] text-white">{L("ပုံဖယ်မယ်", "Remove picture")}</button>
            </div>
          ) : (
            <p className="my rounded-xl border border-dashed border-line p-3 text-center text-xs text-muted">{L("ပုံမပါ — တင်ပြီးရင် Hub post မှာ “🎨 AI cover” နှိပ်ပြီး ဆွဲခိုင်းလို့ရပါတယ်", "No picture — after publishing, use “🎨 AI cover” in Hub posts")}</p>
          )}
          <input className="field my font-medium" value={d.title || ""} onChange={(e) => set("title", e.target.value)} aria-label="Title" />
          <input className="field my text-sm" value={d.excerpt || ""} onChange={(e) => set("excerpt", e.target.value)} aria-label="Excerpt" />
          {showBody ? (
            <textarea className="field my text-sm" rows={10} value={d.body || ""} onChange={(e) => set("body", e.target.value)} aria-label="Article" />
          ) : (
            <button type="button" onClick={() => setShowBody(true)} className="my rounded-xl border border-line bg-raised p-3 text-left text-sm text-muted">
              {String(d.body || "").slice(0, 220)}… <span className="text-brand">{L("အပြည့်ဖတ်/ပြင်ရန်", "Read / edit")}</span>
            </button>
          )}
          {draft.sources?.length > 0 && (
            <ul className="space-y-1 text-xs">
              {draft.sources.slice(0, 4).map((s: any, i: number) => (
                <li key={i} className="truncate">↗ <a href={s.url} target="_blank" rel="noreferrer noopener" className="text-info hover:underline">{s.title || s.url}</a></li>
              ))}
            </ul>
          )}
        </>
      )}

      {draft.note && <p className="my rounded-xl bg-pass/10 px-3 py-2 text-xs text-pass">⚠ {draft.note}</p>}

      <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-1">
        <button type="button" disabled={busy} onClick={() => act(true)} className="btn bg-mint text-ink hover:bg-mint/90">
          ✓ {draft.kind === "product" ? L("ဆိုင်ထဲ ထည့်မယ်", "Add to store") : L("တင်မယ်", "Publish")}
        </button>
        <button type="button" disabled={busy} onClick={() => act(false)} className="btn-quiet text-danger">{L("မတင်ဘူး", "Reject")}</button>
      </div>
    </article>
  );
}

function DoneRow({ draft, L }: { draft: Draft; L: (my: string, en: string) => string }) {
  const badge = KIND_BADGE[draft.kind];
  const d = draft.data || {};
  return (
    <div className="panel flex items-center gap-3 p-3 text-sm">
      <span className={`badge ${badge.tone}`}>{badge.label}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{d.name || d.title}</span>
        <span className="block truncate text-xs text-muted">
          {draft.decided_by || "—"} · {draft.decided_at ? new Date(draft.decided_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
        </span>
      </span>
      {draft.kind === "product" && typeof d.price === "number" && <span className="price">{formatPrice(d.price)}</span>}
      <span className={`text-xs ${draft.status === "approved" ? "text-mint" : "text-danger"}`}>{draft.status === "approved" ? L("တင်ပြီး", "Live") : L("ပယ်ပြီး", "Rejected")}</span>
    </div>
  );
}
