"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { LockIcon, MailIcon } from "@/app/components/icons";
import SocialLogin from "@/app/components/SocialLogin";

function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const notStaff = params.get("error") === "not-staff";

  const [mode, setMode] = useState<"password" | "link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(notStaff ? "This account doesn’t have admin access. Ask the store owner to add your email to the team." : "");
  const [sent, setSent] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // Coming back from an email link: once the session is ready, go to /admin
  // (the proxy then checks the team role).
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session && !notStaff) {
        router.replace("/admin");
        router.refresh();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [supabase, router, notStaff]);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      // Same message for wrong email or wrong password (don't reveal which).
      setError("Email or password is incorrect.");
      setLoading(false);
      return;
    }
    // The proxy checks the team role; non-staff are sent back here.
    router.replace("/admin");
    router.refresh();
  };

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/admin/login` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-strong text-white">
          <LockIcon size={22} />
        </span>
        <h1 className="font-display text-2xl font-bold">NexusKit admin</h1>
        <p className="text-sm text-muted">Team members only</p>
      </div>

      <div className="panel space-y-5 p-6">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-raised p-1 text-sm" role="tablist">
          {(["password", "link"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => { setMode(m); setSent(false); }}
              className={`rounded-lg py-2 font-medium transition-colors ${mode === m ? "bg-surface text-text" : "text-muted hover:text-text"}`}
            >
              {m === "password" ? "Password" : "Email link"}
            </button>
          ))}
        </div>

        {error && <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger" role="alert">{error}</p>}

        <SocialLogin next="/admin/login" divider={false} />

        {mode === "link" && sent ? (
          <div className="flex gap-3 rounded-xl border border-mint/30 bg-mint/5 p-4 text-sm">
            <MailIcon size={18} className="mt-0.5 flex-shrink-0 text-mint" />
            <p>Check <span className="font-semibold">{email}</span> for a sign-in link.</p>
          </div>
        ) : (
          <form onSubmit={mode === "password" ? handlePassword : handleLink} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="label">Email</label>
              <input id="admin-email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
            </div>
            {mode === "password" && (
              <div>
                <label htmlFor="admin-password" className="label">Password</label>
                <input id="admin-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="field" />
              </div>
            )}
            <button disabled={loading} type="submit" className="btn-primary btn-lg w-full">
              {loading ? "Signing in…" : mode === "password" ? "Sign in" : "Email me a link"}
            </button>
            {mode === "link" && <p className="hint text-center">New team members sign in this way the first time.</p>}
          </form>
        )}
      </div>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-12">
      <Suspense fallback={null}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
