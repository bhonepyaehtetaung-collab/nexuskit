"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { ProductArt } from "./ProductCard";

/** Toolkit card: stacked product art, savings badge, bundle price vs separate price. */
export default function BundleCard({ bundle }: { bundle: any }) {
  const { t } = useT();
  const art = (bundle.items || []).slice(0, 3);
  return (
    <Link
      href={`/bundles/${bundle.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-[linear-gradient(160deg,rgb(var(--raised))_0%,rgb(var(--surface))_60%)] transition-[border-color,transform] hover:-translate-y-0.5 hover:border-pass/60"
    >
      <div className="relative flex h-32 items-center justify-center overflow-hidden">
        {bundle.image ? (
          <img src={bundle.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
        ) : (
          <div className="flex -space-x-5">
            {art.map((p: any, i: number) => (
              <span
                key={p.id}
                className="h-20 w-20 overflow-hidden rounded-2xl border-2 border-surface shadow-lg"
                style={{ transform: `rotate(${(i - 1) * 8}deg)`, zIndex: i === 1 ? 2 : 1 }}
              >
                <ProductArt product={p} className="text-base" />
              </span>
            ))}
          </div>
        )}
        <span className="badge absolute left-3 top-3 bg-pass text-ink">{t("bundle.badge", { n: bundle.discount })}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs text-muted">{t("bundle.kind")} · {(bundle.items || []).length}</p>
        <h3 className="line-clamp-2 font-semibold leading-snug">{bundle.name}</h3>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="price text-lg">{formatPrice(bundle.price)}</span>
          <span className="text-xs text-muted line-through">{formatPrice(bundle.original)}</span>
        </div>
      </div>
    </Link>
  );
}
