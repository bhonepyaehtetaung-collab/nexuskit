"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCart, type CartItem } from "@/app/context/cartContext";
import { formatPrice } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { ProductArt } from "./ProductCard";
import { BagIcon, CheckIcon, CloseIcon, MinusIcon, PlusIcon, TrashIcon } from "./icons";

export function QuantityStepper({ item, compact = false }: { item: CartItem; compact?: boolean }) {
  const { dispatch } = useCart();
  const size = compact ? "h-8 w-8" : "h-10 w-10";
  return (
    <div className="inline-flex items-center rounded-xl border border-line bg-raised">
      <button
        type="button"
        className={`${size} grid place-items-center text-muted hover:text-text disabled:opacity-40`}
        onClick={() => dispatch({ type: "UPDATE_QUANTITY", payload: { id: item.id, quantity: item.quantity - 1 } })}
        disabled={item.quantity <= 1}
        aria-label={`Decrease ${item.name}`}
      >
        <MinusIcon size={16} />
      </button>
      <span className="min-w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {item.quantity}
      </span>
      <button
        type="button"
        className={`${size} grid place-items-center text-muted hover:text-text disabled:opacity-40`}
        onClick={() => dispatch({ type: "UPDATE_QUANTITY", payload: { id: item.id, quantity: item.quantity + 1 } })}
        disabled={item.quantity >= 99}
        aria-label={`Increase ${item.name}`}
      >
        <PlusIcon size={16} />
      </button>
    </div>
  );
}

export function CartLine({ item }: { item: CartItem }) {
  const { dispatch } = useCart();
  const { t } = useT();
  const fieldText = item.fields ? Object.entries(item.fields).map(([k, v]) => `${k}: ${v}`).join(" · ") : "";
  return (
    <li className="flex gap-3 py-4">
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-raised">
        <ProductArt product={item} className="text-base" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/products/${item.id}`} className="line-clamp-2 text-sm font-semibold hover:text-brand">
            {item.name}
          </Link>
          <button
            type="button"
            onClick={() => dispatch({ type: "REMOVE_FROM_CART", payload: item.id })}
            className="-mr-1 -mt-1 grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger"
            aria-label={`${t("cart.remove")}: ${item.name}`}
          >
            <TrashIcon size={16} />
          </button>
        </div>
        {fieldText && <p className="mt-0.5 truncate text-xs text-muted">{fieldText}</p>}
        <div className="mt-2 flex items-center justify-between gap-2">
          <QuantityStepper item={item} compact />
          <span className="price text-sm">{formatPrice(item.price * item.quantity)}</span>
        </div>
      </div>
    </li>
  );
}

/** Slide-in cart panel opened from the header cart button. */
export default function CartDrawer() {
  const { cart, subtotal, drawerOpen, setDrawerOpen } = useCart();
  const { t } = useT();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen, setDrawerOpen]);

  if (!drawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={t("search.close")}
        className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm"
        onClick={() => setDrawerOpen(false)}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t("cart.title")}
        className="absolute inset-y-0 right-0 flex w-full max-w-md animate-drawer-in flex-col border-l border-line bg-surface outline-none"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-bold">{t("cart.title")}</h2>
          <button type="button" onClick={() => setDrawerOpen(false)} className="btn-quiet h-9 w-9 p-0" aria-label={t("search.close")}>
            <CloseIcon size={18} />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-raised text-muted"><BagIcon size={26} /></div>
            <p className="my text-muted">{t("cart.empty")}</p>
            <Link href="/" onClick={() => setDrawerOpen(false)} className="btn-primary">
              {t("cart.browse")}
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {cart.map((item) => (
                <CartLine key={item.id} item={item} />
              ))}
            </ul>
            <div className="space-y-3 border-t border-line p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <div className="flex items-baseline justify-between">
                <span className="text-muted">{t("cart.subtotal")}</span>
                <span className="price text-xl">{formatPrice(subtotal)}</span>
              </div>
              <Link href="/checkout" onClick={() => setDrawerOpen(false)} className="btn-primary btn-lg w-full">
                {t("cart.checkout")}
              </Link>
              <Link href="/cart" onClick={() => setDrawerOpen(false)} className="btn-quiet w-full">
                {t("cart.view")}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Toaster() {
  const { toast, setDrawerOpen } = useCart();
  const { t } = useT();
  if (!toast) return null;
  return (
    <div
      key={toast.id}
      role="status"
      className="fixed inset-x-4 top-[calc(4.75rem+env(safe-area-inset-top))] z-[60] mx-auto flex max-w-sm animate-slide-up items-center gap-3 rounded-2xl border border-line bg-raised p-3 pl-4 shadow-2xl shadow-black/40 md:bottom-6 md:top-auto md:left-auto md:right-6 md:mx-0"
    >
      <span className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-full ${toast.tone === "error" ? "bg-danger/20 text-danger" : "bg-mint/20 text-mint"}`}>
        {toast.tone === "error" ? <CloseIcon size={14} /> : <CheckIcon size={14} />}
      </span>
      <p className="flex-1 text-sm">{toast.message}</p>
      {toast.tone !== "error" && (
        <button type="button" onClick={() => setDrawerOpen(true)} className="btn-ghost px-3 py-2 text-xs">
          {t("cart.view")}
        </button>
      )}
    </div>
  );
}
