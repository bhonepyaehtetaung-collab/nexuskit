"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useT } from "@/lib/i18n";
import { CheckIcon } from "../components/icons";

function SuccessContent() {
  const params = useSearchParams();
  const { t } = useT();
  const isPayLater = params.get("type") === "pay-later";
  const orderCode = (params.get("order") || "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 12);

  const steps = isPayLater ? [t("ok.s1"), t("ok.l2"), t("ok.l3")] : [t("ok.s1"), t("ok.s2"), t("ok.s3")];

  return (
    <div className="pass w-full max-w-md animate-slide-up">
      <div className="space-y-4 p-6 text-center sm:p-8">
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${isPayLater ? "bg-mint/15 text-mint" : "bg-brand/15 text-brand"}`}>
          <CheckIcon size={32} />
        </div>
        <h1 className="my font-display text-2xl font-bold sm:text-3xl">{isPayLater ? t("ok.setup") : t("ok.placed")}</h1>
        {orderCode && (
          <p className="text-sm text-muted">
            {t("ok.order")} <span className="font-semibold text-text">#{orderCode}</span>
          </p>
        )}
      </div>

      <div className="pass-tear" />

      <ol className="space-y-4 p-6 sm:p-8">
        {steps.map((text, i) => (
          <li key={i} className="flex gap-3">
            <span className={`grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-xs font-bold ${i === 0 ? "bg-mint text-night" : "bg-raised text-muted"}`}>
              {i === 0 ? <CheckIcon size={14} /> : i + 1}
            </span>
            <span className={`my text-sm ${i === 0 ? "text-text" : "text-muted"}`}>{text}</span>
          </li>
        ))}
      </ol>

      <div className="grid gap-3 px-6 pb-6 sm:px-8 sm:pb-8">
        <Link href="/my-account" className="btn-primary btn-lg">{t("ok.goAccount")}</Link>
        <Link href="/" className="btn-quiet">{t("ok.keep")}</Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="container-page flex flex-1 items-center justify-center py-12">
      <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-pass bg-surface" />}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
