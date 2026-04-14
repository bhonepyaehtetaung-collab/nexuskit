import type { Metadata, Viewport } from "next";
// 🔴 အောက်က စာကြောင်းလေးက CSS ကို အသက်သွင်းပေးမယ့် အရေးကြီးဆုံး စာကြောင်းပါ 🔴
import "./globals.css"; 
import { CartProvider } from "./context/cartContext";
import ConditionalUI from "./components/ConditionalUI";

export const metadata: Metadata = {
  title: "NexusKit",
  description: "Premium Digital Assets & UI Kits",
  manifest: "/manifest.json", // 👈 PWA App အတွက် မပါမဖြစ်
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NexusKit",
  },
  icons: {
    icon: "/icon.png",   // 👈 Browser Tab (Favicon) အတွက်
    apple: "/icon.png",  // 👈 iPhone/iPad တွေမှာ Add to Home Screen လုပ်ရင် ပေါ်ဖို့
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-white antialiased min-h-screen flex flex-col">
        <CartProvider>
          <ConditionalUI>
            {children}
          </ConditionalUI>
        </CartProvider>
      </body>
    </html>
  );
}