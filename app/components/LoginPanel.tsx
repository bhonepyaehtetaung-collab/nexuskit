"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useT } from "@/lib/i18n";
import SocialLogin from "./SocialLogin";
import { MailIcon } from "./icons";

/**
 * Sign in with Google (and other enabled providers) or an email link.
 * `next` is where the email link brings the customer back to.
 */
export default function LoginPanel({ next, title, sub }: { next: string; title: string; sub?: string }) {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const send = async () => {
    setSending(true);
    setError("");
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}${next}` },
    });
    setSending(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSentTo(email.trim());
    setCooldown(60);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="my font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {sub && <p className="my text-sm text-muted">{sub}</p>}
      </div>

      {sentTo ? (
        <div className="space-y-4">
          <div className="flex gap-3 rounded-xl border border-mint/30 bg-mint/5 p-4">
            <MailIcon size={20} className="mt-0.5 flex-shrink-0 text-mint" />
            <p className="my text-sm">{t("acc.sent", { email: sentTo })}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setSentTo("")}>{t("acc.other")}</button>
            <button type="button" className="btn-quiet flex-1" disabled={cooldown > 0 || sending} onClick={send}>
              {cooldown > 0 ? t("acc.resendIn", { s: cooldown }) : t("acc.resend")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <SocialLogin next={next} />
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="label">{t("co.email")}</label>
              <input id="login-email" required type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" placeholder="you@gmail.com" />
            </div>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <button disabled={sending} type="submit" className="btn-primary btn-lg w-full">
              {sending ? t("acc.sending") : t("acc.sendLink")}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
