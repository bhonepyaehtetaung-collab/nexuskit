"use client";

import { useCatalog } from "@/lib/catalog";
import { useT } from "@/lib/i18n";

/** Floating "Chat on Telegram" button, shown when a Telegram link is set in admin settings. */
export default function SupportButton() {
  const { data } = useCatalog();
  const { t } = useT();
  const url = data?.settings?.telegram_url;
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-12 items-center gap-2 rounded-full bg-[#2AABEE] pl-3 pr-3 text-sm font-semibold text-white shadow-xl shadow-black/40 transition-[padding] md:bottom-6 md:right-6 md:pr-4"
      aria-label={t("support.chat")}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21.5 4.3 18.4 19c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.2.2-.5.4-.9.4l.3-4.7 8.6-7.8c.4-.3-.1-.5-.6-.2L6.7 12.9 2.2 11.5c-1-.3-1-1 .2-1.5L20.2 3.2c.8-.3 1.6.2 1.3 1.1Z" />
      </svg>
      <span className="hidden md:inline">{t("support.chat")}</span>
    </a>
  );
}
