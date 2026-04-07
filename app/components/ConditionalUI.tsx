"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { ReactNode } from "react";

export default function ConditionalUI({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // URL သည် /admin ဖြင့် စတင်နေပါက (Admin Dashboard သို့မဟုတ် Login Page ဖြစ်ပါက)
  // Navbar နှင့် Footer ကို မပြဘဲ အတွင်းက Content (children) ကိုသာ ပြမည်။
  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  // Admin URL မဟုတ်ပါက (သာမန် Customer View ဖြစ်ပါက) Navbar နှင့် Footer ကို ပြမည်။
  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </>
  );
}