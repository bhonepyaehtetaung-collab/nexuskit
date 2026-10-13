import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, Noto_Sans_Myanmar } from "next/font/google";
import "./globals.css";
import { CartProvider } from "./context/cartContext";
import { LangProvider } from "@/lib/i18n";
import { getLang, getTextOverrides } from "@/lib/server-lang";
import ConditionalUI from "./components/ConditionalUI";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Figtree({ subsets: ["latin"], variable: "--font-body", display: "swap" });
// Burmese text falls back to this font (listed after the Latin fonts).
const myanmar = Noto_Sans_Myanmar({ subsets: ["myanmar"], variable: "--font-myanmar", display: "swap", preload: false });

export const metadata: Metadata = {
  title: { default: "NexusKit", template: "%s · NexusKit" },
  description: "Game top-ups, premium apps and digital products — pay with KBZPay or Wave.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NexusKit",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D1120",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Burmese by default; the language switch stores the choice in a cookie.
  const [lang, overrides] = await Promise.all([getLang(), getTextOverrides()]);
  return (
    <html lang={lang} className={`${display.variable} ${body.variable} ${myanmar.variable}`}>
      <body className="flex min-h-screen flex-col bg-ink text-text antialiased">
        <LangProvider initialLang={lang} overrides={overrides}>
          <CartProvider>
            <ConditionalUI>{children}</ConditionalUI>
          </CartProvider>
        </LangProvider>
      </body>
    </html>
  );
}
