"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LangToggle, useT, type TKey } from "@/lib/i18n";
import { Logo } from "../components/Navbar";
import {
  BagIcon, BriefcaseIcon, CogIcon, GridIcon, HomeIcon, LayersIcon, LogoutIcon, MenuIcon, NewsIcon, ShieldIcon, SparkIcon, TagIcon, UserIcon,
} from "../components/icons";
import ContentManager from "./ContentManager";
import { orderStage, useAdminData, type Role } from "./data";
import { Customers, Promos, Team } from "./sections/People";
import Orders from "./sections/Orders";
import Products from "./sections/Products";
import Settings from "./sections/Settings";
import AiDrafts from "./sections/AiDrafts";
import Today from "./sections/Today";
import { AdminUiProvider, Sheet, useAdminUi } from "./ui";

type Tab = "today" | "ai" | "orders" | "products" | "customers" | "promos" | "hub" | "bundles" | "jobs" | "team" | "settings";

const TABS: { id: Tab; label: TKey; Icon: ComponentType<{ size?: number }>; min: Role }[] = [
  { id: "today", label: "ad.today", Icon: HomeIcon, min: "manager" },
  { id: "orders", label: "ad.orders", Icon: BagIcon, min: "editor" },
  { id: "ai", label: "ad.ai", Icon: SparkIcon, min: "editor" },
  { id: "products", label: "ad.products", Icon: GridIcon, min: "editor" },
  { id: "customers", label: "ad.customers", Icon: UserIcon, min: "editor" },
  { id: "promos", label: "ad.promos", Icon: TagIcon, min: "editor" },
  { id: "bundles", label: "ad.bundles", Icon: LayersIcon, min: "editor" },
  { id: "hub", label: "ad.hub", Icon: NewsIcon, min: "editor" },
  { id: "jobs", label: "ad.jobs", Icon: BriefcaseIcon, min: "editor" },
  { id: "team", label: "ad.team", Icon: ShieldIcon, min: "super_admin" },
  { id: "settings", label: "ad.settings", Icon: CogIcon, min: "super_admin" },
];

const RANK: Record<Role, number> = { editor: 1, manager: 2, super_admin: 3 };

export default function AdminPage() {
  return (
    <AdminUiProvider>
      <AdminShell />
    </AdminUiProvider>
  );
}

