"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { formatPrice } from "@/lib/format";
import { useAdminUi } from "./ui";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

async function uploadImage(file: File): Promise<string> {
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) throw new Error("Use a PNG, JPG, WEBP or GIF image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5 MB.");
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const name = `content_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("products").upload(name, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("products").getPublicUrl(name).data.publicUrl;
}

function ImageInput({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const { toast, confirm: ask } = useAdminUi();
  const alert = (m: string) => toast(m, "error");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-raised">
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="flex-1 space-y-2">
        <input className="field py-2" placeholder="https://… (or upload)" value={value} onChange={(e) => onChange(e.target.value)} />
        <label className="btn-ghost cursor-pointer px-3 py-1.5 text-xs">
          {busy ? "Uploading…" : "Upload image"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setBusy(true);
              try {
                onChange(await uploadImage(f));
              } catch (err: any) {
                alert(err.message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
      </div>
    </div>
  );
}

function ProductPicker({ products, selected, onChange }: { products: any[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const [q, setQ] = useState("");
  const list = products.filter((p) => `${p.name} ${p.product_type}`.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <div className="space-y-2">
      <input className="field py-2" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
        {list.map((p) => {
          const id = String(p.id);
          return (
            <li key={id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-raised">
                <input type="checkbox" checked={selected.includes(id)} onChange={() => toggle(id)} className="accent-[rgb(var(--brand))]" />
                <span className="flex-1 truncate text-sm">{p.name}</span>
                <span className="text-xs text-muted">{formatPrice(p.price)}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted">{selected.length} selected</p>
    </div>
  );
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 70);

/* ------------------------------------------------------------------ */
/* Hub posts                                                           */
/* ------------------------------------------------------------------ */

const emptyPost = { id: "", title: "", slug: "", tag: "news", excerpt: "", cover_url: "", body: "", product_ids: [] as string[], published: false };

/** True when the table from supabase/features.sql hasn't been created yet. */
const tableMissing = (error: any) =>
  !!error && (error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(String(error.message)));

function SetupNeeded() {
  return (
    <div className="panel my space-y-3 border-pass/40 p-5">
      <p className="font-semibold text-pass">⚠ Database setup မပြီးသေးပါ</p>
      <p className="text-sm text-muted">
        Hub၊ Toolkit နဲ့ Jobs အတွက် table တွေ မရှိသေးပါ။ Supabase → SQL Editor မှာ project ထဲက
        <code className="mx-1 rounded bg-raised px-1.5 py-0.5 text-text">supabase/features.sql</code>
        ဖိုင်ထဲက စာအားလုံးကို paste လုပ်ပြီး Run ပါ။ ပြီးရင် ဒီစာမျက်နှာကို refresh လုပ်ပါ။
      </p>
      <p className="text-xs text-muted">Run supabase/features.sql in the Supabase SQL Editor, then refresh.</p>
    </div>
  );
}

function HubManager({ products }: { products: any[] }) {
  const { toast, confirm: ask } = useAdminUi();
  const alert = (m: string) => toast(m, "error");
  const supabase = useMemo(() => createClient(), []);
  const [posts, setPosts] = useState<any[]>([]);
  const [missing, setMissing] = useState(false);
  const [edit, setEdit] = useState<typeof emptyPost | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    setMissing(tableMissing(error));
    if (error && !tableMissing(error)) alert(error.message);
    setPosts(data || []);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  // AI draws an original cover picture (runs in the background, ~30 s)
  const [drawing, setDrawing] = useState<string | null>(null);
  const drawCover = async (postId: string) => {
    setDrawing(postId);
    try {
      const res = await fetch("/api/ai/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "cover", post_id: postId }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      for (let i = 0; i < 60; i++) {
        const { data: job } = await supabase.from("ai_jobs").select("status, error").eq("id", json.job_id).maybeSingle();
        if (job?.status === "done") { toast("✓ Cover ready"); break; }
        if (job?.status === "error") throw new Error(job.error || "AI error");
        await new Promise((r) => setTimeout(r, 3000));
      }
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDrawing(null);
    }
  };

  const save = async () => {
    if (!edit) return;
    const slug = edit.slug || slugify(edit.title) || `post-${Date.now().toString(36)}`;
    if (!/^[a-z0-9-]{3,80}$/.test(slug)) return alert("Link name (slug) may only use a–z, 0–9 and dashes.");
    if (edit.cover_url && !/^https:\/\//.test(edit.cover_url)) return alert("Cover image must be an https:// link.");
    setSaving(true);
    const payload = {
      title: edit.title.trim(), slug, tag: edit.tag, excerpt: edit.excerpt.trim() || null,
      cover_url: edit.cover_url.trim() || null, body: edit.body, product_ids: edit.product_ids, published: edit.published,
    };
    const { error } = edit.id ? await supabase.from("posts").update(payload).eq("id", edit.id) : await supabase.from("posts").insert([payload]);
    setSaving(false);
    if (error) return alert(error.message.includes("duplicate") ? "That link name is already used." : error.message);
    setEdit(null);
    load();
  };

  if (edit) {
    return (
      <div className="panel max-w-3xl space-y-4 p-5">
        <h3 className="font-display text-lg font-bold">{edit.id ? "Edit post" : "New post"}</h3>
        <div>
          <label className="label">Title</label>
          <input className="field" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} maxLength={160} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Link name (slug)</label>
            <input className="field" placeholder={slugify(edit.title) || "auto"} value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value.toLowerCase() })} maxLength={80} />
            <p className="hint">nexuskit…/hub/<b>{edit.slug || slugify(edit.title) || "post-…"}</b></p>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="field" value={edit.tag} onChange={(e) => setEdit({ ...edit, tag: e.target.value })}>
              <option value="news">News</option>
              <option value="guide">Guide</option>
              <option value="promo">Promo</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Short summary</label>
          <textarea className="field" rows={2} maxLength={300} value={edit.excerpt} onChange={(e) => setEdit({ ...edit, excerpt: e.target.value })} />
        </div>
        <div>
          <label className="label">Cover image</label>
          <ImageInput value={edit.cover_url} onChange={(url) => setEdit({ ...edit, cover_url: url })} />
        </div>
        <div>
          <label className="label">Article</label>
          <textarea className="field font-mono text-sm" rows={14} maxLength={20000} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
          <p className="hint">Leave a blank line between paragraphs. Start a line with “## ” for a heading, “- ” for a list item.</p>
        </div>
        <div>
          <label className="label">Products to promote in this post</label>
          <ProductPicker products={products} selected={edit.product_ids} onChange={(ids) => setEdit({ ...edit, product_ids: ids })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={edit.published} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} className="accent-[rgb(var(--brand))]" />
          Published (visible on the Hub)
        </label>
        <div className="flex gap-2">
          <button type="button" className="btn-primary" disabled={saving || edit.title.trim().length < 3} onClick={save}>{saving ? "Saving…" : "Save post"}</button>
          <button type="button" className="btn-quiet" onClick={() => setEdit(null)}>Cancel</button>
        </div>
      </div>
    );
  }

  if (missing) return <SetupNeeded />;
  return (
    <div className="space-y-4">
      <button type="button" className="btn-primary" onClick={() => setEdit({ ...emptyPost })}>+ New post</button>
      <ul className="panel divide-y divide-line">
        {posts.length === 0 && <li className="p-5 text-sm text-muted">No posts yet.</li>}
        {posts.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
            <span className="h-12 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-raised">
              {p.cover_url ? <img src={p.cover_url} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-[10px] text-muted">No cover</span>}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{p.title}</p>
              <p className="text-xs text-muted">{p.tag} · /hub/{p.slug} · {new Date(p.created_at).toLocaleDateString()}</p>
            </div>
            <span className={`badge ${p.published ? "bg-mint/15 text-mint" : "bg-raised text-muted"}`}>{p.published ? "Published" : "Draft"}</span>
            <button type="button" className="btn-ghost px-3 py-1.5 text-xs" disabled={!!drawing} onClick={() => drawCover(p.id)}>
              {drawing === p.id ? "🎨 Drawing… (~30s)" : p.cover_url ? "🎨 New AI cover" : "🎨 AI cover"}
            </button>
            <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setEdit({ ...emptyPost, ...p, excerpt: p.excerpt || "", cover_url: p.cover_url || "", body: p.body || "", product_ids: p.product_ids || [] })}>Edit</button>
            <button type="button" className="btn-quiet px-3 py-1.5 text-xs text-danger" onClick={async () => { if (await ask("Delete this post?")) { await supabase.from("posts").delete().eq("id", p.id); load(); } }}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bundles / toolkits                                                  */
/* ------------------------------------------------------------------ */

const emptyBundle = { id: "", name: "", description: "", image: "", discount_percent: "10", product_ids: [] as string[], active: true };

function BundleManager({ products }: { products: any[] }) {
  const { toast, confirm: ask } = useAdminUi();
  const alert = (m: string) => toast(m, "error");
  const supabase = useMemo(() => createClient(), []);
  const [bundles, setBundles] = useState<any[]>([]);
  const [missing, setMissing] = useState(false);
  const [edit, setEdit] = useState<typeof emptyBundle | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("bundles").select("*").order("created_at", { ascending: false });
    setMissing(tableMissing(error));
    if (error && !tableMissing(error)) alert(error.message);
    setBundles(data || []);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  const priceOf = (ids: string[], pct: number) => {
    const items = ids.map((id) => products.find((p) => String(p.id) === id)).filter(Boolean);
    const original = items.reduce((n, p: any) => n + Number(p.price || 0), 0);
    return { original, price: items.reduce((n, p: any) => n + Math.round(Number(p.price || 0) * (100 - pct)) / 100, 0) };
  };

  const save = async () => {
    if (!edit) return;
    const pct = Number(edit.discount_percent);
    if (!(pct >= 0 && pct <= 90)) return alert("Discount must be between 0 and 90%.");
    if (edit.product_ids.length < 2) return alert("Choose at least 2 products.");
    if (edit.image && !/^https:\/\//.test(edit.image)) return alert("Image must be an https:// link.");
    setSaving(true);
    const payload = { name: edit.name.trim(), description: edit.description.trim() || null, image: edit.image.trim() || null, discount_percent: pct, product_ids: edit.product_ids, active: edit.active };
    const { error } = edit.id ? await supabase.from("bundles").update(payload).eq("id", edit.id) : await supabase.from("bundles").insert([payload]);
    setSaving(false);
    if (error) return alert(error.message);
    setEdit(null);
    load();
  };

  if (edit) {
    const { original, price } = priceOf(edit.product_ids, Number(edit.discount_percent) || 0);
    return (
      <div className="panel max-w-3xl space-y-4 p-5">
        <h3 className="font-display text-lg font-bold">{edit.id ? "Edit toolkit" : "New toolkit"}</h3>
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <div>
            <label className="label">Name</label>
            <input className="field" placeholder="e.g. Freelance Designer Kit" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} maxLength={120} />
          </div>
          <div>
            <label className="label">Discount %</label>
            <input className="field" type="number" min={0} max={90} value={edit.discount_percent} onChange={(e) => setEdit({ ...edit, discount_percent: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="field" rows={3} maxLength={2000} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
        </div>
        <div>
          <label className="label">Image (optional)</label>
          <ImageInput value={edit.image} onChange={(url) => setEdit({ ...edit, image: url })} />
        </div>
        <div>
          <label className="label">Products in this toolkit</label>
          <ProductPicker products={products} selected={edit.product_ids} onChange={(ids) => setEdit({ ...edit, product_ids: ids })} />
        </div>
        <p className="rounded-xl bg-raised p-3 text-sm">
          Separately <span className="line-through">{formatPrice(original)}</span> → toolkit <b className="text-pass">{formatPrice(price)}</b>
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} className="accent-[rgb(var(--brand))]" />
          Show in the store
        </label>
        <div className="flex gap-2">
          <button type="button" className="btn-primary" disabled={saving || edit.name.trim().length < 3} onClick={save}>{saving ? "Saving…" : "Save toolkit"}</button>
          <button type="button" className="btn-quiet" onClick={() => setEdit(null)}>Cancel</button>
        </div>
      </div>
    );
  }

  if (missing) return <SetupNeeded />;
  return (
    <div className="space-y-4">
      <button type="button" className="btn-primary" onClick={() => setEdit({ ...emptyBundle })}>+ New toolkit</button>
      <ul className="panel divide-y divide-line">
        {bundles.length === 0 && <li className="p-5 text-sm text-muted">No toolkits yet.</li>}
        {bundles.map((b) => {
          const { price } = priceOf(b.product_ids || [], Number(b.discount_percent) || 0);
          return (
            <li key={b.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{b.name}</p>
                <p className="text-xs text-muted">{(b.product_ids || []).length} products · −{b.discount_percent}% · {formatPrice(price)}</p>
              </div>
              <span className={`badge ${b.active ? "bg-mint/15 text-mint" : "bg-raised text-muted"}`}>{b.active ? "Live" : "Hidden"}</span>
              <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setEdit({ ...emptyBundle, ...b, description: b.description || "", image: b.image || "", discount_percent: String(b.discount_percent), product_ids: (b.product_ids || []).map(String) })}>Edit</button>
              <button type="button" className="btn-quiet px-3 py-1.5 text-xs text-danger" onClick={async () => { if (await ask("Delete this toolkit?")) { await supabase.from("bundles").delete().eq("id", b.id); load(); } }}>Delete</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Job moderation                                                      */
/* ------------------------------------------------------------------ */

function JobModeration() {
  const { toast, confirm: ask } = useAdminUi();
  const alert = (m: string) => toast(m, "error");
  const supabase = useMemo(() => createClient(), []);
  const [jobs, setJobs] = useState<any[]>([]);
  const [missing, setMissing] = useState(false);
  const [status, setStatus] = useState("pending");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("jobs").select("*").eq("status", status).order("created_at", { ascending: false }).limit(200);
    setMissing(tableMissing(error));
    if (error && !tableMissing(error)) alert(error.message);
    setJobs(data || []);
  }, [supabase, status]);
  useEffect(() => { load(); }, [load]);

  const setJobStatus = async (id: string, next: string) => {
    const patch: any = { status: next };
    if (next === "approved") patch.expires_at = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const { error } = await supabase.from("jobs").update(patch).eq("id", id);
    if (error) alert(error.message);
    load();
  };

  if (missing) return <SetupNeeded />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["pending", "approved", "rejected", "closed"].map((s) => (
          <button key={s} type="button" className="chip capitalize" aria-pressed={status === s} onClick={() => setStatus(s)}>{s === "pending" ? "Waiting for review" : s}</button>
        ))}
      </div>
      {jobs.length === 0 && <p className="panel p-5 text-sm text-muted">Nothing here.</p>}
      <ul className="grid gap-4 lg:grid-cols-2">
        {jobs.map((j) => (
          <li key={j.id} className="panel space-y-3 p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="badge bg-brand/15 text-brand">{j.kind}</span>
              {j.category && <span className="badge bg-raised text-muted">{j.category}</span>}
              <span className="ml-auto text-muted">{new Date(j.created_at).toLocaleString()}</span>
            </div>
            <p className="font-semibold">{j.title}</p>
            <p className="whitespace-pre-line text-sm text-muted">{j.description}</p>
            <dl className="grid grid-cols-[90px_1fr] gap-1 text-xs">
              <dt className="text-muted">Budget</dt><dd>{j.budget || "—"}</dd>
              <dt className="text-muted">Contact</dt><dd className="break-all">{j.contact}</dd>
              <dt className="text-muted">Posted by</dt><dd className="break-all">{j.poster_email}</dd>
            </dl>
            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              {j.status !== "approved" && <button type="button" className="btn bg-mint px-4 py-2 text-ink hover:bg-mint/90" onClick={() => setJobStatus(j.id, "approved")}>Approve (30 days)</button>}
              {j.status === "pending" && <button type="button" className="btn-ghost px-4 py-2" onClick={() => setJobStatus(j.id, "rejected")}>Reject</button>}
              {j.status === "approved" && <button type="button" className="btn-ghost px-4 py-2" onClick={() => setJobStatus(j.id, "closed")}>Close</button>}
              <button type="button" className="btn-quiet px-4 py-2 text-danger" onClick={async () => { if (await ask("Delete this post?")) { await supabase.from("jobs").delete().eq("id", j.id); load(); } }}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Admin tabs for the Hub, toolkits and the job board. */
export default function ContentManager({ section, products }: { section: "hub" | "bundles" | "jobs"; products: any[] }) {
  if (section === "hub") return <HubManager products={products} />;
  if (section === "bundles") return <BundleManager products={products} />;
  return <JobModeration />;
}
