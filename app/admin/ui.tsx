"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n";
import { CheckIcon, CloseIcon, CopyIcon } from "../components/icons";

/* ------------------------------------------------------------------ */
/* Toasts + confirm dialog (replace alert() / confirm())               */
/* ------------------------------------------------------------------ */

type Toast = { id: number; text: string; tone: "ok" | "error" | "info" };
type ConfirmState = { text: string; danger?: boolean; resolve: (ok: boolean) => void } | null;

const UiContext = createContext<{
  toast: (text: string, tone?: Toast["tone"]) => void;
  confirm: (text: string, danger?: boolean) => Promise<boolean>;
} | null>(null);

export function AdminUiProvider({ children }: { children: ReactNode }) {
  const { t } = useT();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ask, setAsk] = useState<ConfirmState>(null);

  const toast = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), tone === "error" ? 6000 : 3000);
  }, []);

  const confirm = useCallback((text: string, danger = true) => new Promise<boolean>((resolve) => setAsk({ text, danger, resolve })), []);
  const answer = (ok: boolean) => {
    ask?.resolve(ok);
    setAsk(null);
  };

  return (
    <UiContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-[90] flex flex-col items-center gap-2 md:inset-x-auto md:right-6 md:items-end">
        {toasts.map((x) => (
          <div
            key={x.id}
            role="status"
            className={`pointer-events-auto flex max-w-sm animate-slide-up items-center gap-3 rounded-2xl border bg-raised px-4 py-3 text-sm shadow-2xl shadow-black/40 ${
              x.tone === "error" ? "border-danger/50" : x.tone === "info" ? "border-info/50" : "border-mint/50"
            }`}
          >
            <span className={`grid h-6 w-6 flex-shrink-0 place-items-center rounded-full ${x.tone === "error" ? "bg-danger/20 text-danger" : x.tone === "info" ? "bg-info/20 text-info" : "bg-mint/20 text-mint"}`}>
              {x.tone === "error" ? <CloseIcon size={14} /> : <CheckIcon size={14} />}
            </span>
            <span className="my">{x.text}</span>
          </div>
        ))}
      </div>
      {ask && (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true">
          <div className="w-full max-w-sm animate-slide-up space-y-5 rounded-2xl border border-line bg-surface p-5">
            <p className="my">{ask.text}</p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-quiet" onClick={() => answer(false)} autoFocus>{t("ad.cancel")}</button>
              <button type="button" className={ask.danger ? "btn bg-danger text-white hover:bg-danger/90" : "btn-primary"} onClick={() => answer(true)}>OK</button>
            </div>
          </div>
        </div>
      )}
    </UiContext.Provider>
  );
}

export function useAdminUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useAdminUi must be used inside AdminUiProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Sheet: bottom sheet on phones, side panel on desktop                 */
/* ------------------------------------------------------------------ */

export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const { t } = useT();
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // Runs only when the sheet opens/closes, so live data refreshes never steal focus from inputs.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panel.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);
  if (!open || typeof document === "undefined") return null;
  // Portal to <body> so the sheet always sits above the tab bar (no parent stacking context).
  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <button type="button" aria-label={t("ad.close")} className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 flex max-h-[92vh] animate-sheet-in flex-col rounded-t-3xl border border-line bg-surface outline-none md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[560px] md:animate-drawer-in md:rounded-none md:rounded-l-3xl"
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-line md:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="my min-w-0 truncate font-display text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="btn-quiet h-9 w-9 flex-shrink-0 p-0" aria-label={t("ad.close")}><CloseIcon size={18} /></button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-line p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

export function CopyChip({ label, value }: { label?: string; value: string }) {
  const { t } = useT();
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setOk(true);
          setTimeout(() => setOk(false), 1200);
        } catch { /* blocked */ }
      }}
      className="group flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-raised px-3 py-2.5 text-left transition-colors hover:border-brand/50"
    >
      <span className="min-w-0">
        {label && <span className="block text-xs text-muted">{label}</span>}
        <span className="block break-all font-medium">{value}</span>
      </span>
      <span className={`flex flex-shrink-0 items-center gap-1 text-xs ${ok ? "text-mint" : "text-muted group-hover:text-text"}`}>
        {ok ? <CheckIcon size={14} /> : <CopyIcon size={14} />} {ok ? t("ad.copied") : t("ad.copy")}
      </span>
    </button>
  );
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="my font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {sub && <p className="my mt-0.5 text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="panel my p-8 text-center text-sm text-muted">{text}</p>;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="my text-sm">{label}</span>
      <span className="relative inline-flex">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-mint peer-focus-visible:ring-2 peer-focus-visible:ring-brand" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

/** Cells starting with = + - @ are prefixed so spreadsheets don't run them as formulas. */
export function downloadCsv(rows: any[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const cell = (v: any) => {
    let text = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const csv = "﻿" + [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

/** Tell the server to refresh its cached copy of the store (after an admin edit). */
let bustTimer: ReturnType<typeof setTimeout> | undefined;
export function bustStoreCache() {
  clearTimeout(bustTimer);
  bustTimer = setTimeout(() => {
    fetch("/api/revalidate", { method: "POST" }).catch(() => {});
  }, 800);
}