function AdminShell() {
  const { t } = useT();
  const { toast } = useAdminUi();
  const router = useRouter();

  const onRealtime = useCallback(
    (kind: "insert" | "slip", order: any) => {
      const name = order?.customer_name || order?.customer_email || "";
      toast(kind === "insert" ? t("ad.newOrder", { name }) : t("ad.newSlip", { name }), "info");
    },
    [t, toast],
  );
  const data = useAdminData(onRealtime);

  const [me, setMe] = useState<{ email: string; role: Role } | null>(null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [tab, setTab] = useState<Tab>("orders");
  const [filter, setFilter] = useState<string | undefined>();
  const [moreOpen, setMoreOpen] = useState(false);

  // Who is signed in, and what may they do? (The same check RLS uses.)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: auth, error: authError } = await data.supabase.auth.getUser();
        // Network trouble is not the same as "not signed in": offer a retry instead of logging out.
        if (authError && /fetch|network|timeout/i.test(authError.message)) throw authError;
        const res = auth.user ? await data.supabase.rpc("staff_role") : { data: null, error: null };
        if (res.error && /fetch|network|timeout/i.test(res.error.message)) throw res.error;
        const role = res.data;
        if (!alive) return;
        if (!auth.user || (role !== "editor" && role !== "manager" && role !== "super_admin")) {
          router.replace("/admin/login");
          return;
        }
        setMe({ email: auth.user.email || "", role });
        setTab(RANK[role as Role] >= RANK.manager ? "today" : "orders");
        await data.reloadAll();
        if (alive) setReady(true);
      } catch (err) {
        console.error("Admin load failed", err);
        if (alive) setOffline(true);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs = useMemo(() => (me ? TABS.filter((x) => RANK[me.role] >= RANK[x.min]) : []), [me]);
  const actionCount = data.orders.filter((o) => { const s = orderStage(o); return s === "verify" || s === "setup"; }).length;
  const badge = (id: Tab) => (id === "orders" ? actionCount : id === "jobs" ? data.pendingJobs : id === "ai" ? data.aiPending : 0);

  const go = (next: string, f?: string) => {
    if (!tabs.some((x) => x.id === next)) return;
    setFilter(f);
    setTab(next as Tab);
    setMoreOpen(false);
    window.scrollTo({ top: 0 });
  };

  const logout = async () => {
    await data.supabase.auth.signOut();
    router.replace("/admin/login");
  };

  if (!ready || !me) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink">
        <div className="flex flex-col items-center gap-3 text-muted">
          {offline ? (
            <>
              <p className="my max-w-xs text-center text-sm">{t("ad.offline")}</p>
              <button type="button" className="btn-primary" onClick={() => window.location.reload()}>{t("ad.retry")}</button>
            </>
          ) : (
            <>
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
              <p className="my text-sm">{t("ad.loading")}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Mobile bar: the three most-used + "More".
  const primary = (tabs.some((x) => x.id === "today") ? ["today", "orders", "ai"] : ["orders", "ai", "products"]) as Tab[];
  const rest = tabs.filter((x) => !primary.includes(x.id));
  const restBadge = rest.reduce((n, x) => n + badge(x.id), 0);
  const roleLabel = t(`ad.role.${me.role}` as TKey);

  return (
    <div className="min-h-screen bg-ink text-text lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col border-r border-line bg-surface p-4 lg:flex">
        <div className="flex items-center justify-between px-2">
          <Logo />
          <span className="badge bg-brand/15 text-[11px] text-brand">{roleLabel}</span>
        </div>
        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto" aria-label="Admin">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${tab === id ? "bg-brand/15 font-semibold text-brand" : "text-muted hover:bg-raised hover:text-text"}`}
            >
              <Icon size={18} />
              <span className="my flex-1 text-left">{t(label)}</span>
              {badge(id) > 0 && <span className="badge bg-pass text-[11px] text-ink">{badge(id)}</span>}
            </button>
          ))}
        </nav>
        <div className="space-y-2 border-t border-line pt-4">
          <p className="truncate px-3 text-xs text-muted">{me.email}</p>
          <div className="flex items-center gap-2 px-1">
            <LangToggle />
            <Link href="/" className="btn-quiet flex-1 px-3 py-2 text-xs">{t("ad.viewStore")}</Link>
          </div>
          <button type="button" onClick={logout} className="btn-quiet w-full justify-start px-3 py-2 text-sm text-danger">
            <LogoutIcon size={16} /> {t("ad.logout")}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          <span className="badge bg-brand/15 text-[11px] text-brand">{roleLabel}</span>
          <LangToggle />
        </div>
      </header>

      <main className="min-w-0 flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-10 lg:py-8">
        <div key={tab} className="mx-auto max-w-6xl animate-fade-in">
          {tab === "today" && <Today data={data} go={go} />}
          {tab === "orders" && <Orders data={data} initialFilter={filter} />}
          {tab === "products" && <Products data={data} />}
          {tab === "ai" && <AiDrafts data={data} role={me.role} onChange={() => { data.reload.ai(); data.reload.jobs(); }} />}
          {tab === "customers" && <Customers data={data} initialFilter={filter} />}
          {tab === "promos" && <Promos data={data} />}
          {(tab === "hub" || tab === "bundles" || tab === "jobs") && (
            <ContentManager section={tab} products={data.products} />
          )}
          {tab === "team" && <Team data={data} me={me.email} />}
          {tab === "settings" && <Settings data={data} />}
        </div>
      </main>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Admin">
        <ul className="grid h-[4.25rem] grid-cols-4">
          {primary.map((id) => {
            const item = tabs.find((x) => x.id === id);
            if (!item) return <li key={id} />;
            const { Icon } = item;
            return (
              <li key={id}>
                <button type="button" onClick={() => go(id)} aria-current={tab === id ? "page" : undefined} className={`relative flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] ${tab === id ? "text-brand" : "text-muted"}`}>
                  <Icon size={22} />
                  <span className="my">{t(item.label)}</span>
                  {badge(id) > 0 && <span className="absolute left-1/2 top-1.5 ml-2 min-w-5 rounded-full bg-pass px-1.5 text-center text-[10px] font-bold leading-5 text-ink">{badge(id)}</span>}
                </button>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setMoreOpen(true)} aria-current={rest.some((x) => x.id === tab) ? "page" : undefined} className={`relative flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] ${rest.some((x) => x.id === tab) ? "text-brand" : "text-muted"}`}>
              <MenuIcon size={22} />
              <span className="my">{t("ad.more")}</span>
              {restBadge > 0 && <span className="absolute left-1/2 top-1.5 ml-2 min-w-5 rounded-full bg-pass px-1.5 text-center text-[10px] font-bold leading-5 text-ink">{restBadge}</span>}
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title={t("ad.more")}>
        <ul className="grid grid-cols-3 gap-2">
          {rest.map(({ id, label, Icon }) => (
            <li key={id}>
              <button type="button" onClick={() => go(id)} className={`relative flex w-full flex-col items-center gap-2 rounded-2xl border p-4 text-xs ${tab === id ? "border-brand bg-brand/10 text-brand" : "border-line bg-raised"}`}>
                <Icon size={22} />
                <span className="my">{t(label)}</span>
                {badge(id) > 0 && <span className="absolute right-2 top-2 rounded-full bg-pass px-1.5 text-[10px] font-bold leading-5 text-ink">{badge(id)}</span>}
              </button>
            </li>
          ))}
        </ul>
        <div className="space-y-2 border-t border-line pt-4">
          <p className="truncate text-xs text-muted">{me.email}</p>
          <Link href="/" className="btn-ghost w-full">{t("ad.viewStore")}</Link>
          <button type="button" onClick={logout} className="btn-quiet w-full text-danger"><LogoutIcon size={16} /> {t("ad.logout")}</button>
        </div>
      </Sheet>
    </div>
  );
}
