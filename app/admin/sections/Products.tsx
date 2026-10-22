"use client";

import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { categoryKey, formatPrice } from "@/lib/format";
import { ProductArt } from "../../components/ProductCard";
import { ChevronDownIcon, PlusIcon, SearchIcon } from "../../components/icons";
import { sortProducts } from "@/lib/promotions";
import type { AdminData } from "../data";
import { Empty, PageHeader, Sheet, useAdminUi } from "../ui";

type Form = { id?: string; name: string; price: string; product_type: string; subscription_days: string; required_fields: string[]; description: string; image: string };

const blank = (category: string): Form => ({ name: "", price: "", product_type: category, subscription_days: "0", required_fields: [], description: "", image: "" });

export async function upload(data: AdminData, file: File) {
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) throw new Error("PNG / JPG / WEBP / GIF");
  if (file.size > 5 * 1024 * 1024) throw new Error("< 5 MB");
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const name = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await data.supabase.storage.from("products").upload(name, file, { contentType: file.type });
  if (error) throw error;
  return data.supabase.storage.from("products").getPublicUrl(name).data.publicUrl;
}

function ProductSheet({ data, form: initial, onClose }: { data: AdminData; form: Form; onClose: () => void }) {
  const { t } = useT();
  const { toast } = useAdminUi();
  const [form, setForm] = useState<Form>(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newField, setNewField] = useState("");
  const cat = data.categories.find((c) => c.name === form.product_type);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleField = (label: string) =>
    set("required_fields", form.required_fields.includes(label) ? form.required_fields.filter((x) => x !== label) : [...form.required_fields, label]);

  const addField = async () => {
    const label = newField.trim();
    if (!label) return;
    if (!data.fields.some((f) => f.label.toLowerCase() === label.toLowerCase())) {
      const { error } = await data.supabase.from("customer_info_fields").insert([{ label }]);
      if (error) return toast(t("ad.error", { msg: error.message }), "error");
      await data.reload.fields();
    }
    if (!form.required_fields.includes(label)) set("required_fields", [...form.required_fields, label]);
    setNewField("");
  };

  const save = async () => {
    const price = Number(form.price);
    if (!form.name.trim() || !(price >= 0)) return;
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      price,
      product_type: form.product_type || null,
      subscription_days: Math.max(0, Math.floor(Number(form.subscription_days) || 0)),
      required_fields: form.required_fields,
      description: form.description.trim() || null,
      image: form.image.trim() || null,
    };
    const { error } = form.id
      ? await data.supabase.from("products").update(payload).eq("id", form.id)
      : await data.supabase.from("products").insert([payload]);
    setBusy(false);
    if (error) return toast(t("ad.error", { msg: error.message }), "error");
    toast(t("ad.saved"));
    await data.reload.products();
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={form.id ? t("ad.p.edit") : t("ad.p.new")}
      footer={<button type="button" disabled={busy || !form.name.trim() || form.price === ""} onClick={save} className="btn-primary btn-lg w-full">{busy ? t("ad.saving") : t("ad.save")}</button>}
    >
      <div className="flex items-center gap-4">
        <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-raised"><ProductArt product={form} /></div>
        <div className="min-w-0 flex-1 space-y-2">
          <label className="btn-ghost cursor-pointer px-3 py-2 text-sm">
            {uploading ? t("ad.p.uploading") : t("ad.p.upload")}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setUploading(true);
              try { set("image", await upload(data, f)); } catch (err: any) { toast(t("ad.error", { msg: err.message }), "error"); } finally { setUploading(false); }
            }} />
          </label>
          <input className="field py-2 text-xs" placeholder="https://…" value={form.image} onChange={(e) => set("image", e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="pn">{t("ad.p.name")}</label>
        <input id="pn" className="field" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={t("ad.p.namePh")} maxLength={200} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="pp">{t("ad.p.price")}</label>
          <input id="pp" className="field" type="number" inputMode="decimal" min={0} step="any" value={form.price} onChange={(e) => set("price", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pc">{t("ad.p.category")}</label>
          <select id="pc" className="field" value={form.product_type} onChange={(e) => set("product_type", e.target.value)}>
            {data.categories.length === 0 && <option value="">—</option>}
            {data.categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            {form.product_type && !data.categories.some((c) => c.name === form.product_type) && <option value={form.product_type}>{form.product_type}</option>}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="pd">{t("ad.p.days")}</label>
        <input id="pd" className={`field ${cat?.has_subscription && !(Number(form.subscription_days) > 0) ? "border-pass" : ""}`} type="number" min={0} value={form.subscription_days} onChange={(e) => set("subscription_days", e.target.value)} />
        <p className="hint my">{t("ad.p.daysHint")}</p>
      </div>

      <div className="space-y-2">
        <p className="label">{t("ad.p.fields")}</p>
        <div className="flex flex-wrap gap-2">
          {data.fields.map((f) => (
            <button key={f.id} type="button" className="chip py-1.5" aria-pressed={form.required_fields.includes(f.label)} onClick={() => toggleField(f.label)}>{f.label}</button>
          ))}
          {form.required_fields.filter((r) => !data.fields.some((f) => f.label === r)).map((r) => (
            <button key={r} type="button" className="chip py-1.5" aria-pressed onClick={() => toggleField(r)}>{r}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="field py-2" value={newField} onChange={(e) => setNewField(e.target.value)} placeholder={t("ad.p.newField")} maxLength={100} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addField(); } }} />
          <button type="button" className="btn-ghost py-2" onClick={addField}><PlusIcon size={16} /></button>
        </div>
        <p className="hint my">{t("ad.p.fieldsHint")}</p>
      </div>

      <div>
        <label className="label" htmlFor="pdesc">{t("ad.p.desc")}</label>
        <textarea id="pdesc" className="field" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} />
      </div>
    </Sheet>
  );
}

export default function Products({ data }: { data: AdminData }) {
  const { t } = useT();
  const { toast, confirm } = useAdminUi();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [editing, setEditing] = useState<Form | null>(null);
  const [arranging, setArranging] = useState(false);
  const [moving, setMoving] = useState(false);

  // Same order as the store's "Recommended" sort.
  const ordered = useMemo(() => sortProducts(data.products, "recommended"), [data.products]);
  const list = useMemo(() => {
    const words = q.trim().toLowerCase();
    return ordered.filter((p) => (cat === "all" || categoryKey(p.product_type) === cat) && (!words || `${p.name} ${p.product_type}`.toLowerCase().includes(words)));
  }, [ordered, q, cat]);

  /** Move one product (to = new index) and save the new order for every product whose number changed. */
  const move = async (from: number, to: number) => {
    if (to < 0 || to >= ordered.length || from === to) return;
    const next = [...ordered];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    const changes = next.map((p, i) => ({ id: p.id, sort_order: (i + 1) * 10, old: p.sort_order })).filter((x) => x.old !== x.sort_order);
    setMoving(true);
    const results = await Promise.all(changes.map((x) => data.supabase.from("products").update({ sort_order: x.sort_order }).eq("id", x.id)));
    setMoving(false);
    const failed = results.find((r) => r.error);
    if (failed?.error) toast(t("ad.error", { msg: /sort_order/.test(failed.error.message) ? t("ad.p.needSql") : failed.error.message }), "error");
    await data.reload.products();
  };

  const types = Array.from(new Map(data.products.filter((p) => p.product_type).map((p) => [categoryKey(p.product_type), p.product_type])).entries());

  const toForm = (p: any): Form => ({
    id: p.id, name: p.name || "", price: String(p.price ?? ""), product_type: p.product_type || "",
    subscription_days: String(p.subscription_days || 0), required_fields: Array.isArray(p.required_fields) ? p.required_fields : [],
    description: p.description || "", image: p.image || "",
  });

  const remove = async (p: any) => {
    if (!(await confirm(t("ad.confirmDelete")))) return;
    const { error } = await data.supabase.from("products").delete().eq("id", p.id);
    if (error) return toast(t("ad.error", { msg: error.message }), "error");
    toast(t("ad.deleted"));
    data.reload.products();
  };

  return (
    <div>
      <PageHeader
        title={t("ad.products")}
        sub={t("ad.p.count", { n: data.products.length })}
        action={
          <div className="flex gap-2">
            {data.products.length > 1 && (
              <button type="button" className={arranging ? "btn-primary" : "btn-ghost"} onClick={() => setArranging((v) => !v)} aria-pressed={arranging}>
                {arranging ? t("ad.p.arrangeDone") : t("ad.p.arrange")}
              </button>
            )}
            {!arranging && <button type="button" className="btn-primary" onClick={() => setEditing(blank(data.categories[0]?.name || ""))}><PlusIcon size={18} /> {t("ad.p.new")}</button>}
          </div>
        }
      />
      {arranging && (
        <div>
          <p className="my mb-3 rounded-xl border border-brand/30 bg-brand/10 p-3 text-sm">{t("ad.p.arrangeHint")}</p>
          <ol className="space-y-2">
            {ordered.map((p, i) => (
              <li key={p.id} className="panel flex items-center gap-3 p-2.5">
                <span className="w-6 text-center text-sm font-bold tabular-nums text-muted">{i + 1}</span>
                <span className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-raised"><ProductArt product={p} className="text-xs" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="block text-xs text-muted">{p.product_type || "—"} · {formatPrice(p.price)}</span>
                </span>
                <span className="flex flex-shrink-0 gap-1">
                  <button type="button" disabled={moving || i === 0} onClick={() => move(i, 0)} className="btn-quiet h-9 px-2 text-xs" aria-label={t("ad.p.toTop")}>{t("ad.p.toTop")}</button>
                  <button type="button" disabled={moving || i === 0} onClick={() => move(i, i - 1)} className="btn-quiet h-9 w-9 p-0" aria-label="↑"><ChevronDownIcon size={18} className="rotate-180" /></button>
                  <button type="button" disabled={moving || i === ordered.length - 1} onClick={() => move(i, i + 1)} className="btn-quiet h-9 w-9 p-0" aria-label="↓"><ChevronDownIcon size={18} /></button>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {!arranging && (<>
      <div className="mb-4 space-y-3">
        <label className="relative block">
          <span className="sr-only">{t("ad.search")}</span>
          <SearchIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("ad.search")} className="field pl-10" />
        </label>
        {types.length > 1 && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <button type="button" className="chip py-1.5" aria-pressed={cat === "all"} onClick={() => setCat("all")}>{t("ad.f.all")}</button>
            {types.map(([key, name]) => <button key={key} type="button" className="chip py-1.5" aria-pressed={cat === key} onClick={() => setCat(key)}>{name}</button>)}
          </div>
        )}
      </div>

      {list.length === 0 ? <Empty text={t("ad.empty")} /> : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {list.map((p) => (
            <li key={p.id} className="panel flex items-center gap-3 p-3">
              <button type="button" onClick={() => setEditing(toForm(p))} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-raised"><ProductArt product={p} className="text-sm" /></span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block text-xs text-muted">
                    {p.product_type || "—"}
                    {Number(p.subscription_days) > 0 && ` · ${t("product.days", { n: p.subscription_days })}`}
                    {Array.isArray(p.required_fields) && p.required_fields.length > 0 && ` · ${p.required_fields.join(", ")}`}
                  </span>
                  <span className="price text-sm">{formatPrice(p.price)}</span>
                </span>
              </button>
              <div className="flex flex-shrink-0 flex-col gap-1">
                <button type="button" className="btn-quiet px-2.5 py-1 text-xs" onClick={() => setEditing({ ...toForm(p), id: undefined, name: `${p.name} ${t("ad.p.copySuffix")}` })}>{t("ad.p.duplicate")}</button>
                <button type="button" className="btn-quiet px-2.5 py-1 text-xs text-danger" onClick={() => remove(p)}>{t("ad.delete")}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      </>)}
      {editing && <ProductSheet key={editing.id || "new"} data={data} form={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
