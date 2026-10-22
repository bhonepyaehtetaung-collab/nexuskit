"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/app/context/cartContext";
import { LangToggle, useT, type TKey } from "@/lib/i18n";
import ThemeToggle from "./ThemeToggle";
import SearchOverlay from "./SearchOverlay";
import { BagIcon, BriefcaseIcon, HomeIcon, NewsIcon, SearchIcon, UserIcon } from "./icons";

const isActive = (pathname: string, path: string) => (path === "/" ? pathname === "/" : pathname.startsWith(path));

export function Logo() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2" aria-label="NexusKit">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-strong text-white transition-transform group-hover:-rotate-6">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 19V5l14 14V5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="font-display text-lg font-bold tracking-tight">NexusKit</span>
    </Link>
  );
}

function CartCount({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      key={count}
      className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 animate-bump place-items-center rounded-full bg-pass px-1 text-[11px] font-bold text-night"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

const desktopLinks: { key: TKey; path: string }[] = [
  { key: "nav.store", path: "/" },
  { key: "nav.hub", path: "/hub" },
  { key: "nav.jobs", path: "/jobs" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { t } = useT();
  const { itemCount, setDrawerOpen, hydrated } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    // "/" opens search on desktop
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] transition-colors ${
          scrolled ? "border-line bg-ink/85 backdrop-blur-xl" : "border-transparent bg-ink"
        }`}
      >
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Logo />

          {/* Desktop: search field look-alike */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden h-11 flex-1 items-center gap-3 rounded-2xl border border-line bg-surface px-4 text-sm text-muted transition-colors hover:border-muted/50 md:flex md:max-w-md"
          >
            <SearchIcon size={18} />
            <span className="flex-1 text-left">{t("search.placeholder")}</span>
            <kbd className="rounded-md border border-line px-1.5 text-xs">/</kbd>
          </button>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {desktopLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                aria-current={isActive(pathname, link.path) ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(pathname, link.path) ? "text-text" : "text-muted hover:text-text"
                }`}
              >
                {t(link.key)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-xl bg-raised text-text hover:bg-line md:hidden"
              aria-label={t("nav.search")}
            >
              <SearchIcon size={20} />
            </button>
            <ThemeToggle className="h-10" />
            <LangToggle className="h-10" />
            <Link href="/my-account" className="btn-quiet hidden h-10 px-3 md:inline-flex" aria-label={t("nav.myAccount")}>
              <UserIcon size={18} />
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="relative grid h-10 w-10 place-items-center rounded-xl bg-raised text-text transition-colors hover:bg-line"
              aria-label={`${t("nav.cart")} (${itemCount})`}
            >
              <BagIcon size={20} />
              {hydrated && <CartCount count={itemCount} />}
            </button>
          </div>
        </div>
      </header>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

/** App-style bottom navigation for phones (and the installed PWA). */
export function MobileTabBar() {
  const pathname = usePathname();
  const { t } = useT();
  const tabs: { key: TKey; path: string; Icon: typeof HomeIcon; count?: number }[] = [
    { key: "nav.store" as TKey, path: "/", Icon: HomeIcon },
    { key: "nav.hub" as TKey, path: "/hub", Icon: NewsIcon },
    { key: "nav.jobs" as TKey, path: "/jobs", Icon: BriefcaseIcon },
    { key: "nav.account" as TKey, path: "/my-account", Icon: UserIcon },
  ];

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="grid grid-cols-4">
        {tabs.map(({ key, path, Icon, count }) => {
          const active = isActive(pathname, path);
          return (
            <li key={path}>
              <Link
                href={path}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${active ? "text-text" : "text-muted"}`}
              >
                <span className={`relative grid h-8 w-12 place-items-center rounded-full transition-colors ${active ? "bg-brand/20 text-brand" : ""}`}>
                  <Icon size={20} />
                </span>
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
