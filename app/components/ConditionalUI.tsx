"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import Navbar, { MobileTabBar } from "./Navbar";
import Footer from "./Footer";
import CartDrawer, { Toaster } from "./CartDrawer";
import SupportButton from "./SupportButton";
import { useT } from "@/lib/i18n";

/** Store pages get the header, footer, cart and tab bar; /admin gets none. */
export default function ConditionalUI({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const { t } = useT();

  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  const isCheckout = pathname.startsWith("/checkout");

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-brand-strong focus:px-4 focus:py-2 focus:text-white">
        {t("nav.skip")}
      </a>
      <Navbar />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      {!isCheckout && <Footer />}
      {!isCheckout && <MobileTabBar />}
      {!isCheckout && !pathname.startsWith("/products/") && !pathname.startsWith("/bundles/") && <SupportButton />}
      <CartDrawer />
      <Toaster />
    </>
  );
}
