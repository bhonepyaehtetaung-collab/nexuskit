"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useT } from "@/lib/i18n";

type Provider = "google" | "facebook" | "apple";

const PROVIDERS: { id: Provider; name: string; className: string; icon: React.ReactNode }[] = [
  {
    id: "google",
    name: "Google",
    className: "bg-white text-[#1f1f1f] hover:bg-white/90",
    icon: (
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
    ),
  },
  {
    id: "facebook",
    name: "Facebook",
    className: "bg-[#1877F2] text-white hover:bg-[#1877F2]/90",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v2.9h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" />
      </svg>
    ),
  },
  {
    id: "apple",
    name: "Apple",
    className: "bg-black text-white hover:bg-black/80 border border-white/20",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.4 12.6c0-2.5 2-3.7 2.1-3.8-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.7.9-.8 0-2-.9-3.2-.9-1.7 0-3.2 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.1-1.2 2.9-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.4-.9-2.3-3.6zM14 5.3c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z" />
      </svg>
    ),
  },
];

/** Which social logins are switched on in Supabase (Authentication → Providers). */
let enabledCache: Promise<Provider[]> | null = null;
function enabledProviders(): Promise<Provider[]> {
  if (!enabledCache) {
    enabledCache = fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
    })
      .then((r) => r.json())
      .then((s) => PROVIDERS.map((p) => p.id).filter((id) => s?.external?.[id] === true))
      .catch(() => {
        enabledCache = null;
        return [];
      });
  }
  return enabledCache;
}

/**
 * "Continue with Google / Facebook / Apple" buttons. Only providers turned on in
 * Supabase are shown, so nothing appears until you enable one.
 */
export default function SocialLogin({ next = "/my-account", divider = true }: { next?: string; divider?: boolean }) {
  const { t } = useT();
  const [enabled, setEnabled] = useState<Provider[]>([]);
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    enabledProviders().then((list) => alive && setEnabled(list));
    return () => {
      alive = false;
    };
  }, []);

  if (enabled.length === 0) return null;

  const signIn = async (provider: Provider) => {
    setBusy(provider);
    setError("");
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${next}` },
    });
    if (error) {
      setBusy(null);
      setError(error.message);
    }
  };

  return (
    <div className="space-y-3">
      {PROVIDERS.filter((p) => enabled.includes(p.id)).map((p) => (
        <button key={p.id} type="button" disabled={!!busy} onClick={() => signIn(p.id)} className={`btn btn-lg w-full gap-3 ${p.className}`}>
          {p.icon}
          <span className="my">{busy === p.id ? t("acc.redirecting") : t("acc.withProvider", { p: p.name })}</span>
        </button>
      ))}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {divider && (
        <div className="flex items-center gap-3 py-1 text-xs text-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          <span className="my">{t("acc.orEmail")}</span>
          <span className="h-px flex-1 bg-line" />
        </div>
      )}
    </div>
  );
}
