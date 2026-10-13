"use client";

import Link from "next/link";
import { useCart } from "@/app/context/cartContext";
import { CartLine } from "@/app/components/CartDrawer";
import { BagIcon, LockIcon } from "@/app/components/icons";
import { formatPrice } from "@/lib/format";
import { useT } from "@/lib/i18n";

export default function CartPage() {
  const { cart, itemCount, subtotal, hydrated } = useCart();
  const { t } = useT();

  if (!hydrated) {
    return <div className="container-page py-16"><div className="h-40 animate-pulse rounded-2xl bg-surface" /></div>;
  }

  if (cart.length === 0) {
    return (
      <div className="container-page flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-surface text-muted"><BagIcon size={28} /></div>
        <h1 className="my font-display text-2xl font-bold">{t("cart.empty")}</h1>
        <p className="my text-muted">{t("cart.emptySub")}</p>
        <Link href="/" className="btn-primary btn-lg mt-2">{t("cart.browse")}</Link>
      </div>
    );
  }

  return (
    <div className="container-page pb-16 pt-6 sm:pt-10">
      <h1 className="mb-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">{t("cart.title")}</h1>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <ul className="panel divide-y divide-line px-4 sm:px-6">
          {cart.map((item) => <CartLine key={item.id} item={item} />)}
        </ul>

        <aside className="panel space-y-4 p-5 sm:p-6 lg:sticky lg:top-24">
          <div className="flex justify-between text-sm text-muted">
            <span>{t("cart.items")}</span>
            <span className="tabular-nums">{itemCount}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-4">
            <span className="font-semibold">{t("cart.subtotal")}</span>
            <span className="price text-2xl">{formatPrice(subtotal)}</span>
          </div>
          <p className="my text-xs text-muted">{t("cart.promoLater")}</p>
          <Link href="/checkout" className="btn-primary btn-lg w-full">{t("cart.checkout")}</Link>
          <p className="my flex items-center justify-center gap-1.5 text-xs text-muted">
            <LockIcon size={14} /> {t("co.private")}
          </p>
        </aside>
      </div>
    </div>
  );
}
