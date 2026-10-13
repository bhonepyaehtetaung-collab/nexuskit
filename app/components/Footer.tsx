"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Logo } from "./Navbar";
import { MailIcon, PhoneIcon, PinIcon } from "./icons";
import { useT } from "@/lib/i18n";

/** Only allow http(s) links from settings (blocks javascript: URLs). */
const safeUrl = (url: unknown) => (typeof url === "string" && /^https?:\/\//i.test(url) ? url : null);

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

  const socials = [
    { name: "Facebook", url: safeUrl(settings.facebook_url) },
    { name: "Telegram", url: safeUrl(settings.telegram_url) },
    { name: "Instagram", url: safeUrl(settings.instagram_url) },
  ].filter((s) => s.url);

  return (
    <footer className="mt-auto border-t border-line pb-24 pt-12 md:pb-10">
      <div className="container-page grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm space-y-4">
          <Logo />
          <p className="my text-sm leading-relaxed text-muted">
            {settings.footer_description || t("footer.about")}
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="mb-3 text-sm font-semibold">{t("footer.store")}</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/" className="hover:text-text">{t("nav.store")}</Link></li>
            <li><Link href="/hub" className="hover:text-text">{t("nav.hub")}</Link></li>
            <li><Link href="/jobs" className="hover:text-text">{t("nav.jobs")}</Link></li>
            <li><Link href="/my-account" className="hover:text-text">{t("nav.myAccount")}</Link></li>
            <li><Link href="/my-account#help" className="hover:text-text">{t("help.title")}</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="mb-3 text-sm font-semibold">{t("footer.contact")}</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li className="flex items-center gap-2"><PinIcon size={16} />{settings.location || "Yangon, Myanmar"}</li>
            {settings.contact_email && (
              <li><a href={`mailto:${settings.contact_email}`} className="flex items-center gap-2 hover:text-text"><MailIcon size={16} />{settings.contact_email}</a></li>
            )}
            {settings.contact_phone && (
              <li><a href={`tel:${String(settings.contact_phone).replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-text"><PhoneIcon size={16} />{settings.contact_phone}</a></li>
            )}
          </ul>
          {socials.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {socials.map((s) => (
                <a key={s.name} href={s.url!} target="_blank" rel="noopener noreferrer" className="chip py-1.5">
                  {s.name}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="container-page mt-10 border-t border-line pt-6 text-xs text-muted">
        {settings.footer_text || `© ${new Date().getFullYear()} NexusKit. All rights reserved.`}
      </div>
    </footer>
  );
}
