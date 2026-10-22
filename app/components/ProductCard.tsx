"use client";

import Link from "next/link";
import { useCart } from "../context/cartContext";
import { useT } from "@/lib/i18n";
import { categoryHue, formatPrice } from "@/lib/format";
import { ClockIcon, PlusIcon } from "./icons";

/** Square artwork, or a coloured tile with the initials when there's no image. */
export function ProductArt({ product, className = "" }: { product: any; className?: string }) {
  const hue = categoryHue(product?.product_type || product?.name || "");
  if (product?.image) {
    return <img src={product.image} alt="" loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  }
  const initials = String(product?.name || "NK").split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
  return (
    <div
      className={`grid h-full w-full place-items-center font-display text-3xl font-bold text-white/90 ${className}`}
      style={{ background: `linear-gradient(140deg, hsl(${hue} 85% 58%), hsl(${(hue + 40) % 360} 80% 38%))` }}
    >
      {initials}
    </div>
  );
}

/**
 * Store tile, top-up-app style: square art, name, price and a quick add button.
 * Products that need a Player ID open the product page instead of adding directly.
 */
export default function ProductCard({ product }: { product: any }) {
  const { addItem } = useCart();
  const { t } = useT();
  const days = Number(product.subscription_days) || 0;
  const needsInfo = Array.isArray(product.required_fields) && product.required_fields.length > 0;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-brand/60">
      <Link href={`/products/${product.id}`} className="absolute inset-0 z-0" aria-label={product.name} />

      <div className="pointer-events-none relative aspect-square overflow-hidden bg-raised">
        <ProductArt product={product} className="transition-transform duration-500 group-hover:scale-[1.04]" />
        {product.sale && (
          <span className="badge absolute right-2 top-2 bg-danger text-[11px] font-bold text-white shadow">
            {t("sale.off", { n: product.sale.percent })}
          </span>
        )}
        {days > 0 && (
          <span className="badge absolute left-2 top-2 bg-ink/80 text-[11px] text-text backdrop-blur">
            <ClockIcon size={12} /> {t("product.days", { n: days })}
          </span>
        )}
      </div>

      <div className="pointer-events-none flex flex-1 flex-col gap-1 p-3 sm:p-4">
        {product.product_type && <p className="truncate text-[11px] font-medium text-muted sm:text-xs">{product.product_type}</p>}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">{product.name}</h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <span className="flex min-w-0 flex-col">
            {product.sale && <s className="text-[11px] leading-none text-muted sm:text-xs">{formatPrice(product.list_price)}</s>}
            <span className={`price text-base sm:text-lg ${product.sale ? "text-danger" : ""}`}>{formatPrice(product.price)}</span>
          </span>
          {needsInfo ? (
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-brand-strong text-white" aria-hidden="true">
              <PlusIcon size={18} />
            </span>
          ) : (
            <button
              type="button"
              onClick={() => addItem(product, 1)}
              className="pointer-events-auto relative z-10 grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-brand-strong text-white transition-transform hover:bg-brand active:scale-90"
              aria-label={`${t("product.add")}: ${product.name}`}
            >
              <PlusIcon size={18} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="aspect-square bg-raised" />
      <div className="space-y-2 p-3 sm:p-4">
        <div className="h-3 w-1/3 rounded bg-raised" />
        <div className="h-4 w-4/5 rounded bg-raised" />
        <div className="h-5 w-1/2 rounded bg-raised" />
      </div>
    </div>
  );
}
