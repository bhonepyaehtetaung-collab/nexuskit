"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useT } from "@/lib/i18n";
import { ArrowLeftIcon, CheckIcon } from "@/app/components/icons";

export default function NewJobPage() {
  const { t } = useT();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<any>(undefined);
  const [form, setForm] = useState({ kind: "hiring", title: "", description: "", category: "", budget: "", contact: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, [supabase]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.title.trim().length < 5 || form.description.trim().length < 20 || form.contact.trim().length < 3) {
      setError(t("jobs.errInput"));
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("submit_job", {
      p_kind: form.kind,
      p_title: form.title,
      p_description: form.description,
      p_category: form.category,
      p_budget: form.budget,
      p_contact: form.contact,
    });
    setBusy(false);
    if (error) {
      setError(error.message.includes("TOO_MANY") ? t("jobs.errTooMany") : error.message.includes("INVALID") ? t("jobs.errInput") : t("jobs.errGeneric"));
      return;
    }
    setDone(true);
  };

  return (
    <div className="container-page max-w-2xl pb-16 pt-4 sm:pt-8">
      <Link href="/jobs" className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-text">
        <ArrowLeftIcon size={16} /> {t("jobs.title")}
      </Link>
      <h1 className="my mb-2 font-display text-3xl font-bold">{t("jobs.newTitle")}</h1>
      <p className="my mb-6 text-sm text-muted">{t("jobs.review")}</p>

      {user === undefined ? (
        <div className="h-64 animate-pulse rounded-2xl bg-surface" />
      ) : !user ? (
        <div className="panel flex flex-col items-center gap-4 p-8 text-center">
          <p className="my">{t("jobs.loginFirst")}</p>
          <Link href="/my-account" className="btn-primary">{t("jobs.login")}</Link>
        </div>
      ) : done ? (
        <div className="panel flex flex-col items-center gap-4 p-8 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-mint/15 text-mint"><CheckIcon size={28} /></span>
          <p className="my font-medium">{t("jobs.sent")}</p>
          <div className="flex gap-2">
            <Link href="/jobs" className="btn-ghost">{t("jobs.title")}</Link>
            <Link href="/my-account" className="btn-primary">{t("jobs.mine")}</Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="panel space-y-5 p-5 sm:p-6">
          <fieldset>
            <legend className="label">{t("jobs.kind")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["hiring", "offering"] as const).map((k) => (
                <label key={k} className={`flex cursor-pointer items-center justify-center rounded-xl border-2 p-3 text-sm font-medium transition-colors ${form.kind === k ? "border-brand bg-brand/10" : "border-line bg-raised"}`}>
                  <input type="radio" name="kind" value={k} checked={form.kind === k} onChange={() => setForm({ ...form, kind: k })} className="sr-only" />
                  {t(`jobs.${k}` as const)}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="jt" className="label">{t("jobs.fTitle")}</label>
            <input id="jt" required minLength={5} maxLength={120} value={form.title} onChange={set("title")} placeholder={t("jobs.fTitlePh")} className="field" />
          </div>
          <div>
            <label htmlFor="jd" className="label">{t("jobs.fDesc")}</label>
            <textarea id="jd" required minLength={20} maxLength={3000} rows={6} value={form.description} onChange={set("description")} placeholder={t("jobs.fDescPh")} className="field resize-y" />
            <p className="hint text-right">{form.description.length}/3000</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="jc" className="label">{t("jobs.fCategory")}</label>
              <input id="jc" maxLength={60} value={form.category} onChange={set("category")} placeholder={t("jobs.fCategoryPh")} className="field" />
            </div>
            <div>
              <label htmlFor="jb" className="label">{t("jobs.fBudget")}</label>
              <input id="jb" maxLength={60} value={form.budget} onChange={set("budget")} placeholder={t("jobs.fBudgetPh")} className="field" />
            </div>
          </div>
          <div>
            <label htmlFor="jx" className="label">{t("jobs.fContact")}</label>
            <input id="jx" required minLength={3} maxLength={120} value={form.contact} onChange={set("contact")} placeholder={t("jobs.fContactPh")} className="field" />
          </div>
          {error && <p className="my rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger" role="alert">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary btn-lg w-full">{busy ? t("jobs.submitting") : t("jobs.submit")}</button>
        </form>
      )}
    </div>
  );
}
