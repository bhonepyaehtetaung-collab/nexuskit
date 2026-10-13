"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Logo } from "./Navbar";
import { MailIcon } from "./icons";
import { useT } from "@/lib/i18n";

/** Only allow http(s) links from settings (blocks javascript: URLs). */
const safeUrl = (url: unknown) => (typeof url === "string" && /^https?:\/\//i.test(url) ? url : null);

function TelegramIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.5 4.3 18.4 19c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.2.2-.5.4-.9.4l.3-4.7 8.6-7.8c.4-.3-.1-.5-.6-.2L6.7 12.9 2.2 11.5c-1-.3-1-1 .2-1.5L20.2 3.2c.8-.3 1.6.2 1.3 1.1Z" />
    </svg>
  );
}

export default function Footer() {
  const [settings, setSettings] = useState<any>({});
  const { t } = useT();

  useEffect(() => {
    createClient()
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => data && setSettings(data));
  }, []);

  const email = typeof settings.contact_email === "string" && /^[^@\s]+@[^@\s]+$/.test(settings.contact_email) ? settings.contact_email : null;
  const telegram = safeUrl(settings.telegram_url);
  const telegramName = telegram ? "@" + telegram.replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me)\//i, "").replace(/\/.*$/, "") : null;

  return (
    <footer className="mt-auto border-t border-line pb-24 pt-12 md:pb-10">
      <div className="container-page grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm space-y-4">
          <Logo />
          <p className="my text-sm leading-relaxed text-muted">{t("footer.about")}</p>
        </div>

        <nav aria-label="Footer">
          <h2 className="my mb-3 text-sm font-semibold">{t("footer.store")}</h2>
          <ul className="my space-y-2 text-sm text-muted">
            <li><Link href="/hub" className="hover:text-text">{t("nav.hub")}</Link></li>
            <li><Link href="/jobs" className="hover:text-text">{t("nav.jobs")}</Link></li>
            <li><Link href="/my-account" className="hover:text-text">{t("nav.myAccount")}</Link></li>
            <li><Link href="/my-account#help" className="hover:text-text">{t("help.title")}</Link></li>
          </ul>
        </nav>

        {(telegram || email) && (
          <div>
            <h2 className="my mb-3 text-sm font-semibold">{t("footer.contact")}</h2>
            <ul className="space-y-2 text-sm text-muted">
              {telegram && (
                <li>
                  <a href={telegram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-text">
                    <TelegramIcon /> {telegramName && telegramName.length > 1 ? telegramName : "Telegram"}
                  </a>
                </li>
              )}
              {email && (
                <li><a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-text"><MailIcon size={16} />{email}</a></li>
              )}
            </ul>
          </div>
        )}
      </div>
      <div className="container-page my mt-10 border-t border-line pt-6 text-xs text-muted">
        {t("footer.copyright", { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
